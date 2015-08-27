/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages jobs
 */

'use strict';

var path = require( 'path' ),
	fs = require( 'graceful-fs' ),
	ncp = require( 'ncp' ).ncp,
	rimraf = require( 'utile' ).rimraf,
	when = require( 'when' ),
	whenNode = require( 'when/node' ),
	mkdir = whenNode.lift( fs.mkdir ),
	whenCall = whenNode.call,
	_ = require( 'lodash' ),
	logger = require( './logger' ).create( 'jobs', true ),

	cwd = process.cwd(),
	jobsDir = path.join( cwd, '/.bender/jobs/' );

/**
 * Job manager
 * @module jobs
 */
module.exports = {

	name: 'jobs',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			/**
			 * Job manager
			 * @type {module:jobs}
			 * @memberOf module:bender
			 */
			jobs = bender.jobs = {};

		bender.checkDeps( module.exports.name, 'conf', 'tests', 'applications', 'utils' );

		/* istanbul ignore else */
		if ( !fs.existsSync( jobsDir ) ) {
			try {
				fs.mkdirSync( jobsDir );
			} catch ( e ) {
				logger.error( e );
				process.exit( 1 );
			}
		}

		/**
		 * Collection of databases
		 * @type {Object}
		 * @memberOf module:jobs
		 * @name db
		 */
		jobs.db = {};

		/**
		 * Job statuses
		 * @type {Object}
		 * @enum
		 * @memberOf module:jobs
		 * @name STATUS
		 */
		jobs.STATUS = {
			WAITING: 0,
			PENDING: 1,
			PASSED: 2,
			FAILED: 3,
			IGNORED: 4
		};

		var browserIdPattern = /^([a-z]+)(\d*)/i;

		// convert a string to a browser object
		function prepareBrowser( browser ) {
			var match = browserIdPattern.exec( browser );

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

		// sort items by name and version
		function sortByNameAndVersion( prev, next ) {
			var pv = parseInt( prev.version, 10 ),
				nv = parseInt( next.version, 10 );

			return prev.name > next.name ? 1 :
				prev.name < next.name ? -1 :
				pv > nv ? 1 : -1;
		}

		/**
		 * Create new job
		 * @param  {Object} data               Job properties
		 * @param  {Array}  data.tests         Job tests
		 * @param  {Array}  data.browsers      Job browsers
		 * @param  {String} [data.description] Job description
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method create
		 * @fires module:bender#job:start
		 */
		jobs.create = function( data ) {
			logger.debug( 'create', data );

			var job, id;

			// prepare a job directory
			function prepareDir() {
				logger.debug( 'prepare a job directory' );
				var dir = path.join( jobsDir, id );

				return mkdir( dir )
					.then( function() {
						return mkdir( path.join( dir, 'tests' ) );
					} )
					.then( function() {
						return mkdir( path.join( dir, 'apps' ) );
					} );
			}

			// prepare a task object
			function prepareTask( task ) {
				task = _.cloneDeep( task );

				delete task._id;

				task.jobId = id;

				return task;
			}

			// copy tests and create tasks for them
			function fillTasksDb() {
				logger.debug( 'insert tasks to the DB' );

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
					.then( function insertTasks( tests ) {
						logger.debug( 'insert job tasks' );
						return whenCall( jobs.db.tasks.insert, tests.map( prepareTask ) );
					} );
			}

			// add browser tasks to the database
			function fillBrowserTasksDb( tasks ) {
				logger.debug( 'insert browser tasks to the DB' );

				var toAdd = [];

				data.browsers.map( function( browserId ) {
					var browser = bender.browsers.get( browserId ),
						parsed = prepareBrowser( browserId );

					tasks.forEach( function( task ) {
						// don't create manual tasks for browsers that don't support such
						if ( task.manual && !browser.manual ) {
							return;
						}

						toAdd.push( {
							name: parsed.name,
							version: parsed.version,
							taskId: task._id,
							taskName: task.id,
							manual: !!task.manual,
							jobId: id,
							status: jobs.STATUS.WAITING,
							retries: 0,
							created: +new Date()
						} );
					} );
				} );

				return whenCall( jobs.db.browserTasks.insert, toAdd )
					.yield( tasks );
			}

			// take a snapshot of the current tests state
			function copyTests( tasks ) {
				logger.debug( 'copy tests' );

				// collect all the test groups we're going to copy
				function collectGroups( tasks ) {
					return tasks.reduce( function( result, current ) {
						if ( result.indexOf( current.group ) === -1 ) {
							result.push( current.group );
						}

						return result;
					}, [] );
				}

				// collect all the test base paths
				function collectBasePaths() {
					var groups = collectGroups( tasks );

					groups = groups.map( function( name ) {
						return bender.tests.getBasePaths( name );
					} );

					return when.all( groups );
				}

				// merge the base paths arrays into single array containing unique items
				function mergeBasePaths( basePaths ) {
					return _.uniq( Array.prototype.concat.apply( [], basePaths ) );
				}

				// copy all the files located in the base paths
				function copyBasePaths( basePaths ) {
					var dest = path.join( jobsDir, id, 'tests' );

					return when
						.map( basePaths, function( dir ) {
							var to = path.join( dest, path.relative( cwd, dir ) );

							return whenCall( bender.utils.mkdirp, to )
								.then( function() {
									return whenCall( ncp, dir, to, {
										dereference: true
									} );
								} );
						} );
				}

				return collectBasePaths()
					.then( mergeBasePaths )
					.then( copyBasePaths )
					.yield( tasks );
			}

			// take a snapshot of applications required by selected tests
			function copyApps( tasks ) {
				logger.debug( 'copy apps' );

				var apps = [];

				// copy an application with a given name
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
				coverage: false,
				created: +new Date(),
				description: data.description,
				filter: data.filter,
				snapshot: data.snapshot,
				done: false
			};

			return whenCall( jobs.db.jobs.insert, job )
				.then( function( result ) {
					job = result;
					id = result._id;
				} )
				.then( fillTasksDb )
				.then( fillBrowserTasksDb )
				.then( function( tasks ) {
					return data.snapshot && prepareDir().yield( tasks )
						.then( copyTests )
						.then( copyApps );
				} )
				.then( function() {
					/**
					 * Job started
					 * @event module:bender#job:start
					 * @type {Object}
					 */
					bender.emit( 'job:start', job );
					return job._id;
				} );
		};

		/**
		 * List all the jobs
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method list
		 */
		jobs.list = function() {
			logger.debug( 'list' );

			return whenCall( jobs.db.jobs.find, {} )
				.then( jobs.getResults )
				.then( function( jobsArray ) {
					return when.map( jobsArray, function( job ) {
						job.results = jobs.buildResults( job );

						delete job.tasks;
						delete job.browsers;

						return job;
					} );
				} );
		};

		/**
		 * Get a job and its results
		 * @param  {String} id Job ID
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method get
		 */
		jobs.get = function( id ) {
			logger.debug( 'get', id );

			return jobs
				.find( id )
				.then( function( job ) {
					return job ? jobs.getResults( [ job ] ) : when.resolve( [ null ] );
				} )
				.then( function( results ) {
					var job = results[ 0 ];

					function sortBrowsers( prev, next ) {
						var pp = browserIdPattern.exec( prev ),
							np = browserIdPattern.exec( next ),
							pn = pp && pp[ 1 ] || prev,
							nn = np && np[ 1 ] || next,
							pv = pp && parseInt( pp[ 2 ], 10 ) || 0,
							nv = np && parseInt( np[ 2 ], 10 ) || 0;

						return pn > nn ? 1 :
							pn < nn ? -1 :
							pv > nv ? 1 : -1;
					}

					// sort browser IDs by name and version and convert to objects with name and version properties
					if ( job && job.browsers ) {
						job.browsers = job.browsers.sort( sortBrowsers );
					}

					return job;
				} )
				.then( function( job ) {
					if ( !job ) {
						return null;
					}

					job.results = jobs.buildResults( job );

					return job;
				} );
		};


		/**
		 * Find a job in the database
		 * @param  {String} id Job ID
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method find
		 */
		jobs.find = function( id ) {
			logger.debug( 'find', id );

			return whenCall(
				jobs.db.jobs.findOne, {
					_id: id
				} );
		};

		/**
		 * Remove a job from the database and delete its snapshot
		 * @param  {Array.<String>} ids Job IDs
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method delete
		 * @fires module:bender#job:remove
		 */
		jobs.delete = function( ids ) {
			logger.debug( 'delete', ids );
			// remove a job
			function removeJobs() {
				return whenCall( jobs.db.jobs.remove, {
					_id: {
						$in: ids
					}
				}, {
					multi: true
				} );
			}

			// remove job's tasks
			function removeTasks( count ) {
				return count ? whenCall(
					jobs.db.tasks.remove, {
						jobId: {
							$in: ids
						}
					}, {
						multi: true
					}
				) : when.reject( 'There\'s no such job.' );
			}

			// remove job's browser tasks
			function removeBrowserTasks() {
				return whenCall(
					jobs.db.browserTasks.remove, {
						jobId: {
							$in: ids
						}
					}, {
						multi: true
					}
				);
			}

			// remove job's applications
			function removeApps() {
				return whenCall(
					jobs.db.apps.remove, {
						jobId: {
							$in: ids
						}
					}, {
						multi: true
					}
				);
			}

			// remove a job's directory
			function removeDirectories() {
				return when.all( ids.map( function( id ) {
					return whenCall( rimraf, path.join( jobsDir, id ) );
				} ) );
			}

			return removeJobs()
				.then( removeTasks )
				.then( removeBrowserTasks )
				.then( removeApps )
				.then( removeDirectories )
				.then( function() {
					logger.debug( 'deleted', ids );
					/**
					 * Job removed
					 * @event module:bender#job:remove
					 * @type {Object}
					 */
					bender.emit( 'job:remove', ids );
				} );
		};

		jobs.recreate = function( id, testsIds ) {
			logger.debug( 'recreate', id, testsIds );

			var oldJob;

			function updateJob() {
				var query = {
						_id: id
					},
					update = {
						$set: {
							coverage: false,
							done: false
						}
					};

				return whenCall( jobs.db.jobs.update, query, update );
			}

			function updateTasks() {
				function removeTasks() {
					return whenCall( jobs.db.tasks.remove,
						{
							jobId: id
						}, {
							multi: true
						}
					);
				}

				function prepareTask( task ) {
					task = _.cloneDeep( task );

					delete task._id;

					task.jobId = id;

					return task;
				}

				function addTasks() {
					return bender.tests
						.list()
						.then( function( tests ) {
							var filtered = [];

							tests.forEach( function( test ) {
								testsIds.forEach( function( id ) {
									/* istanbul ignore else */
									if ( test.id == id ) {
										filtered.push( test );
									}
								} );
							} );

							return whenCall( jobs.db.tasks.insert, filtered.map( prepareTask ) );
						} );
				}

				return removeTasks().
					then( addTasks );
			}

			function resetBrowserTasks() {
				return whenCall( jobs.db.browserTasks.update, {
					jobId: id
				}, {
					$set: {
						errors: null,
						started: 0,
						duration: 0,
						total: 0,
						testedVersion: 0,
						testedUA: null,
						status: jobs.STATUS.WAITING,
						retries: 0
					}
				}, {
					multi: true
				} );
			}

			// update browser tasks database
			function updateBrowserTasks( tasks ) {
				var toAdd = oldJob.browsers;
				toAdd = toAdd.map( prepareBrowser );

				// add browser tasks for a given task
				function insertTaskBrowsers( task ) {
					toAdd = toAdd.map( function( browser ) {
						return {
							name: browser.name,
							version: browser.version,
							errors: null,
							started: 0,
							duration: 0,
							total: 0,
							testedVersion: 0,
							testedUA: null,
							taskId: task._id,
							taskName: task.id,
							manual: !!task.manual,
							jobId: id,
							status: jobs.STATUS.WAITING,
							retries: 0,
							created: +new Date()
						};
					} );

					return whenCall(
						jobs.db.browserTasks.insert,
						toAdd
					);
				}

				// remove unneeded tasks from the database
				function removeTasks() {
					return whenCall( jobs.db.browserTasks.remove, {
						jobId: id
					}, {
						multi: true
					} );
				}

				// add new tasks to the database
				function addTasks() {
					return toAdd.length ?
						when.map( tasks, insertTaskBrowsers ).then( updateJob ) : when.resolve();
				}

				return removeTasks()
					.then( addTasks );
			}

			return jobs
				.find( id )
				.then( function( job ) {
					// no such job - reject
					if ( !job ) {
						return when.reject( new Error( 'There\'s no such job.' ) );
					}

					oldJob = job;

					var promise;

					if ( oldJob.snapshot ) {
						promise = resetBrowserTasks();
					} else {
						promise = updateTasks()
							.then( updateBrowserTasks );

					}

					return promise
						.then( updateJob )
						.then( function() {
							return jobs.find( id );
						} )
						.then( function( job ) {
							if ( job ) {
								logger.debug( 'recreated', id );
								bender.emit( 'job:start', job );

								return job;
							} else {
								return when.reject( 'There\'s no such job.' );
							}
						} );
				} );
		};

		/**
		 * Modify a job - allows to change job's browsers and a description
		 * @param  {String} id   Job's ID
		 * @param  {Object} data Job data
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method edit
		 * @fires module:bender#job:update
		 * @fires module:bender#job:change
		 */
		jobs.edit = function( id, data ) {
			logger.debug( 'edit', id, data );
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
			function getTasks( count ) {
				if ( !count ) {
					return when.reject( 'There\'s no such job.' );
				}

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

				// add browser tasks for a given task
				function insertTaskBrowsers( task ) {
					toAdd = toAdd.map( function( browser ) {
						return {
							name: browser.name,
							version: browser.version,
							taskId: task._id,
							taskName: task.id,
							manual: !!task.manual,
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

				// reset a job's state
				function updateJob() {
					var query = {
							_id: id
						},
						update = {
							$set: {
								coverage: false,
								done: false
							}
						};

					return whenCall( jobs.db.jobs.update, query, update );
				}

				// add new tasks to the database
				function addTasks() {
					return toAdd.length ?
						when.map( tasks, insertTaskBrowsers ).then( updateJob ) :
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
							logger.debug( 'edited', id );
							/**
							 * Job updated
							 * @event module:bender#job:update
							 * @type {String}
							 */
							bender.emit( 'job:update', job._id );
							/**
							 * Job changed
							 * @event module:bender#job:change
							 * @type {Object}
							 */
							bender.emit( 'job:change', job );
							return job;
						} );
				} );
		};

		/**
		 * Update job's properties
		 * @param  {String} id   Job ID
		 * @param  {Object} data Update data
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method update
		 */
		jobs.update = function( id, data ) {
			logger.debug( 'update', id, data );

			var query = {
					_id: id
				},
				update = {
					$set: data
				};

			return whenCall( jobs.db.jobs.update, query, update )
				.then( function( count ) {
					if ( !count ) {
						return when.reject( new Error( 'There\'s no such job.' ) );
					}
				} );
		};

		/**
		 * Get details for a task of a given job
		 * @param  {String} jobId  ID of a job
		 * @param  {String} taskId ID of a task
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method getTask
		 */
		jobs.getTask = function( jobId, taskId ) {
			logger.debug( 'getTask', jobId, taskId );

			return whenCall( jobs.db.tasks.findOne, {
				jobId: jobId,
				id: taskId
			} );
		};

		/**
		 * Get application's details for a given job
		 * @param  {String} jobId ID of a job
		 * @param  {String} name  Application name
		 * return {Promise}
		 * @memberOf module:jobs
		 * @method getApp
		 */
		jobs.getApp = function( jobId, name ) {
			logger.debug( 'getApp', jobId, name );

			return whenCall( jobs.db.apps.findOne, {
				jobId: jobId,
				name: name
			} );
		};

		/**
		 * Get results for a given job
		 * @param  {Array.<Object>} data Array of job objects
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method getResults
		 */
		jobs.getResults = function( data ) {
			logger.debug( 'getResults', JSON.stringify( data ) );
			// build a given tasks
			function buildTasks( tasks ) {
				// build results for a given tasks
				function buildResults( results ) {
					var resultsObj = {},
						tasksObj = {};

					// group results with the same task ID
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

					// rebuild task objects
					tasks.forEach( function( task, index ) {
						tasks[ index ] = {
							id: task.id,
							_id: task._id,
							jobId: task.jobId,
							results: resultsObj[ task._id ]
								.sort( sortByNameAndVersion ),
							failed: resultsObj[ task._id ].some( function( result ) {
								return result.status === jobs.STATUS.FAILED;
							} )
						};
					} );

					// group tasks with the same job IDs
					tasks.forEach( function( task ) {
						if ( !tasksObj[ task.jobId ] ) {
							tasksObj[ task.jobId ] = [];
						}

						tasksObj[ task.jobId ].push( task );
					} );

					// assign tasks to appropriate jobs
					data.forEach( function( job ) {
						job.tasks = tasksObj[ job._id ]
							.sort( function( prev, next ) {
								/* istanbul ignore next */
								return prev.id > next.id ? 1 : -1;
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
		 * Compact results of a job by grouping them by browsers
		 * @param  {Object} job Bender job
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method buildResults
		 */
		jobs.buildResults = function( job ) {
			logger.debug( 'compact results', job.id );

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

			// remove the duration of unfinished job results to reduce the amount of re-renders in the dashboard
			function clearDuration( name ) {
				var result = results[ name ];

				/* istanbul ignore else */
				if ( result.status !== jobs.STATUS.PASSED && result.status !== jobs.STATUS.FAILED ) {
					result.duration = 0;
				}

				return result;
			}

			job.tasks.forEach( function( task ) {
				task.results.forEach( groupResults );
			} );

			return Object.keys( results )
				.map( clearDuration )
				.sort( sortByNameAndVersion );
		};

		/**
		 * Find a task for a client and mark it as pending
		 * @param  {Object}   client   Client object
		 * @param  {Function} callback Function called with found task
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method startTask
		 */
		jobs.startTask = function( client ) {
			logger.debug( 'startTask', client );

			var query, update, handler;

			// handle the found task
			function handleBrowserTask( result ) {
				/* istanbul ignore next */
				if ( !result ) {
					return null;
				}

				// update a task status
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
							btId: result._id,
							manual: result.manual
						} : /* istanbul ignore next */ null;
					}

					return whenCall( jobs.db.browserTasks.update, query, update )
						.then( prepareTask );
				}

				// job timeout
				if ( result.status === jobs.STATUS.PENDING ) {
					query = {
						_id: result._id
					};

					// increase the retry counter and continue testing
					if ( result.retries < bender.conf.testRetries ) {
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
									error: 'Test couldn\'t be executed after maximum number of retries'
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
						// waiting
						{
							status: jobs.STATUS.WAITING
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
						// failed but waiting for retry
						{
							$and: [ {
								status: jobs.STATUS.FAILED
							}, {
								retries: {
									$lt: bender.conf.testRetries + 1
								}
							} ]
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

			// add a condition for a client accepting manual tests only
			if ( client.mode === 'manual' ) {
				query.$and.push( {
					manual: true
				} );
			}

			// add a condition for a client accepting unit tests only
			if ( client.mode === 'unit' ) {
				query.$and.push( {
					manual: false
				} );
			}

			// find a task in the browser tasks database
			var sort = jobs.db.browserTasks
				.findOne( query )
				.sort( {
					started: 1,
					created: 1,
					id: 1
				} );

			return whenCall( sort.exec.bind( sort ) )
				.then( handleBrowserTask );
		};

		/**
		 * Complete a browser task
		 * @param  {Object}  data         Task data
		 * @param  {String}  data.btId    Browser task's ID
		 * @param  {String}  data.jobId   Job's ID
		 * @param  {Boolean} data.success Completed successfully flag
		 * @return {Promise}
		 * @memberOf module:jobs
		 * @method completeTask
		 * @fires module:bender#job:update
		 */
		jobs.completeTask = function( data ) {
			logger.debug( 'completeTask', data );

			var update, query;

			if ( !data.btId ) {
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
				_id: data.btId
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
					retries: data.manual ? bender.conf.testRetries + 1 : 1
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
		 * @memberOf module:jobs
		 * @method checkComplete
		 * @fires module:bender#job:complete
		 */
		jobs.checkComplete = function( id ) {
			logger.debug( 'checkComplete', id );

			whenCall( jobs.db.browserTasks.find, {
				jobId: id
			} ).done( function( tasks ) {
				var status = tasks.shift().status,
					query,
					update;

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
					query = {
						_id: id
					};

					update = {
						$set: {
							done: true
						}
					};

					whenCall( jobs.db.jobs.update, query, update )
						.then( function() {
							return jobs.find( id );
						} )
						.done( function( job ) {
							/**
							 * Job completed
							 * @event module:bender#job:complete
							 * @type {Object}
							 */
							bender.emit( 'job:complete', job, status );
						} );
				}
			} );
		};
	},

	init: function( done ) {
		logger.debug( 'init' );

		var bender = this,
			db = bender.jobs.db;

		// create and/or load databases
		db.jobs = bender.database.get( 'jobs.db' );
		db.tasks = bender.database.get( 'tasks.db' );
		db.browserTasks = bender.database.get( 'browser_tasks.db' );
		db.apps = bender.database.get( 'job_apps.db' );

		// bind event handlers
		bender.on( 'client:afterRegister', function( client ) {
			/**
			 * Client requests a task
			 * @event module:bender#client:getTask
			 * @type {Object}
			 */
			bender.emit( 'client:getTask', client );
		} );

		bender.on( 'client:complete', function( data ) {
			bender.jobs
				.completeTask( data )
				.done( function() {
					bender.emit( 'client:getTask', data.client );
				} );
		} );

		bender.on( 'job:start', getTask );
		bender.on( 'job:change', getTask );
		bender.on( 'job:update', bender.jobs.checkComplete );

		bender.on( 'client:getTask', function( client, callback ) {
			bender.jobs.startTask( client )
				.done( function( task ) {
					if ( task ) {
						/**
						 * Run a test on a client
						 * @event module:bender#client:run
						 * @type {String}
						 */
						bender.emit( 'client:run', client.id, task );
					}

					if ( typeof callback == 'function' ) {
						callback();
					}
				}, /* istanbul ignore next */ function( err ) {
					if ( err ) {
						logger.error( err );
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
