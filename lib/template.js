/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Builds test page using page builders
 */

'use strict';

var when = require( 'when' ),
	path = require( 'path' ),
	pipeline = require( 'when/pipeline' ),
	combine = require( 'dom-combiner' ),
	logger = require( './logger' ).create( 'template', true );

/**
 * Test page template builder
 * @module template
 */
module.exports = {

	name: 'template',

	attach: function() {
		logger.debug( 'attach' );

		var bender = this,
			/**
			 * Test page template builder
			 * @type {module:template}
			 * @memberOf module:bender
			 */
			template = bender.template = {};

		bender.checkDeps( module.exports.name, 'applications', 'conf', 'jobs', 'plugins', 'utils' );

		// get test data
		function prepareTest( test ) {
			test.applications = bender.applications.get( test.applications );

			return when.resolve( test );
		}

		// get task data (task means a test for a specific browser within a job)
		function prepareTask( task ) {
			// map a file path to a job's directory
			function toJob( file ) {
				return '/jobs/' + task.jobId + file;
			}

			// get job application's data
			function getApp( name ) {
				function handleApp( app ) {
					// there's no application snapshot available
					if ( !app ) {
						app = bender.applications.get( name );
					}

					return app && {
						js: app.js.map( toJob ),
						css: app.css.map( toJob )
					};
				}

				return bender.jobs
					.getApp( task.jobId, name )
					.then( handleApp );
			}

			return when
				.map( task.applications, getApp )
				.then( function( apps ) {
					task.applications = apps;

					return task;
				} );
		}

		/**
		 * Replace %NAME% tags inside of the test HTML with their values
		 * @param  {String} html Combined test page HTML
		 * @param  {Object} data Test data
		 * @return {Promise}
		 * @memberOf module:template
		 * @method replaceTags
		 */
		template.replaceTags = function( html, data ) {
			var tags = {
				// test group's base path
				BASE_PATH: ( function() {
					var group = bender.conf.tests[ data.group ];

					return path.join(
						data.jobId ? ( '/jobs/' + data.jobId + '/tests/' ) : '/',
						group.basePath
					).replace( /[\\]+/g, '/' );
				} )(),

				// test's directory path
				TEST_DIR: ( function() {
					return path.join(
						data.jobId ? ( '/jobs/' + data.jobId + '/tests/' ) : '/',
						path.dirname( data.id ),
						'/'
					).replace( /[\\]+/g, '/' );
				} )(),

				TEST_ID: data.id
			};

			return bender.utils.template( html, tags );
		};

		/**
		 * Build a test page for the given data
		 * @param  {Object} data Test or task data
		 * @return {Promise}
		 * @memberOf module:template
		 * @method build
		 */
		template.build = function( data ) {
			logger.debug( 'build', data );

			function prepareData( data ) {
				data.parts = [];

				// bind a function to the application's context
				function bind( build ) {
					return build.bind( bender );
				}

				// wait for the promises created for HTML parts
				function handlePartsPromises( result ) {
					return when.all( result.parts );
				}

				// replace the tags found in the HTML
				function replaceTags( html ) {
					return template.replaceTags( html, data );
				}

				return pipeline( bender.pagebuilders.list().map( bind ), data )
					.then( handlePartsPromises )
					.then( combine )
					.then( replaceTags );
			}

			return ( data.jobId ? prepareTask( data ) : prepareTest( data ) )
				.then( prepareData );
		};
	}
};
