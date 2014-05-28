/**
 * @file Builds test page using page builders
 */

var when = require( 'when' ),
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

		bender.checkDeps( module.exports.name, 'pagebuilders' );

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
		 * Build test page for given data
		 * @param  {Object} data Test or task data
		 * @return {Promise}
		 */
		template.build = function( data ) {
			function prepareData( data ) {
				data.parts = [];

				return pipeline( bender.pagebuilders, data )
					.then( function( result ) {
						return when
							.all( result.parts )
							.then( combine );
					} );
			}

			return ( data.jobId ? prepareTask( data ) : prepareTest( data ) )
				.then( prepareData );
		};
	}
};
