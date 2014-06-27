/**
 * Copyright (c) 2014, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Builds test page using page builders
 */

'use strict';

var when = require( 'when' ),
	path = require( 'path' ),
	pipeline = require( 'when/pipeline' ),
	combine = require( 'dom-combiner' );

/**
 * @module template
 */
module.exports = {

	name: 'template',

	/**
	 * Attach module to Bender
	 */
	attach: function() {
		var bender = this,
			template = bender.template = {};

		bender.checkDeps( module.exports.name, 'applications', 'conf', 'jobs', 'plugins', 'utils' );

		// get test data
		function prepareTest( test ) {
			test.applications = bender.applications.get( test.applications );
			test.assertion = bender.assertions[ test.assertion ];

			return when.resolve( test );
		}

		// get task data (task means a test for a specific browser within a job)
		function prepareTask( task ) {
			// map file path to jobs' directory
			function toJob( file ) {
				return '/jobs/' + task.jobId + file;
			}

			// get jobs application's data
			function getApp( name ) {
				function handleApp( app ) {
					// return default application data
					if ( !app ) {
						return bender.applications.get( name ) || null;
					}

					// map app urls to job directory
					return {
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
					task.assertion = bender.assertions[ task.assertion ];

					return task;
				} );
		}

		/**
		 * Replace %NAME% tags inside of the test HTML with proper values
		 * @param  {String} html Combined test page HTML
		 * @param  {Object} data Test data
		 * @return {Promise}
		 */
		template.replaceTags = function( html, data ) {
			var tags = {
				// test group's base path
				BASE_PATH: ( function() {
					var group = bender.conf.tests[ data.group ];

					return path.join(
						data.jobId ? ( '/jobs/' + data.jobId + '/tests/' ) : '/',
						group ? group.basePath : ''
					).replace( /[\\]+/g, '/' );
				} )(),

				// test's directory path
				TEST_DIR: ( function() {
					return path.join(
						data.jobId ? ( '/jobs/' + data.jobId + '/tests/' ) : '/',
						path.dirname( data.id ),
						'/'
					).replace( /[\\]+/g, '/' );
				} )()
			};

			return when.resolve( bender.utils.template( html, tags ) );
		};

		/**
		 * Build test page for given data
		 * @param  {Object} data Test or task data
		 * @return {Promise}
		 */
		template.build = function( data ) {
			function prepareData( data ) {
				data.parts = [];

				return pipeline( bender.pagebuilders, data )
					.then( function( result ) {
						return when.all( result.parts );
					} )
					.then( combine )
					.then( function( html ) {
						return template.replaceTags( html, data );
					} );
			}

			return ( data.jobId ? prepareTask( data ) : prepareTest( data ) )
				.then( prepareData );
		};
	}
};
