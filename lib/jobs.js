/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages jobs
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	ncp = require( 'ncp' ).ncp,
	rimraf = require( 'rimraf' ),
	when = require( 'when' ),
	whenNode = require( 'when/node' ),
	mkdir = whenNode.lift( fs.mkdir ),
	whenCall = whenNode.call,
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
			jobs = bender.jobs = {};

		bender.checkDeps( module.exports.name, 'conf', 'tests', 'applications', 'utils' );

		/* istanbul ignore else */
		if ( !fs.existsSync( jobsDir ) ) {
			try {
				fs.mkdirSync( jobsDir );
			} catch ( e ) {
				logger.error( String( e ) );
				process.exit( 1 );
			}
		}

		jobs.db = {};

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
				version: match[ 2 ] && parseInt( match[ 2 ], 10 ) || 0
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
			var job, id;

			// prepare job directory structure
			function prepareDir() {
				var dir = path.join( jobsDir, id );

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
				return whenCall( jobs.db.tasks.insert, tests.map( prepareTask ) );
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
				var tasksObj = {};

				tasks.forEach( function( task ) {
					tasksObj[ task._id ] = task;
				} );

				// add browser tasks for given task
				function insertTaskBrowsers( task ) {
					var browserTasks = data.browsers.map( function( browser ) {
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

					return whenCall( jobs.db.browserTasks.insert, browserTasks );
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
					paths = tasks.reduce( function( result, current ) {
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
							jobs.db.apps.insert,
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

			job = {
				browsers: data.browsers.map( function( browser ) {
					return browser.toLowerCase();
				} ),
				created: +new Date(),
				description: data.description,
				filter: data.filter,
				snapshot: data.snapshot
			};

			return whenCall( jobs.db.jobs.insert, job )
				.then( function( result ) {
					job = result;
					id = result._id;
				} )
				.then( fillTasksDb )
				.then( fillBrowserTasksDb )
				.then( function( tasks ) {
					return data.snapshot && prepareDir()
						.yield( tasks )
						.then( copyTests )
						.then( copyApps );
				} )
				.then( function() {
					bender.emit( 'job:start', job );
					return job._id;
				} );
		};

		/**
		 * List all the jobs
		 * @return {Promise}
		 */
		jobs.list = function() {
			return whenCall( jobs.db.jobs.find, {} )
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
						results[ 0 ].browsers = results[ 0 ].browsers.sort();
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
				jobs.db.jobs.findOne, {
					_id: id
				} );
		};

		/**
		 * Remove a job from the database and job's snapshots
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.delete = function( id ) {
			// remove a job
			function removeJob() {
				return whenCall( jobs.db.jobs.remove, {
					_id: id
				} );
			}
			// remove job's tasks
			function removeTasks( count ) {
				return count ? whenCall(
					jobs.db.tasks.remove, {
						jobId: id
					}, {
						multi: true
					}
				) : when.reject( 'There\'s no such job.' );
			}

			// remove job's browser tasks
			function removeBrowserTasks() {
				return whenCall(
					jobs.db.browserTasks.remove, {
						jobId: id
					}, {
						multi: true
					}
				);
			}

			// remove job's application records
			function removeApps() {
				return whenCall(
					jobs.db.apps.remove, {
						jobId: id
					}, {
						multi: true
					}
				);
			}

			// remove a job's directory
			function removeDirectory() {
				return whenCall( rimraf, path.join( jobsDir, id ) );
			}

			return removeJob()
				.then( removeTasks )
				.then( removeBrowserTasks )
				.then( removeApps )
				.then( removeDirectory )
				.then( function() {
					bender.emit( 'job:remove', id );
				} );
		};

		/**
		 * Restart a job and reset all it's results
		 * @param  {String} id Job ID
		 * @return {Promise}
		 */
		jobs.restart = function( id ) {
			return whenCall(
					jobs.db.browserTasks.update, {
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
						jobs.find( id ).then( function( job ) {
							if ( job ) {
								bender.emit( 'job:start', job );
							}
						} ) :
						when.reject( 'There are no tasks for this job or a job does not exist.' );
				} );
		};

		/**
		 * Modify a job - allows to change job's browsers and description
		 * @param  {String} id   Job's ID
		 * @param  {Object} data Job data
		 * @return {Promise}
		 */
		jobs.edit = function( id, data ) {
			var oldJob;

			// prevent from removing all the browsers
			if ( !data.browsers.length ) {
				return when.reject( 'No browsers specified.' );
			}

			data.browsers = _.map( data.browsers, function( browser ) {
				return browser.toLowerCase();
			} );

			// update job properties in the database
			function updateJob() {
				return whenCall( jobs.db.jobs.update, {
					_id: id
				}, {
					$set: {
						browsers: data.browsers,
						description: data.description
					}
				} );
			}

			// get job's tasks
			function getTasks() {
				return whenCall( jobs.db.tasks.find, {
					jobId: id
				} );
			}

			// update browser tasks database
			function updateBrowserTasks( tasks ) {
				var toAdd = _.difference( data.browsers, oldJob.browsers ),
					toRemove = _.difference( oldJob.browsers, data.browsers ),
					inserted = [];

				toAdd = toAdd.map( prepareBrowser );
				toRemove = toRemove.map( prepareBrowser );

				// add browser tasks for given task
				function insertTaskBrowsers( task ) {
					toAdd = toAdd.map( function( browser ) {
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

					inserted = inserted.concat( toAdd );

					return whenCall(
						jobs.db.browserTasks.insert,
						toAdd
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

					return whenCall( jobs.db.browserTasks.remove, {
						$and: [ {
							jobId: id
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

			return jobs
				.find( id )
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
							return jobs.find( id );
						} )
						.then( function( job ) {
							bender.emit( 'job:change', job );
							return job;
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
			return whenCall( jobs.db.tasks.findOne, {
				jobId: jobId,
				id: taskId
			} );
		};

		/**
		 * Get application's details for a given job
		 * @param  {String} jobId Id of a job
		 * @param  {String} name  Application name
		 * @return {Promise}
		 */
		jobs.getApp = function( jobId, name ) {
			return whenCall( jobs.db.apps.findOne, {
				jobId: jobId,
				name: name
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
								} ),
							failed: resultsObj[ task._id ].some( function( result ) {
								return result.status === jobs.STATUS.FAILED;
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

				return whenCall( jobs.db.browserTasks.find, {} )
					.then( buildResults );
			}

			return whenCall( jobs.db.tasks.find, {} )
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
		 * Find a task for a client
		 * @param  {Object}   client   Client object
		 * @param  {Function} callback Function called with found task
		 * @return {Promise}
		 */
		jobs.startTask = function( client ) {
			var query, update, handler;

			// handle found task
			function handleBrowserTask( result ) {
				/* istanbul ignore next */
				if ( !result ) {
					return null;
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

					function prepareTask( count ) {
						return count ? {
							id: '/jobs/' + result.jobId + '/tests/' + result.taskName,
							jobId: result.jobId,
							tbId: result._id
						} : null;
					}

					return whenCall( jobs.db.browserTasks.update, query, update )
						.then( prepareTask );
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

						handler = function() {
							return null;
						};
					}

					return whenCall( jobs.db.browserTasks.update, query, update )
						.then( handler );
					// find task and start testing
				} else {
					return updateTask();
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
			var sort = jobs.db.browserTasks
				.findOne( query )
				.sort( {
					created: 1,
					id: 1
				} );

			return whenCall( sort.exec.bind( sort ) )
				.then( handleBrowserTask );
		};

		/**
		 * Complete a browser task
		 * @param  {Object}  data         Task data
		 * @param  {String}  data.tbId    Task's id
		 * @param  {String}  data.jobId   Job's id
		 * @param  {Boolean} data.success Completed successfully flag
		 * @return {Promise}
		 */
		jobs.completeTask = function( data ) {
			var update, query;

			if ( !data.tbId ) {
				return when.resolve();
			}

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

			query = {
				_id: data.tbId
			};

			update = {
				$set: {
					status: jobs.STATUS[
						data.success ? data.ignored ? 'IGNORED' : 'PASSED' : 'FAILED'
					],
					duration: data.duration,
					total: Object.keys( data.results ).length,
					testedVersion: parseInt( data.client.version, 10 ),
					testedUA: data.client.ua
				}
			};

			// increase retries counter
			if ( !data.success ) {
				update.$set.errors = getErrors();
				update.$inc = {
					retries: 1
				};
			}

			return whenCall( jobs.db.browserTasks.update, query, update )
				.then( function( count ) {
					/* istanbul ignore if */
					if ( !count ) {
						return when.resolve();
					}

					bender.emit( 'job:update', data.jobId );
				} );
		};

		/**
		 * Check if the job is completed
		 * @param {String} id Job ID
		 */
		jobs.checkComplete = function( id ) {
			whenCall( jobs.db.browserTasks.find, {
				jobId: id
			} )
				.then( function( tasks ) {
					var status = tasks.shift().status;

					tasks.forEach( function( task ) {
						if ( task.status === jobs.STATUS.PENDING ||
							( task.status === jobs.STATUS.FAILED && status !== jobs.STATUS.PENDING ) ) {
							status = task.status;
						} else if ( ( task.status !== jobs.STATUS.WAITING && status === jobs.STATUS.WAITING ) ||
							( task.status === jobs.STATUS.WAITING && status !== jobs.STATUS.WAITING ) ) {
							status = jobs.STATUS.PENDING;
						}
					} );

					// all the tasks are finished so we can complete the job
					if ( status > jobs.STATUS.PENDING ) {
						jobs.find( id )
							.then( function( job ) {
								bender.emit( 'job:complete', job, status );
							} );
					}
				} );
		};
	},

	init: function( done ) {
		var bender = this,
			db = bender.jobs.db;

		// create/load databases
		db.jobs = bender.database.get( 'jobs.db' );
		db.tasks = bender.database.get( 'tasks.db' );
		db.browserTasks = bender.database.get( 'browser_tasks.db' );
		db.apps = bender.database.get( 'job_apps.db' );

		// bind event handlers
		bender.on( 'client:afterRegister', function( client ) {
			bender.emit( 'client:getTask', client );
		} );

		bender.on( 'client:complete', function( data ) {
			bender.jobs
				.completeTask( data )
				.then( function() {
					bender.emit( 'client:getTask', data.client );
				} );
		} );

		bender.on( 'job:start', getTask );
		bender.on( 'job:change', getTask );

		bender.on( 'job:update', bender.jobs.checkComplete );

		bender.on( 'client:getTask', function( client, callback ) {
			bender.jobs.startTask( client )
				.then( function( task ) {
					if ( task ) {
						bender.emit( 'client:run', client.id, task );
					}

					if ( typeof callback == 'function' ) {
						callback();
					}
				}, function( err ) {
					if ( err ) {
						logger.error( String( err ) );
					}
				} );

		} );

		function getTask( job ) {
			function runClients( browser ) {
				var clients = browser.clients.list();

				function next() {
					var name = clients.shift(),
						client;

					if ( !name ) {
						return;
					}

					if ( ( client = browser.clients.get( name ) ) && client.ready ) {
						bender.emit( 'client:getTask', client, next );
					} else {
						next();
					}
				}

				next();
			}

			job.browsers.forEach( function( name ) {
				var browser = bender.browsers.get( name );

				if ( browser ) {
					runClients( browser );
				}
			} );
		}

		done();
	}
};
