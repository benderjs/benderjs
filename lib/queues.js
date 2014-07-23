/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Manages queues of tests for connected clients
 */

'use strict';

var logger = require( './logger' ).create( 'queues', true );

module.exports = {

	name: 'queues',

	attach: function() {
		var bender = this;

		bender.checkDeps( module.exports.name, 'browsers', 'sockets', 'conf' );

		function QueueManager() {
			this.queues = {};
			this.clients = {};
		}

		QueueManager.prototype.add = function( name, version, tests ) {
			// TODO
		};

		QueueManager.prototype.get = function( client ) {
			var queue = this.queues[ client.browser + '_' + client.version ],
				test = queue && queue.shift(),
				clientQueue = this.clients[ client.id ];

			// no test for this client
			if ( !test ) {
				return this.checkDone();
			} else {
				// create a test queue for a client
				if ( !clientQueue ) {
					clientQueue = this.clients[ client.id ] = [];
				}

				clientQueue.push( test );

				return test;
			}
		};

		QueueManager.prototype.checkClient = function( client ) {
			var queue = this.queues[ client.browser + '_' + client.version ],
				clientQueue = this.clients[ client.id ];

			// move pending tests of a disconnected client back to the queue
			if ( clientQueue ) {
				queue = queue.concat( clientQueue );

				delete this.clients[ client.id ];
			}
		};

		QueueManager.prototype.checkDone = function() {
			var isDone = !Object.keys( this.queues ).every( function( name ) {
				return this.queues[ name ].length;
			} );

			if ( isDone ) {
				bender.emit( 'queues:complete' );
			}
		};

		QueueManager.prototype.build = function( browser, test ) {
			var that = this;

			browser = bender.browsers.parseBrowser( browser || bender.conf.defaultBrowser );

			function error( err ) {
				logger.error( 'Error while building test queue:' );
				if ( err.code === 'ENOENT' ) {
					logger.error( 'No test(s) found.' );
				} else {
					logger.error( String( err ) );
				}
				process.exit( 1 );
			}

			return ( test ? bender.tests.get( test ) : bender.tests.list() )
				.then( function( test ) {
					test = !Array.isArray( test ) ? [ test ] : test;

					if ( !test.length ) {
						return error( 'No test(s) found.' );
					}

					that.queues[ browser.name + '_' + browser.version ] = [].concat( test );
				}, error );
		};

		bender.queues = new QueueManager();
	},

	init: function( done ) {
		var bender = this;

		bender.on( 'client:afterRegister', function( client ) {
			var test = bender.queues.get( client );

			if ( test ) {
				bender.sockets.clients[ client.id ].emit( 'run', test );
			}
		} );

		bender.on( 'client:complete', function( data ) {
			var test = bender.queues.get( data.client );

			if ( test ) {
				bender.sockets.clients[ data.client.id ].emit( 'run', test );
			}
		} );

		bender.on( 'client:disconnect', function( client ) {
			bender.queues.checkClient( client );
		} );

		done();
	}
};
