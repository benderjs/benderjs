/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages jobs
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'fs' ),
	ncp = require( 'ncp' ).ncp,
	rimraf = require( 'rimraf' ),
	when = require( 'when' ),
	whenNode = require( 'when/node' ),
	mkdir = whenNode.lift( fs.mkdir ),
	whenCall = whenNode.call,
	Datastore = require( 'nedb' ),
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'jobs', true ),

	cwd = process.cwd(),
	jobsDir = path.join( cwd, '/.bender/jobs/' );

/**
 * @module jobs
 */
module.exports = {

	name: 'jobs',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			jobs = bender.jobs = {},
			jobsDb,
			tasksDb,
			browserTasksDb,
			jobAppsDb;


		bender.checkDeps( module.exports.name, 'conf', 'tests', 'applications', 'utils' );

		jobsDb = new Datastore( {
			filename: path.join( cwd, '/.bender/jobs.db' ),
			autoload: true
		} );
		_.bindAll( jobsDb );

		tasksDb = new Datastore( {
			filename: path.join( cwd, '/.bender/tasks.db' ),
			autoload: true
		} );
		_.bindAll( tasksDb );

		browserTasksDb = new Datastore( {
			filename: path.join( cwd, '/.bender/browser_tasks.db' ),
			autoload: true
		} );
		_.bindAll( browserTasksDb );

		jobAppsDb = new Datastore( {
			filename: path.join( cwd, '/.bender/job_apps.db' ),
			autoload: true
		} );
		_.bindAll( jobAppsDb );

		// yeah, that probably could be async...
		/* istanbul ignore else */
		if ( !fs.existsSync( jobsDir ) ) {
			try {
				fs.mkdirSync( jobsDir );
			} catch ( e ) {
				/* istanbul ignore else */
				if ( e.code === 'ENOENT' ) {
					logger.error(
						'Oops, it seems that you forgot to initialize Bender in this directory.\n' +
						'Run "bender init" and try again.'
					);
				}

				process.exit( 1 );
			}
		}

		jobs.STATUS = {
			WAITING: 0,
			PENDING: 1,
			PASSED: 2,
			FAILED: 3,
			IGNORED: 4
		};

		// convert a string to a browser object
		function prepareBrowser( browser ) {
			var match = /^([a-z]+)(\d*)/i.exec( browser );

			if ( !match ) {
				return {
					name: browser,
					version: 0
				};
			}

			return {
				name: match[ 1 ].toLowerCase(),
				version: match[ 2 ] || 0
			};
		}

		/**
		 * Create new job
		 * @param  {Object} data               Job properties
		 * @param  {Array}  data.tests         Job tests
		 * @param  {Array}  data.browsers      Job browsers
		 * @param  {String} [data.description] Job description
		 * @return {Promise}
		 * @memberOf jobs
		 */
		jobs.create = function( data ) {
			var job = {
					browsers: data.browsers.map( function( browser ) {
						return browser.toLowerCase();
					} ),
					description: data.description,
					created: +new Date(),
					filter: data.filter
				},
				dir,
				id;

			// prepare job directory structure
			function prepareDir( job ) {
				id = job._id;
				dir = path.join( jobsDir, id );

				return mkdir( dir )
					.then( function() {
						return mkdir( path.join( dir, 'tests' ) );
					} )
					.then( function() {
						return mkdir( path.join( dir, 'apps' ) );
					} );
			}

			// prepare task object
			function prepareTask( task ) {
				task = _.cloneDeep( task );

				delete task._id;
				delete task.tags;

				task.jobId = id;

				return task;
			}

			// add tasks to the database
			function insertTasks( tests ) {
				return whenCall( tasksDb.insert, tests.map( prepareTask ) );
			}

			// copy tests and create tasks for them
			function fillTasksDb() {
				return bender.tests
					.list()
					.then( function( tests ) {
						var testsObj = {},
							filtered = [];

						tests.forEach( function( test ) {
							testsObj[ test.id ] = test;
						} );

						data.tests.forEach( function( id ) {
							/* istanbul ignore else */
							if ( testsObj[ id ] ) {
								filtered.push( testsObj[ id ] );
							}
						} );

						return filtered;
					} )
					.then( insertTasks );
			}

			// add browser tasks to the database
			function fillBrowserTasksDb( tasks ) {
				var pattern = /^([a-z]+)(\d*)/i;

				// add browser tasks for given task
				function insertTaskBrowsers( task ) {
					var browsers = data.browsers.map( function( browser ) {
						browser = prepareBrowser( browser );

						return {
							name: browser.name,
							version: browser.version,
							taskId: task._id,
							taskName: task.id,
							jobId: id,
							status: jobs.STATUS.WAITING,
							retries: 0,
							created: +new Date()
						};
					} );

					return whenCall(
						browserTasksDb.insert,
						browsers
					);
				}

				return when
					.map( tasks, insertTaskBrowsers )
					.then( function() {
						return tasks;
					} );
			}

			// take a snapshot of current tests state
			function copyTests( tasks ) {
				var dest = path.join( jobsDir, id, 'tests' ),
					paths = tasks
					.reduce( function( result, current ) {
						var dir = bender.conf.tests[ current.group ].basePath;

						if ( result.indexOf( dir ) === -1 ) {
							result.push( dir );
						}

						return result;
					}, [] );

				return when
					.map( paths, function( dir ) {
						var to = path.join( dest, path.relative( cwd, dir ) );

						return whenCall( bender.utils.mkdirp, to )
							.then( function() {
								return whenCall( ncp, dir, to, {
									dereference: true
								} );
							} );
					} )
					.then( function() {
						return tasks;
					} );
			}

			// take a snapshot of applications required by selected tests
			function copyApps( tasks ) {
				var apps = [];

				// copy application with given name
				function copyApp( name ) {
					var app = bender.applications.findOne( 'name', name ),
						dest = path.join( jobsDir, id, '/apps/' + app.url );

					// add application details to the database
					function addToDb() {
						return whenCall(
							jobAppsDb.insert,
							_.merge( {
								jobId: id
							}, app )
						);
					}

					return app.proxy ?
						// ignore proxied apps
						when.resolve() :
						whenCall(
							ncp,
							path.resolve( app.path ),
							dest, {
								followSymlink: true,
								filter: function( name ) {
									return name.indexOf( '.' ) !== 0 && name.indexOf( '/.' ) === -1;
								}
							}
						)
						.then( addToDb );
				}

				// build a list of applications to copy
				tasks.forEach( function( task ) {
					task.applications.forEach( function( app ) {
						if ( apps.indexOf( app ) === -1 ) {
							apps.push( app );
						}
					} );
				} );

				return when.map( apps, copyApp );
			}

			return whenCall( jobsDb.insert, job )
				.then( prepareDir )
				.then( fillTasksDb )
				.then( fillBrowserTasksDb )
				.then( copyTests )
				.then( copyApps )
				.then( function() {
					return id;
				} );
		};

		/**
		 * List all the jobs
		 * @return {Promise}
		 */
		jobs.list = function() {
			return whenCall( jobsDb.find, {} )
				.then( jobs.getResults )
				.then( function( results ) {
					return when
						.map( results, jobs.compactResults );
				} );
		};

		/**
		 * Get a job and it's results
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.get = function( id ) {
			return jobs
				.find( id )
				.then( function( job ) {
					return job ? jobs.getResults( [ job ] ) : when.resolve( [ null ] );
				} )
				.then( function( results ) {
					// convert browser ids to objects
					if ( results[ 0 ] ) {
						results[ 0 ].browsers = results[ 0 ].browsers.sort().map( prepareBrowser );
					}

					return results[ 0 ];
				} );
		};


		/**
		 * Find a job in the database
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.find = function( id ) {
			return whenCall(
					jobsDb.findOne, {
						_id: id
					} )
				.then( function( job ) {
					return job;
				} );
		};

		/**
		 * Remove a job from the database and job's snapshots
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.delete = function( id ) {
			return whenCall(
					jobsDb.remove, {
						_id: id
					}
				)
				.then( function( count ) {
					return count ? whenCall(
						tasksDb.remove, {
							jobId: id
						}, {
							multi: true
						}
					) : when.reject( 'There\'s no such job.' );
				} )
				.then( function() {
					return whenCall(
						browserTasksDb.remove, {
							jobId: id
						}, {
							multi: true
						}
					);
				} )
				.then( function() {
					return whenCall(
						jobAppsDb.remove, {
							jobId: id
						}, {
							multi: true
						}
					);
				} )
				.then( function() {
					return whenCall( rimraf, path.join( jobsDir, id ) );
				} );
		};

		/**
		 * Restart a job and reset all it's results
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.restart = function( id ) {
			return whenCall(
					browserTasksDb.update, {
						jobId: id
					}, {
						$set: {
							status: 0,
							retries: 0,
							errors: null,
							started: 0,
							duration: 0,
							total: 0,
							testedVersion: 0,
							testedUA: null
						}
					}, {
						multi: true
					}
				)
				.then( function( count ) {
					return count ?
						when.resolve() :
						when.reject( 'There are no tasks for this job or a job does not exist.' );
				} );
		};

		/**
		 * Modify a job - allows to change job's browsers and description
		 * @param  {Object} data Job data
		 * @return {Promise}
		 */
		jobs.edit = function( data ) {
			var oldJob;

			// update job properties in the database
			function updateJob() {
				return whenCall( jobsDb.update, {
					_id: data.id
				}, {
					$set: {
						browsers: data.browsers,
						description: data.description
					}
				} );
			}

			// get job's tasks
			function getTasks() {
				return whenCall( tasksDb.find, {
					jobId: data.id
				} );
			}

			// update browser tasks database
			function updateBrowserTasks( tasks ) {
				var toAdd = _.difference( data.browsers, oldJob.browsers ),
					toRemove = _.difference( oldJob.browsers, data.browsers );

				toAdd = toAdd.map( prepareBrowser );
				toRemove = toRemove.map( prepareBrowser );

				// add browser tasks for given task
				function insertTaskBrowsers( task ) {
					return whenCall(
						browserTasksDb.insert,
						toAdd.map( function( browser ) {
							return {
								name: browser.name,
								version: browser.version,
								taskId: task._id,
								jobId: data.id,
								status: jobs.STATUS.WAITING,
								retries: 0,
								created: +new Date()
							};
						} )
					);
				}

				// add new tasks to the database
				function addTasks() {
					return toAdd.length ?
						when.map( tasks, insertTaskBrowsers ) :
						when.resolve();
				}

				// remove unneeded tasks from the database
				function removeTasks() {
					if ( !toRemove.length ) {
						return when.resolve();
					}

					return whenCall( browserTasksDb.remove, {
						$and: [ {
							jobId: data.id
						}, {
							$or: toRemove
						} ]
					}, {
						multi: true
					} );
				}

				return addTasks()
					.then( removeTasks );
			}

			// convert browser objects to strings
			data.browsers = data.browsers.map( function( browser ) {
				return browser.name.toLowerCase() + ( browser.version || '' );
			} );

			// prevent from removing all the browsers
			if ( !data.browsers.length ) {
				return when.reject( 'No browsers specified.' );
			}

			return jobs
				.find( data.id )
				.then( function( job ) {
					// no such job - reject
					if ( !job ) {
						return when.reject( new Error( 'There\'s no such job.' ) );
					}

					oldJob = job;

					return updateJob()
						.then( getTasks )
						.then( updateBrowserTasks )
						.then( function() {
							return jobs.get( data.id );
						} );

				} );
		};

		/**
		 * Get task's details for a given job
		 * @param  {String} jobId  Id of a job
		 * @param  {String} taskId Id of a task
		 * @return {Promise}
		 */
		jobs.getTask = function( jobId, taskId ) {
			return whenCall( tasksDb.findOne, {
				$and: [ {
					jobId: jobId
				}, {
					id: taskId
				} ]
			} );
		};

		/**
		 * Get application's details for a given job
		 * @param  {String} jobId Id of a job
		 * @param  {String} name  Application name
		 * @return {Promise}
		 */
		jobs.getApp = function( jobId, name ) {
			return whenCall( jobAppsDb.findOne, {
				$and: [ {
					jobId: jobId
				}, {
					name: name
				} ]
			} );
		};

		/**
		 * Get results of a given job
		 * @param  {Array.<Object>} data Bender jobs array
		 * @return {Promise}
		 */
		jobs.getResults = function( data ) {
			// build given tasks
			function buildTasks( tasks ) {
				// build results for given tasks
				function buildResults( results ) {
					var resultsObj = {},
						tasksObj = {};

					results.forEach( function( result ) {
						if ( !resultsObj[ result.taskId ] ) {
							resultsObj[ result.taskId ] = [];
						}

						resultsObj[ result.taskId ].push( result );

						delete result.taskId;
						delete result.taskName;
						delete result._id;
						delete result.created;
					} );

					tasks.forEach( function( task, index ) {
						tasks[ index ] = {
							id: task.id,
							_id: task._id,
							jobId: task.jobId,
							results: resultsObj[ task._id ]
								.sort( function( prev, next ) {
									var pv = parseInt( prev.version, 10 ),
										nv = parseInt( next.version, 10 );

									return prev.name > next.name ? 1 :
										prev.name < next.name ? -1 :
										pv > nv ? 1 : pv < nv ? -1 :
										/* istanbul ignore next:no chance to happen */
										0;
								} )
						};
					} );

					tasks.forEach( function( task ) {
						if ( !tasksObj[ task.jobId ] ) {
							tasksObj[ task.jobId ] = [];
						}

						tasksObj[ task.jobId ].push( task );
					} );

					data.forEach( function( job ) {
						job.tasks = tasksObj[ job._id ]
							.sort( function( prev, next ) {
								return prev.id > next.id ? 1 :
									prev.id < next.id ? -1 :
									/* istanbul ignore next:no chance to happen */
									0;
							} );

						job.id = job._id;
						delete job._id;
					} );

					return data;
				}

				return whenCall( browserTasksDb.find, {} )
					.then( buildResults );
			}

			return whenCall( tasksDb.find, {} )
				.then( buildTasks );
		};

		/**
		 * Compact the results of a job by grouping them by browsers
		 * @param  {Object} job Bender job
		 * @return {Promise}
		 */
		jobs.compactResults = function( job ) {
			var results = {};

			// group results by browser name and version
			function groupResults( result ) {
				var browserId = result.name + '_' + result.version,
					res = results[ browserId ];

				if ( !res ) {
					results[ browserId ] = res = _.cloneDeep( result );
				} else {
					res.duration += result.duration || 0;
				}

				if ( result.status === jobs.STATUS.PENDING ||
					( result.status === jobs.STATUS.FAILED && res.status !== jobs.STATUS.PENDING ) ) {
					res.status = result.status;
				} else if ( ( result.status !== jobs.STATUS.WAITING && res.status === jobs.STATUS.WAITING ) ||
					( result.status === jobs.STATUS.WAITING && res.status !== jobs.STATUS.WAITING ) ) {
					res.status = jobs.STATUS.PENDING;
				}

				if ( result.testedVersion !== res.testedVersion ) {
					res.testedVersion = '*';
				}
			}

			job.tasks.forEach( function( task ) {
				task.results.forEach( groupResults );
			} );

			job.results = Object.keys( results )
				.sort()
				.map( function( name ) {
					var result = results[ name ];

					// remove duration from unfinished job results to reduce amount of re-renders in dashboard
					/* istanbul ignore else */
					if ( result.status !== jobs.STATUS.PASSED && result.status !== jobs.STATUS.FAILED ) {
						result.duration = 0;
					}
					return result;
				} );

			delete job.tasks;

			return job;
		};

		/**
		 * Fetch a task for a client
		 * @param {Object} client Bender client
		 */
		jobs.fetch = function( client, callback ) {
			var query, update, handler;

			// handle found task
			function handleBrowserTask( err, result ) {
				/* istanbul ignore if:not much to test here */
				if ( err ) {
					logger.error( err );
				}

				/* istanbul ignore next */
				if ( err || !result ) {
					if ( typeof callback == 'function' ) {
						callback( null );
					}
					return;
				}

				// update task status
				function updateTask() {
					var query = {
							_id: result._id
						},
						update = {
							$set: {
								status: jobs.STATUS.PENDING,
								started: +new Date()
							}
						};

					// run found task
					function run( err, count ) {
						var data;

						/* istanbul ignore if:not much to test here */
						if ( err ) {
							logger.error( err );
						}

						/* istanbul ignore next */
						if ( err || !count ) {
							if ( typeof callback == 'function' ) {
								callback( null );
							}
							return;
						}

						data = {
							id: '/jobs/' + result.jobId + '/tests/' + result.taskName,
							jobId: result.jobId,
							tbId: result._id
						};

						/* istanbul ignore else */
						if ( typeof callback == 'function' ) {
							callback( data );
						}
					}

					browserTasksDb.update( query, update, run );
				}

				// job timeout
				if ( result.status === jobs.STATUS.PENDING ) {
					query = {
						_id: result._id
					};

					// increase retry counter and start testing
					if ( result.retries < bender.conf.testRetries + 1 ) {
						update = {
							$inc: {
								retries: 1
							}
						};

						handler = updateTask;
						// mark as failed and finish
					} else {
						update = {
							$set: {
								status: jobs.STATUS.FAILED,
								errors: [ {
									name: 'Test timeout',
									error: 'Test couldn\'t be executed' +
										' after maximum number of retries'
								} ]
							}
						};

						handler = function( err ) {
							/* istanbul ignore if */
							if ( err ) {
								logger.error( err );
							}

							/* istanbul ignore else */
							if ( typeof callback == 'function' ) {
								callback( null );
							}
						};
					}

					browserTasksDb.update( query, update, handler );
					// find task and start testing
				} else {
					updateTask();
				}
			}

			query = {
				$and: [ {
					$or: [
						// failed but waiting for retry
						{
							$and: [ {
								status: jobs.STATUS.FAILED
							}, {
								retries: {
									$lt: bender.conf.testRetries + 1
								}
							} ]
						},
						// unresolved within testTimeout
						{
							$and: [ {
								status: jobs.STATUS.PENDING
							}, {
								started: {
									$lt: new Date() - bender.conf.testTimeout
								}
							} ]
						},
						// waiting
						{
							status: jobs.STATUS.WAITING
						}
					]
				}, {
					name: client.browser
				}, {
					version: {
						$in: [ client.version, 0 ]
					}
				} ]
			};

			// find a task in the browser tasks database
			browserTasksDb
				.findOne( query )
				.sort( {
					created: 1,
					id: 1
				} )
				.exec( handleBrowserTask );
		};

		/**
		 * Complete a browser task
		 * @param {Object}  data         Task data
		 * @param {String}  data.tbId    Task's id
		 * @param {Boolean} data.success Completed successfully flag
		 */
		jobs.completeTask = function( data ) {
			var update = {
					$set: {
						status: jobs.STATUS[
							data.success ? data.ignored ? 'IGNORED' : 'PASSED' : 'FAILED'
						],
						duration: data.duration,
						total: Object.keys( data.results ).length,
						testedVersion: parseInt( data.client.version, 10 ),
						testedUA: data.client.ua
					}
				},
				query;

			function getErrors() {
				return Object.keys( data.results )
					.filter( function( name ) {
						return data.results[ name ] && data.results[ name ].error;
					} )
					.map( function( name ) {
						return {
							name: name,
							error: data.results[ name ].error
						};
					} );
			}

			// increase retries counter
			if ( !data.success ) {
				update.$set.errors = getErrors();
				update.$inc = {
					retries: 1
				};
			}

			query = {
				_id: data.tbId
			};

			browserTasksDb.update( query, update, function( err, count ) {
				/* istanbul ignore next */
				if ( err ) {
					return logger.error( err );
				}

				if ( !count ) {
					return;
				}

				bender.emit( 'job:update', data.jobId );
			} );

		};
	},

	init: function( done ) {
		var bender = this;

		bender.on( 'client:fetch', bender.jobs.fetch );
		bender.on( 'client:complete', bender.jobs.completeTask );

		done();
	}
};
