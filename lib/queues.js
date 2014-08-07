/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages queues of tests for connected clients
 */

'use strict';

var _ = require( 'lodash' );

module.exports = {

	name: 'queues',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'browsers', 'conf' );

		/**
		 * Queue of browser tasks constructor
		 * @param {Object} browser         Browser object
		 * @param {String} browser.name    Name of a browser, e.g. chrome
		 * @param {Number} browser.version Version of a browser, e.g. 36
		 * @constructor
		 */
		function Queue( browser ) {
			this.name = browser.name;
			this.version = browser.version;
			this.clients = {};
			this.tests = [];
		}

		/**
		 * Add tests to the queue
		 * @param {Array.<Object>} tests Array of tests/tasks
		 * @fires client:run
		 */
		Queue.prototype.add = function( tests ) {
			this.tests = this.tests.concat( tests );

			// check if there are waiting clients
			_.forEach( this.clients, function( client, id ) {
				// there's a waiting client
				/* istanbul ignore else */
				if ( !client.length ) {
					bender.emit( 'client:getTest', {
						id: id,
						name: this.name,
						version: this.version
					} );
				}
			}, this );
		};

		/**
		 * Get a test for a given client and add it to its queue
		 * @param  {Object} client    Client object
		 * @param  {String} client.id Client's ID
		 * @return {Object}
		 */
		Queue.prototype.getTest = function( client ) {
			var test = this.tests.shift(),
				clientQueue = this.clients[ client.id ];

			// create a test queue for a client
			/* istanbul ignore else */
			if ( !clientQueue ) {
				clientQueue = this.clients[ client.id ] = [];
			}

			// there's a test - add it to the queue and return
			/* istanbul ignore else */
			if ( test ) {
				clientQueue.push( test );

				return test;
			}
		};

		/**
		 * Remove tests from the tests queue
		 * @param  {Array.<Object>} tests Array of tests to remove
		 * @return {Boolean}
		 */
		Queue.prototype.removeTests = function( tests ) {
			var removed = false,
				i;

			function inTests( item ) {
				return tests.some( function( test ) {
					return item.taskId === test.taskId && item.jobId === test.jobId;
				} );
			}

			for ( i = this.tests.length - 1; i >= 0; i-- ) {
				if ( inTests( this.tests[ i ] ) ) {
					this.tests.splice( i, 1 );
					removed = true;
				}
			}

			_.forEach( this.clients, function( clientQueue ) {
				for ( i = clientQueue.length - 1; i >= 0; i-- ) {
					if ( inTests( clientQueue[ i ] ) ) {
						clientQueue.splice( i, 1 );
						removed = true;
					}
				}
			} );

			return removed;
		};

		/**
		 * Empty client's queue
		 * @param {Object} client    Client object
		 * @param {String} client.id Client's ID
		 */
		Queue.prototype.done = function( client ) {
			var clientQueue = this.clients[ client.id ];

			/* istanbul ignore else */
			if ( clientQueue ) {
				clientQueue.length = 0;
			}
		};

		/**
		 * Check if the queue is finished meaning all the tests were taken
		 * and none of the clients has a pending test in its queue
		 * @return {Boolean}
		 */
		Queue.prototype.isDone = function() {
			return !this.tests.length &&
				_.every( this.clients, function( client ) {
					return !client.length;
				}, this );
		};

		/**
		 * Remove a client from the queue.
		 * If a client had a pending test, move it back to the queue.
		 * @param  {Object} client    Client object
		 * @param  {String} client.id Client's ID
		 * @return {Boolean}
		 */
		Queue.prototype.removeClient = function( client ) {
			var clientQueue = this.clients[ client.id ];

			// move pending tests of a disconnected client back to the queue
			if ( clientQueue ) {
				clientQueue.forEach( function( test ) {
					test.retries++;
				} );

				this.tests = this.tests.concat( clientQueue );

				delete this.clients[ client.id ];

				return true;
			}

			return false;
		};



		/**
		 * Queue Manager constructor
		 */
		function QueueManager() {
			this.queues = {};
		}

		/**
		 * Find a queue for a given client
		 * @param  {Object|String} client           Client object or name
		 * @param  {String}        client.id        Client's ID
		 * @param  {String}        [client.name]    Client's browser name
		 * @param  {String}        [client.browser] Client's browser name
		 * @param  {String}        client.version   Client's browser version
		 * @return {Queue}
		 */
		QueueManager.prototype.findQueue = function( client ) {
			var queue,
				name;

			if ( typeof client == 'string' ) {
				client = bender.browsers.parseBrowser( client );
			}

			if ( !client ) {
				return;
			}

			for ( name in this.queues ) {
				queue = this.queues[ name ];

				if ( ( queue.name === client.name || queue.name === client.browser ) &&
					( queue.version === client.version || queue.version === 0 ) ) {
					return queue;
				}
			}
		};

		/**
		 * Add tests to the matching queue
		 * @param  {String|Object}  browser Browser name or browser object
		 * @param  {Array.<Object>} tests   Array of tests
		 * @return {Boolean}
		 */
		QueueManager.prototype.addTests = function( browser, tests ) {
			if ( typeof browser == 'string' ) {
				browser = bender.browsers.parseBrowser( browser );
			}

			if ( !browser ) {
				return false;
			}

			var queue = this.queues[ browser.name + '_' + browser.version ];

			if ( queue ) {
				queue.add( tests );
				return true;
			}

			return false;
		};

		/**
		 * Get a test for a given client
		 * @param  {Object} client    Client object
		 * @param  {String} client.id Client's ID
		 * @return {Object}
		 */
		QueueManager.prototype.getTest = function( client ) {
			var queue = this.findQueue( client ),
				test = queue && queue.getTest( client );

			if ( test ) {
				return test;
			} else {
				this.checkDone();
			}
		};

		/**
		 * Remove tests from the queues
		 * @param {Object|String}  browser Browser object or name
		 * @param {Array.<Object>} tests   Array of tests to remove
		 */
		QueueManager.prototype.removeTests = function( browser, tests ) {
			if ( typeof browser == 'string' ) {
				browser = bender.browsers.parseBrowser( browser );
			}

			if ( !browser ) {
				return false;
			}

			var queue = this.queues[ browser.name + '_' + browser.version ];

			/* istanbul ignore else */
			if ( queue ) {
				return queue.removeTests( tests );
			}

			return false;
		};

		/**
		 * Empty client's queue
		 * @param {Object} client    Client object
		 * @param {String} client.id Client's ID
		 */
		QueueManager.prototype.done = function( client ) {
			_.forEach( this.queues, function( queue ) {
				queue.done( client );
			} );
		};

		/**
		 * Remove a client from the queues
		 * @param {Object} client    Client object
		 * @param {String} client.id Client's ID
		 */
		QueueManager.prototype.removeClient = function( client ) {
			_.forEach( this.queues, function( queue ) {
				queue.removeClient( client );
			} );
		};

		/**
		 * Check if all the queues are finished
		 * @fires queues:complete
		 */
		QueueManager.prototype.checkDone = function() {
			var isDone = _.every( this.queues, function( queue ) {
				return queue.isDone();
			}, this );

			/* istanbul ignore else */
			if ( isDone ) {
				bender.emit( 'queues:complete' );
			}
		};

		/**
		 * Prepares queues for the given browsers
		 * @param {Array.<String>} browsers Array of browsers' names
		 */
		QueueManager.prototype.buildQueues = function( browsers ) {
			browsers.forEach( function( browser ) {
				// convert to object
				browser = bender.browsers.parseBrowser( browser );

				if ( !browser ) {
					return;
				}

				this.queues[ browser.name + '_' + browser.version ] = new Queue( browser );
			}, this );
		};

		bender.queues = new QueueManager();

		module.exports.Queue = Queue;
		module.exports.QueueManager = QueueManager;
	},

	init: function( done ) {
		var bender = this;

		bender.on( 'client:getTest', function( client ) {
			var test = bender.queues.getTest( client );

			/* istanbul ignore else */
			if ( test ) {
				if ( test.taskId && test.jobId ) {
					bender.jobs.startTask( test )
						.done( function( task ) {
							if ( task ) {
								bender.emit( 'client:run', client.id, task );
							} else {
								bender.queues.done( client );
							}
						} );
				} else {
					bender.emit( 'client:run', client.id, test );
				}
			}
		} );

		bender.on( 'client:afterRegister', function( client ) {
			bender.emit( 'client:getTest', client );
		} );

		bender.on( 'client:complete', function( data ) {
			bender.queues.done( data.client );
			bender.emit( 'client:getTest', data.client );
		} );

		bender.on( 'client:disconnect', function( client ) {
			bender.queues.removeClient( client );
		} );

		bender.on( 'tasks:add', function( browser, tasks ) {
			bender.queues.addTests( browser, tasks );
		} );

		bender.on( 'tasks:remove', function( browser, tasks ) {
			bender.queues.removeTests( browser, tasks );
		} );

		done();
	}
};
