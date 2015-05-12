/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Browsers module
 */

/*global App */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js, %APPS_DIR%bender/js/jobs.js */

describe( 'Jobs', function() {
	describe( 'JobRouter', function() {
		beforeEach( function() {
			Backbone.history.start();
		} );

		afterEach( function() {
			Backbone.history.stop();
		} );

		it( 'should inherit from Marionette.AppRouter', function() {
			var router = new App.Jobs.JobRouter( {
				controller: {
					listJobs: function() {},
					showJob: function() {},
				}
			} );

			expect( router ).to.be.instanceof( Marionette.AppRouter );
		} );

		it( 'should list jobs on "jobs" route', function() {
			var router = new App.Jobs.JobRouter( {
				controller: {
					listJobs: sinon.spy(),
					showJob: function() {},
				}
			} );

			var routerSpy = router.options.controller.listJobs,
				oldHash = window.location.hash;

			router.navigate( 'jobs', {
				trigger: true
			} );

			window.location.hash = oldHash;

			expect( routerSpy.calledOnce ).to.be.true();
		} );

		it( 'should show a job details on "jobs/<jobID>" route', function() {
			var router = new App.Jobs.JobRouter( {
				controller: {
					listJobs: function() {},
					showJob: sinon.spy(),
				}
			} );

			var routerSpy = router.options.controller.showJob,
				oldHash = window.location.hash;

			router.navigate( 'jobs/foo', {
				trigger: true
			} );

			window.location.hash = oldHash;

			expect( routerSpy.calledOnce ).to.be.true();
			expect( routerSpy.calledWith( 'foo' ) ).to.be.true();
		} );
	} );

	describe( 'JobRow', function() {
		it( 'should inherit from Backbone.Model', function() {
			var row = new App.Jobs.JobRow();

			expect( row ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should initialize with default attributes', function() {
			var row = new App.Jobs.JobRow();

			expect( row.toJSON() ).to.deep.equal( {
				selected: false,
				description: '',
				created: 0,
				results: []
			} );
		} );

		it( 'should set a model\'s selected attribute', function() {
			var row = new App.Jobs.JobRow( {
				selected: false
			} );

			row.setSelected( true );

			expect( row.get( 'selected' ) ).to.be.true();

			row.setSelected();

			expect( row.get( 'selected' ) ).to.be.false();
		} );

		it( 'should trigger "toggle:selected" event', function( done ) {
			var row = new App.Jobs.JobRow( {
				selected: false
			} );

			row.on( 'toggle:selected', function( selected ) {
				expect( selected ).to.be.true();
				done();
			} );

			row.setSelected( true );
		} );

		it( 'should trigger "toggle:selected" event even if the silent flag is set to true', function( done ) {
			var row = new App.Jobs.JobRow( {
				selected: false
			} );

			row.on( 'toggle:selected', function( selected ) {
				expect( selected ).to.be.true();
				done();
			} );

			row.setSelected( true, true );
		} );

		it( 'should trigger "change:selected" event', function( done ) {
			var row = new App.Jobs.JobRow( {
				selected: false
			} );

			row.on( 'change:selected', function( selected ) {
				expect( selected ).to.be.true();
				done();
			} );

			row.setSelected( true );
		} );

		it( 'shouldn\'t trigger "change:selected" event if the silent flag is set to true', function() {
			var row = new App.Jobs.JobRow( {
				selected: false
			} );

			row.on( 'change:selected', function() {
				throw new Error( '"change:selected" handler should never be called' );
			} );

			row.setSelected( true, true );
		} );
	} );

	describe( 'JobRowView', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow()
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should have a default class name - "job"', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1
				} )
			} );

			view.render();

			expect( view.$el.hasClass( 'job' ) ).to.be.true();
		} );

		it( 'should have a default tag name - "TR"', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1
				} )
			} );

			view.render();

			expect( view.el.tagName ).to.equal( 'TR' );
		} );

		it( 'should use "#job-row" template', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1,
					description: 'foo'
				} )
			} );

			view.render();

			var td = view.$el.find( 'td' );

			expect( td.eq( 1 ).text() ).to.equal( '1' );
			expect( td.eq( 2 ).text() ).to.equal( 'foo' );
		} );

		it( 'should use common template helpers', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1
				} )
			} );

			expect( view.templateHelpers ).to.equal( App.Common.templateHelpers );
		} );

		it( 'should create bindings to UI elements', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1
				} )
			} );

			view.render();

			expect( view.ui.checkbox ).to.have.length( 1 );

			var checkbox = view.ui.checkbox.eq( 0 )[ 0 ];

			expect( checkbox.tagName ).to.equal( 'INPUT' );
			expect( checkbox.type ).to.equal( 'checkbox' );
		} );

		it( 'should call "changeSelected()" on a checkbox\'s change', function() {
			var stub = sandbox.stub( App.Jobs.JobRowView.prototype, 'changeSelected' ),
				view = new App.Jobs.JobRowView( {
					model: new App.Jobs.JobRow( {
						id: 1
					} )
				} );

			view.render();

			view.ui.checkbox.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should listen to the model\'s toggle:selected event to update the checkbox', function() {
			var stub = sandbox.stub( App.Jobs.JobRowView.prototype, 'updateSelected' ),
				model = new App.Jobs.JobRow( {
					id: 1
				} ),
				view = new App.Jobs.JobRowView( {
					model: model
				} );

			view.render();

			model.setSelected( true );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( true ) ).to.be.true();
		} );

		it( 'should update the model\'s "selected" attribute to the checkbox\'s state', function() {
			var model = new App.Jobs.JobRow( {
					id: 1,
					selected: false
				} ),
				view = new App.Jobs.JobRowView( {
					model: model
				} );

			view.render();

			view.ui.checkbox.prop( 'checked', true );

			view.changeSelected();

			expect( model.get( 'selected' ) ).to.be.true();

			view.ui.checkbox.prop( 'checked', false );

			view.changeSelected();

			expect( model.get( 'selected' ) ).to.be.false();
		} );

		it( 'should set the checkbox state', function() {
			var view = new App.Jobs.JobRowView( {
				model: new App.Jobs.JobRow( {
					id: 1
				} )
			} );

			view.render();

			expect( view.ui.checkbox.prop( 'checked' ) ).to.be.false();

			view.updateSelected( true );

			expect( view.ui.checkbox.prop( 'checked' ) ).to.be.true();
		} );
	} );

	describe( 'JobList', function() {
		var sandbox, requests, xhr;

		beforeEach( function() {
			sandbox = sinon.sandbox.create();
			xhr = sinon.useFakeXMLHttpRequest();

			requests = [];

			xhr.onCreate = function( req ) {
				requests.push( req );
			};
		} );

		afterEach( function() {
			xhr.restore();
			sandbox.restore();
		} );

		it( 'should inherit from Backbone.Collection', function() {
			var list = new App.Jobs.JobList();

			expect( list ).to.be.instanceof( Backbone.Collection );
		} );

		it( 'should use Jobs.JobRow class for models', function() {
			var list = new App.Jobs.JobList( [ {
				id: 1
			} ] );

			expect( list.at( 0 ) ).to.be.instanceof( App.Jobs.JobRow );
		} );

		it( 'should fetch data from /jobs URL', function() {
			var list = new App.Jobs.JobList();

			list.fetch();

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				job: [ {
					id: 1,
					description: 'foo'
				}, {
					id: 2,
					description: 'bar'
				}, {
					id: 3,
					description: 'baz'
				} ]
			} ) );

			expect( list ).to.have.length( 3 );
		} );

		it( 'should sort newly added models by the created date', function() {
			var list = new App.Jobs.JobList(),
				t = Date.now();

			list.add( {
				id: 1,
				created: t
			} );

			list.add( {
				id: 2,
				created: t - 1000
			} );

			list.add( {
				id: 3,
				created: t
			} );

			list.add( {
				id: 4,
				created: t + 1000
			} );

			expect( list.map( function( model ) {
				return model.id;
			} ) ).to.deep.equal( [ 4, 1, 3, 2 ] );
		} );

		it( 'should sort response data by the created date', function() {
			var list = new App.Jobs.JobList(),
				t1 = Date.now() - 1000,
				t2 = Date.now(),
				t3 = Date.now() + 1000,
				data = {
					job: [ {
						id: 1,
						created: t1
					}, {
						id: 2,
						created: t1
					}, {
						id: 3,
						created: t3
					}, {
						id: 4,
						created: t2
					} ]
				};

			expect( list.parse( data ) ).to.deep.equal( [ {
				id: 3,
				created: t3
			}, {
				id: 4,
				created: t2
			}, {
				id: 1,
				created: t1
			}, {
				id: 2,
				created: t1
			} ] );
		} );

		it( 'should set all models\' selected attribute', function() {
			var list = new App.Jobs.JobList( [ {
				id: 1,
				selected: false
			}, {
				id: 2,
				selected: true
			}, {
				id: 3,
				selected: false
			}, {
				id: 4,
				selected: false
			} ] );

			list.toggleSelectJobs( true );

			list.forEach( function( model ) {
				expect( model.get( 'selected' ) ).to.be.true();
			} );

			list.toggleSelectJobs( false );

			list.forEach( function( model ) {
				expect( model.get( 'selected' ) ).to.be.false();
			} );
		} );
	} );

	describe( 'NoJobsView', function() {
		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Jobs.NoJobsView();

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#no-jobs" template', function() {
			var view = new App.Jobs.NoJobsView();

			view.render();

			var td = view.$el.find( 'td' );

			expect( td ).to.have.length( 1 );

			expect( td.eq( 0 ).text() ).to.equal( 'No jobs' );
		} );

		it( 'should use a default tag name - "TR"', function() {
			var view = new App.Jobs.NoJobsView();

			view.render();

			expect( view.el.tagName ).to.equal( 'TR' );
		} );
	} );

	describe( 'JobListHeaderView', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#job-list-header" template', function() {
			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			var button = view.$el.find( 'button' );

			expect( button ).to.have.length( 1 );

			expect( button.eq( 0 ).text() ).to.equal( 'Remove' );
		} );

		it( 'should have default class names - row, job-list-header', function() {
			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			expect( view.$el.hasClass( 'row' ) ).to.be.true();
			expect( view.$el.hasClass( 'job-list-header' ) ).to.be.true();
		} );

		it( 'should use common template helpers', function() {
			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			expect( view.templateHelpers ).to.equal( App.Common.templateHelpers );
		} );

		it( 'should create bindings to UI elements', function() {
			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			expect( view.ui.removeButton ).to.have.length( 1 );
			expect( view.ui.removeButton.eq( 0 ).text() ).to.equal( 'Remove' );
		} );

		it( 'should update the remove button on the collection\'s "toggle:selected" event', function() {
			var stub = sandbox.stub( App.Jobs.JobListHeaderView.prototype, 'updateRemoveButton' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListHeaderView( {
					collection: collection
				} );

			view.render();

			collection.trigger( 'toggle:selected' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should update the remove button on the collection\'s "sync" event', function() {
			var stub = sandbox.stub( App.Jobs.JobListHeaderView.prototype, 'updateRemoveButton' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListHeaderView( {
					collection: collection
				} );

			view.render();

			collection.trigger( 'sync' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should remove selected items on the remove button click', function() {
			var stub = sandbox.stub();

			App.Jobs.controller = {
				removeSelectedJobs: stub
			};

			var view = new App.Jobs.JobListHeaderView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			view.ui.removeButton.click();

			delete App.Jobs.controller;

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should disable the remove button if any of collection items is not selected', function() {
			var collection = new App.Jobs.JobList( [ {
					id: 1
				}, {
					id: 2
				}, {
					id: 3
				} ] ),
				view = new App.Jobs.JobListHeaderView( {
					collection: collection
				} );

			view.render();

			expect( view.ui.removeButton.prop( 'disabled' ) ).to.be.false();

			view.updateRemoveButton();

			expect( view.ui.removeButton.prop( 'disabled' ) ).to.be.true();

			collection.forEach( function( model ) {
				model.setSelected( true, true );
			} );

			expect( view.ui.removeButton.prop( 'disabled' ) ).to.be.false();
		} );
	} );
} );
