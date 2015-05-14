/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Browsers module
 */

/*global App, _ */

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

		it( 'should include Common.DeferredFetchMixin', function() {
			var list = new App.Jobs.JobList();

			expect( list.deferredFetch ).to.be.null();
			expect( list.fetchDelay ).to.be.a( 'number' );
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

	describe( 'JobListView', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Jobs.controller = _.extend( {}, Backbone.Events );
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Jobs.controller;
		} );

		it( 'should inherit from Common.TableView', function() {
			var view = new App.Jobs.JobListView( {
				collection: new App.Jobs.JobList()
			} );

			expect( view ).to.be.instanceof( App.Common.TableView );
		} );

		it( 'should use "#jobs" template', function() {
			var view = new App.Jobs.JobListView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			var th = view.$el.find( 'th' );

			expect( th.eq( 1 ).text() ).to.equal( 'ID' );
			expect( th.eq( 2 ).text() ).to.equal( 'Description' );
		} );

		it( 'should use Jobs.JobRowView class for items\' views', function() {
			var view = new App.Jobs.JobListView( {
				collection: new App.Jobs.JobList( [ {
					id: 1,
					description: 'foo'
				} ] )
			} );

			view.render();

			expect( view.children.findByIndex( 0 ) ).to.be.instanceof( App.Jobs.JobRowView );
		} );

		it( 'should use Jobs.NoJobsView view when there are no items in the collection', function() {
			var view = new App.Jobs.JobListView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			expect( view.children.findByIndex( 0 ) ).to.be.instanceof( App.Jobs.NoJobsView );
		} );

		it( 'should create UI element bindings', function() {
			var view = new App.Jobs.JobListView( {
				collection: new App.Jobs.JobList()
			} );

			view.render();

			expect( view.ui.selectAll ).to.have.length( 1 );

			var input = view.ui.selectAll.eq( 0 )[ 0 ];

			expect( input.tagName ).to.equal( 'INPUT' );
			expect( input.type ).to.equal( 'checkbox' );
		} );

		it( 'should toggle select all items on the checkbox change', function() {
			var stub = sandbox.stub( App.Jobs.JobList.prototype, 'toggleSelectJobs' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			view.render();

			view.ui.selectAll.prop( 'checked', true );
			view.ui.selectAll.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.args[ 0 ][ 0 ] ).to.be.true();
		} );

		it( 'should re-render on the collection change', function() {
			var stub = sandbox.stub( App.Jobs.JobListView.prototype, 'render' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			collection.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should update the checkbox on any "selected" change', function() {
			var stub = sandbox.stub( App.Jobs.JobListView.prototype, 'updateSelectAllCheckbox' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			view.render();

			collection.trigger( 'change:selected' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should re-fetch the collection on "job:update" event', function() {
			var stub = sandbox.stub( App.Jobs.JobList.prototype, 'fetch' ),
				collection = new App.Jobs.JobList(),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			view.render();

			App.Jobs.controller.trigger( 'job:update' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should toggle select all jobs in the collection', function() {
			var collection = new App.Jobs.JobList( [ {
					id: 1,
					description: 'foo'
				}, {
					id: 2,
					description: 'bar'
				}, {
					id: 3,
					description: 'baz'
				} ] ),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			collection.each( function( model ) {
				expect( model.get( 'selected' ) ).to.be.false();
			} );

			view.render();

			view.ui.selectAll.prop( 'checked', true );

			var e = {
				target: view.ui.selectAll[ 0 ]
			};

			view.toggleSelectAllJobs( e );

			collection.each( function( model ) {
				expect( model.get( 'selected' ) ).to.be.true();
			} );
		} );

		it( 'should check the "select all" checkbox if all the jobs in the collection are selected', function() {
			var collection = new App.Jobs.JobList( [ {
					id: 1,
					description: 'foo'
				}, {
					id: 2,
					description: 'bar'
				}, {
					id: 3,
					description: 'baz'
				} ] ),
				view = new App.Jobs.JobListView( {
					collection: collection
				} );

			view.render();

			expect( view.ui.selectAll.prop( 'checked' ) ).to.be.false();

			collection.each( function( model ) {
				model.setSelected( true, true );
			} );

			view.updateSelectAllCheckbox();

			expect( view.ui.selectAll.prop( 'checked' ) ).to.be.true();
		} );
	} );

	describe( 'Job', function() {
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

		it( 'should inherit from Backbone.Model', function() {
			var job = new App.Jobs.Job();

			expect( job ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should include Common.DeferredFetchMixin', function() {
			var job = new App.Jobs.Job();

			expect( job.deferredFetch ).to.be.null();
			expect( job.fetchDelay ).to.be.a( 'number' );
		} );

		it( 'should instantiate with default attributes', function() {
			var job = new App.Jobs.Job();

			expect( job.toJSON() ).to.deep.equal( {
				browsers: [],
				coverage: false,
				created: 0,
				done: false,
				description: '',
				filter: [],
				id: '',
				results: [],
				snapshot: false,
				tasks: [],
				tempBrowsers: []
			} );
		} );

		it( 'should fetch the data from "/jobs/<jobID>" URL', function() {
			var job = new App.Jobs.Job( {
				id: 12345
			} );

			job.fetch();

			expect( requests ).to.have.length( 1 );
			expect( requests[ 0 ].url ).to.equal( '/jobs/12345' );

			var data = {
				browsers: [ 'chrome', 'firefox' ],
				coverage: false,
				created: Date.now(),
				done: false,
				description: 'Foo',
				filter: [],
				id: 12345,
				results: [],
				snapshot: false,
				tasks: [],
				tempBrowsers: []
			};

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( data ) );

			expect( job.toJSON() ).to.deep.equal( data );
		} );

		it( 'should validate job and not trigger if everything is fine', function() {
			var job = new App.Jobs.Job( {
				id: 12345,
				browsers: [ 'chrome', 'firefox' ]
			} );

			job.on( 'invalid', function() {
				throw new Error( 'Invalid event shouldn\'t be triggered.' );
			} );

			job.save();

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: 12345
			} ) );
		} );

		it( 'should validate job data and trigger "invalid" event if there are no browsers', function( done ) {
			var job = new App.Jobs.Job( {
				id: 12345
			} );

			job.on( 'invalid', function( model, err ) {
				expect( err ).to.equal( 'No browsers specified for the job' );
				done();
			} );

			job.save();
		} );
	} );

	describe( 'TaskView', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Jobs.controller = {
				showTaskErrors: function() {}
			};
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Jobs.controller;
		} );

		var task = new Backbone.Model( {
				id: 'foo',
				failed: false,
				results: [ {
					name: 'chrome',
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0',
					errors: null
				}, {
					name: 'firefox',
					testedUA: 'Firefox 37.0.0 / Ubuntu 0.0.0',
					errors: null
				} ]
			} ),
			taskFailed = new Backbone.Model( {
				id: 'bar',
				failed: true,
				results: [ {
					name: 'chrome',
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0',
					errors: null
				}, {
					name: 'firefox',
					testedUA: 'Firefox 37.0.0 / Ubuntu 0.0.0',
					errors: [ {
						name: 'should do bar',
						error: 'Assertion Error: doesn\'t do "bar".'
					} ]
				} ]
			} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Jobs.TaskView( {
				model: task
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#task" template', function() {
			var view = new App.Jobs.TaskView( {
				model: task
			} );

			view.render();

			var td = view.$el.find( 'td' );

			expect( td ).to.have.length( 2 );
			expect( td.eq( 0 ).text() ).to.equal( 'foo' );
			expect( td.eq( 1 ).find( 'div' ) ).to.have.length( 2 );
		} );

		it( 'should use a default tag name - "TR"', function() {
			var view = new App.Jobs.TaskView( {
				model: task
			} );

			view.render();

			expect( view.el.tagName ).to.equal( 'TR' );
		} );

		it( 'should use a default class name - "task"', function() {
			var view = new App.Jobs.TaskView( {
				model: task
			} );

			view.render();

			expect( view.$el.hasClass( 'task' ) ).to.be.true();
		} );

		it( 'should use Common.templateHelpers', function() {
			var view = new App.Jobs.TaskView( {
				model: task
			} );

			expect( view.templateHelpers ).to.equal( App.Common.templateHelpers );
		} );

		it( 'should show errors on a click on ".clickable" element', function() {
			var stub = sandbox.stub( App.Jobs.TaskView.prototype, 'showErrors' ),
				view = new App.Jobs.TaskView( {
					model: taskFailed
				} );

			view.render();

			var clickable = view.$el.find( '.clickable' );

			expect( clickable ).to.have.length( 1 );

			clickable.click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should add "failed" class to the element for a failed task', function() {
			var view = new App.Jobs.TaskView( {
				model: taskFailed
			} );

			view.render();

			expect( view.$el.hasClass( 'failed' ) ).to.be.true();
		} );

		it( 'shouldn\'t try to show errors if there aren\'t any', function() {
			var stub = sandbox.stub( App.Jobs.controller, 'showTaskErrors' ),
				view = new App.Jobs.TaskView( {
					model: task
				} );

			view.render();

			view.showErrors( {} );

			expect( stub.called ).to.be.false();
		} );

		it( 'should show errors for a failed result', function() {
			var stub = sandbox.stub( App.Jobs.controller, 'showTaskErrors' ),
				view = new App.Jobs.TaskView( {
					model: taskFailed
				} );

			view.render();

			var el = view.$el.find( '.clickable' )[ 0 ];

			view.showErrors( {
				currentTarget: el
			} );

			expect( stub.called ).to.be.true();

			var arg = stub.args[ 0 ][ 0 ];

			expect( arg ).to.be.instanceof( Backbone.Model );

			expect( arg.toJSON() ).to.deep.equal( {
				errors: [ {
					error: 'Assertion Error: doesn\'t do "bar".',
					name: 'should do bar'
				} ],
				id: 'bar',
				name: 'firefox',
				testedUA: 'Firefox 37.0.0 / Ubuntu 0.0.0'
			} );
		} );
	} );

	describe( 'JobHeaderView', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Jobs.controller = {
				removeJob: function() {},
				restartJob: function() {},
				editJob: function() {}
			};
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Jobs.controller;
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Jobs.JobHeaderView( {
				model: new App.Jobs.Job()
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use common template helpers', function() {
			var view = new App.Jobs.JobHeaderView( {
				model: new App.Jobs.Job()
			} );

			expect( view.templateHelpers ).to.equal( App.Common.templateHelpers );
		} );

		it( 'should create bindings for UI elements', function() {
			var view = new App.Jobs.JobHeaderView( {
				model: new App.Jobs.Job()
			} );

			view.render();

			expect( view.ui.all ).to.have.length( 1 );
			expect( view.ui.all.eq( 0 )[ 0 ].tagName ).to.equal( 'INPUT' );

			expect( view.ui.failed ).to.have.length( 1 );
			expect( view.ui.failed.eq( 0 )[ 0 ].tagName ).to.equal( 'INPUT' );
		} );

		it( 'should remove a job after clicking on "Remove" button', function() {
			var stub = sandbox.stub( App.Jobs.JobHeaderView.prototype, 'removeJob' ),
				view = new App.Jobs.JobHeaderView( {
					model: new App.Jobs.Job()
				} );

			view.render();

			view.$el.find( '.remove-button' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should restart a job after clicking on "Restart" button', function() {
			var stub = sandbox.stub( App.Jobs.JobHeaderView.prototype, 'restartJob' ),
				view = new App.Jobs.JobHeaderView( {
					model: new App.Jobs.Job()
				} );

			view.render();

			view.$el.find( '.restart-button' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should edit a job after clicking on "Edit" button', function() {
			var stub = sandbox.stub( App.Jobs.JobHeaderView.prototype, 'editJob' ),
				view = new App.Jobs.JobHeaderView( {
					model: new App.Jobs.Job()
				} );

			view.render();

			view.$el.find( '.edit-button' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should filter results after switching show all/failed radio', function() {
			var stub = sandbox.stub( App.Jobs.JobHeaderView.prototype, 'filterFailed' ),
				view = new App.Jobs.JobHeaderView( {
					model: new App.Jobs.Job()
				} );

			view.render();

			view.ui.all.trigger( 'change' );
			view.ui.failed.trigger( 'change' );

			expect( stub.calledTwice ).to.be.true();
		} );

		it( 'should re-render on model changes', function() {
			var stub = sandbox.stub( App.Jobs.JobHeaderView.prototype, 'render' ),
				model = new App.Jobs.Job();

			new App.Jobs.JobHeaderView( {
				model: model
			} );

			model.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should set a model\'s onlyFailed to false on init', function() {
			var model = new App.Jobs.Job( {
				onlyFailed: true
			} );

			new App.Jobs.JobHeaderView( {
				model: model
			} );

			expect( model.get( 'onlyFailed' ) ).to.be.false();
		} );

		it( 'should trigger App#header:resize event on render', function() {
			var view = new App.Jobs.JobHeaderView( {
				model: new App.Jobs.Job()
			} );

			var spy = sinon.spy();

			App.on( 'header:resize', spy );

			view.render();

			App.off( 'header:resize', spy );

			expect( spy.calledOnce ).to.be.true();
		} );

		it( 'should remove a job', function() {
			var spy = sandbox.spy( App.Jobs.controller, 'removeJob' ),
				model = new App.Jobs.Job(),
				view = new App.Jobs.JobHeaderView( {
					model: model
				} );

			view.removeJob();

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( model ) ).to.be.true();
		} );

		it( 'should restart a job', function() {
			var spy = sandbox.spy( App.Jobs.controller, 'restartJob' ),
				model = new App.Jobs.Job(),
				view = new App.Jobs.JobHeaderView( {
					model: model
				} );

			view.restartJob();

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( model ) ).to.be.true();
		} );

		it( 'should edit a job', function() {
			var spy = sandbox.spy( App.Jobs.controller, 'editJob' ),
				model = new App.Jobs.Job(),
				view = new App.Jobs.JobHeaderView( {
					model: model
				} );

			view.editJob();

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( model ) ).to.be.true();
		} );

		it( 'should filter toggle filter failed tests', function() {
			var model = new App.Jobs.Job( {
					onlyFailed: true
				} ),
				view = new App.Jobs.JobHeaderView( {
					model: model
				} );

			view.render();
			view.ui.all.prop( 'checked', true );
			view.filterFailed();

			expect( model.get( 'onlyFailed' ) ).to.be.false();

			view.ui.all.prop( 'checked', false );
			view.ui.failed.prop( 'checked', true );
			view.filterFailed();

			expect( model.get( 'onlyFailed' ) ).to.be.true();
		} );
	} );

	describe( 'JobView', function() {
		var sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Jobs.controller = _.extend( {
				showError: function() {}
			}, Backbone.Events );
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Jobs.controller;
		} );

		var testJob = {
			browsers: [ 'chrome', 'firefox' ],
			coverage: false,
			created: Date.now(),
			description: 'foo',
			filter: [ 'is:unit' ],
			snapshot: false,
			done: false,
			tasks: [ {
				id: 'foo',
				results: [ {
					name: 'chrome',
					version: 0,
					status: 2,
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0'
				}, {
					name: 'firefox',
					version: 0,
					status: 0
				} ],
				failed: false
			}, {
				id: 'bar',
				results: [ {
					name: 'chrome',
					version: 0,
					status: 2,
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0'
				}, {
					name: 'firefox',
					version: 0,
					jobId: 'nX1Jk10DUtCcH7Wd',
					status: 0
				} ],
				failed: false
			}, {
				id: 'baz',
				results: [ {
					name: 'chrome',
					version: 0,
					status: 2,
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0'
				}, {
					name: 'firefox',
					version: 0,
					jobId: 'nX1Jk10DUtCcH7Wd',
					status: 0
				} ],
				failed: false
			} ],
			id: 'nX1Jk10DUtCcH7Wd',
			results: [ {
				name: 'chrome',
				version: 0,
				status: 2,
				testedUA: 'Chrome 42.0.2311 / Linux 0.0.0'
			}, {
				name: 'firefox',
				version: 0,
				status: 0
			} ]
		};

		it( 'should inherit from Common.TableView', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			expect( view ).to.be.instanceof( App.Common.TableView );
		} );

		it( 'should use "#job" template', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			expect( view.$el.find( 'th' ).eq( 0 ).text() ).to.equal( 'ID' );
			expect( view.$el.find( 'th' ).eq( 1 ).text() ).to.equal( '' );
			expect( view.$el.find( 'tbody' ) ).to.have.length( 1 );
		} );

		it( 'should have default class names - panel, panel-default', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			expect( view.$el.hasClass( 'panel' ) ).to.be.true();
			expect( view.$el.hasClass( 'panel-default' ) ).to.be.true();
		} );

		it( 'should use common template helpers', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			expect( view.templateHelpers ).to.equal( App.Common.templateHelpers );
		} );

		it( 'should use Jobs.TaskView class for result views', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job( testJob )
			} );

			expect( view.children ).to.have.length.above( 0 );
			expect( view.children.findByIndex( 0 ) ).to.be.instanceof( App.Jobs.TaskView );
		} );

		it( 'should create a collection during initialization and fill it with a model\'s tasks', function() {
			var model = new App.Jobs.Job( testJob ),
				view = new App.Jobs.JobView( {
					model: model
				} );

			expect( view.collection ).to.be.instanceof( Backbone.Collection );
			expect( view.collection.length ).to.equal( model.get( 'tasks' ).length );
		} );

		it( 'should update on model changes', function() {
			var stub = sandbox.stub( App.Jobs.JobView.prototype, 'update' ),
				model = new App.Jobs.Job();

			new App.Jobs.JobView( {
				model: model
			} );

			expect( stub.calledOnce ).to.be.true();

			model.trigger( 'change' );

			expect( stub.calledTwice ).to.be.true();
		} );

		it( 'should show an error page on model errors', function() {
			var stub = sandbox.stub( App.Jobs.controller, 'showError' ),
				model = new App.Jobs.Job();

			new App.Jobs.JobView( {
				model: model
			} );

			model.trigger( 'error', model, {
				status: 404,
				responseText: 'Not Found'
			} );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should re-fetch the model on "job:update" event when a jobID matches', function() {
			var stub = sandbox.stub( App.Jobs.Job.prototype, 'fetch' ),
				model = new App.Jobs.Job( testJob );

			new App.Jobs.JobView( {
				model: model
			} );

			App.Jobs.controller.trigger( 'job:update', model.get( 'id' ) );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'shouldn\'t re-fetch the model on "job:update" event when a jobID doesn\'t match', function() {
			var stub = sandbox.stub( App.Jobs.Job.prototype, 'fetch' ),
				model = new App.Jobs.Job( testJob );

			new App.Jobs.JobView( {
				model: model
			} );

			App.Jobs.controller.trigger( 'job:update', 'unknown' );

			expect( stub.called ).to.be.false();
		} );

		it( 'should render during initialization', function() {
			var view = new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			expect( view.isRendered ).to.be.true();
		} );

		it( 'should trigger App#header:update on update', function() {
			var spy = sandbox.spy();

			App.on( 'header:update', spy );

			new App.Jobs.JobView( {
				model: new App.Jobs.Job()
			} );

			App.off( 'header:update', spy );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( true ) ).to.be.true();
		} );
	} );

	describe( 'EditJobView', function() {
		var sandbox = sinon.sandbox.create(),
			requests,
			xhr;

		beforeEach( function() {
			App.Browsers = {
				browserList: new Backbone.Collection( [ {
					id: 'chrome',
					name: 'chrome',
					clients: [ {
						browser: 'chrome',
						version: 42,
						id: 'edfed367-5e46-4162-9cdc-a2331011c665',
						mode: 'unit',
						name: '',
						header: false
					} ],
					version: 0,
					header: true
				}, {
					browser: 'chrome',
					version: 42,
					id: 'edfed367-5e46-4162-9cdc-a2331011c665',
					mode: 'unit',
					name: '',
					header: false
				}, {
					id: 'firefox',
					name: 'firefox',
					clients: [ {
						browser: 'firefox',
						version: 37,
						id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
						mode: 'unit',
						name: '',
						header: false
					} ],
					version: 0,
					header: true
				}, {
					browser: 'firefox',
					version: 37,
					id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
					mode: 'unit',
					name: '',
					header: false
				}, {
					id: 'ie11',
					name: 'ie',
					clients: [],
					version: 11,
					header: true
				}, {
					id: 'safari',
					name: 'safari',
					clients: [],
					version: 0,
					header: true
				} ] )
			};

			App.Alerts = {
				controller: {
					add: function() {}
				}
			};

			xhr = sinon.useFakeXMLHttpRequest();
			requests = [];

			xhr.onCreate = function( req ) {
				requests.push( req );
			};
		} );

		afterEach( function() {
			sandbox.restore();
			xhr.restore();
			delete App.Alerts;
			delete App.Browsers;
		} );

		it( 'should inherit from Common.ModalView', function() {
			var view = new App.Jobs.EditJobView( {
				model: new App.Jobs.Job()
			} );

			expect( view ).to.be.instanceof( App.Common.ModalView );
		} );

		it( 'should use #edit-job template', function() {
			var view = new App.Jobs.EditJobView( {
				model: new App.Jobs.Job( {
					id: 'foo'
				} )
			} );

			view.render();

			expect( view.$el.find( 'h4' ).text() ).to.match( /Edit job: foo/ );
		} );

		it( 'should create UI bindings', function() {
			var view = new App.Jobs.EditJobView( {
				model: new App.Jobs.Job( {
					id: 'foo'
				} )
			} );

			view.render();

			expect( view.ui.browsers ).to.have.length( 1 );
			expect( view.ui.browsers.eq( 0 )[ 0 ].tagName ).to.equal( 'SELECT' );
			expect( view.ui.description ).to.have.length( 1 );
			expect( view.ui.description.eq( 0 )[ 0 ].tagName ).to.equal( 'INPUT' );
			expect( view.ui.save ).to.have.length( 1 );
			expect( view.ui.save.eq( 0 )[ 0 ].tagName ).to.equal( 'BUTTON' );
		} );

		it( 'should update browsers on a browsers input change', function() {
			var stub = sandbox.stub( App.Jobs.EditJobView.prototype, 'updateBrowsers' ),
				view = new App.Jobs.EditJobView( {
					model: new App.Jobs.Job( {
						id: 'foo'
					} )
				} );

			view.render();

			view.ui.browsers.trigger( 'change' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should save a job after clicking on "Save" button', function() {
			var stub = sandbox.stub( App.Jobs.EditJobView.prototype, 'saveJob' ),
				view = new App.Jobs.EditJobView( {
					model: new App.Jobs.Job( {
						id: 'foo'
					} )
				} );

			view.render();

			view.ui.save.click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should add captured browsers after clicking on "Add captured" button', function() {
			var stub = sandbox.stub( App.Jobs.EditJobView.prototype, 'addCaptured' ),
				view = new App.Jobs.EditJobView( {
					model: new App.Jobs.Job( {
						id: 'foo'
					} )
				} );

			view.render();

			view.$el.find( '.add-captured-button' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should add all browsers after clicking on "Add all" button', function() {
			var stub = sandbox.stub( App.Jobs.EditJobView.prototype, 'addAll' ),
				view = new App.Jobs.EditJobView( {
					model: new App.Jobs.Job( {
						id: 'foo'
					} )
				} );

			view.render();

			view.$el.find( '.add-all-button' ).click();

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should find a browser using templateHelpers.findBrowser', function() {
			var browsersA = [ 'Chrome', 'Firefox', 'Safari' ],
				browsersB = [ 'Chrome', 'Safari', 'IE' ];

			var find = App.Jobs.EditJobView.prototype.templateHelpers.findBrowser;

			expect( find( browsersA, 'Firefox' ) ).to.be.true();
			expect( find( browsersA, 'firefox' ) ).to.be.true();
			expect( find( browsersB, 'Firefox' ) ).to.be.false();
			expect( find( browsersB, 'firefox' ) ).to.be.false();
		} );

		it( 'should show an error on model\'s "invalid" event', function() {
			var stub = sandbox.stub( App.Jobs.EditJobView.prototype, 'showValidationError' ),
				model = new App.Jobs.Job( {
					id: 'foo'
				} );

			new App.Jobs.EditJobView( {
				model: model
			} );

			model.trigger( 'invalid' );

			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should store current model browsers in the tempBrowsers attribute', function() {
			var model = new App.Jobs.Job( {
				id: 'foo',
				browsers: [ 'chrome', 'firefox' ]
			} );

			new App.Jobs.EditJobView( {
				model: model
			} );

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'chrome', 'firefox' ] );
		} );

		it( 'should convert a browsers input to a "Chosen" component on render', function() {
			var view = new App.Jobs.EditJobView( {
				model: new App.Jobs.Job( {
					id: 'foo'
				} )
			} );

			view.render();

			expect( view.ui.browsers.data( 'chosen' ) ).to.be.ok();
		} );

		it( 'should update a list of selected browsers', function() {
			var model = new App.Jobs.Job( {
					id: 'foo',
					browsers: [ 'chrome', 'firefox', 'ie11', 'opera', 'safari' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.updateBrowsers( {}, {} );

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( model.get( 'browsers' ) );

			view.updateBrowsers( {}, {
				deselected: 'chrome'
			} );

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'firefox', 'ie11', 'opera', 'safari' ] );

			view.updateBrowsers( {}, {
				selected: 'chrome'
			} );

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'firefox', 'ie11', 'opera', 'safari', 'chrome' ] );
		} );

		it( 'should add captured browsers to the browsers list', function() {
			var model = new App.Jobs.Job( {
					id: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'ie11' ] );

			view.addCaptured();

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'ie11', 'chrome', 'firefox' ] );
		} );

		it( 'should add all browsers to the browsers list', function() {
			var model = new App.Jobs.Job( {
					id: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'ie11' ] );

			view.addAll();

			expect( model.get( 'tempBrowsers' ) ).to.deep.equal( [ 'chrome', 'firefox', 'ie11', 'safari' ] );
		} );

		it( 'should show a model validation error', function() {
			var stub = sandbox.stub( App.Alerts.controller, 'add' ),
				model = new App.Jobs.Job( {
					id: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			view.showValidationError( model, 'validation error' );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( 'danger', 'validation error', 'Error:' ) ).to.be.true();
		} );

		it( 'should save an edited job', function() {
			var stub = sandbox.stub( App.Jobs.Job.prototype, 'fetch' ),
				spy = sandbox.spy( App.Alerts.controller, 'add' ),
				model = new App.Jobs.Job( {
					id: 'foo',
					description: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			model.set( 'tempBrowsers', [ 'ie11', 'chrome', 'safari' ], {
				silent: true
			} );

			view.ui.description.val( '    bar   ' );

			view.saveJob( {
				stopPropagation: function() {}
			} );

			expect( model.get( 'description' ) ).to.equal( 'bar' );
			expect( model.get( 'browsers' ) ).to.deep.equal( [ 'ie11', 'chrome', 'safari' ] );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: 'foo'
			} ) );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( 'success', 'Job saved.', 'Success!' ) ).to.be.true();

			expect( view.isRendered ).to.be.false();
			expect( view.isDestroyed ).to.be.true();
			expect( stub.calledOnce ).to.be.true();
		} );

		it( 'should show a notification on errors while saving an edited job', function() {
			var spy = sandbox.spy( App.Alerts.controller, 'add' ),
				model = new App.Jobs.Job( {
					id: 'foo',
					description: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			model.set( 'tempBrowsers', [ 'ie11', 'chrome', 'safari' ], {
				silent: true
			} );

			view.ui.description.val( '    bar   ' );

			view.saveJob( {
				stopPropagation: function() {}
			} );

			expect( model.get( 'description' ) ).to.equal( 'bar' );
			expect( model.get( 'browsers' ) ).to.deep.equal( [ 'ie11', 'chrome', 'safari' ] );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 404, {
				'Content-Type': 'text/plain'
			}, 'Not found' );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( 'danger', 'Not found', 'Error!' ) ).to.be.true();

			expect( view.isRendered ).to.be.false();
			expect( view.isDestroyed ).to.be.true();
		} );

		it( 'should show a notification on errors while saving an edited job 2', function() {
			var spy = sandbox.spy( App.Alerts.controller, 'add' ),
				model = new App.Jobs.Job( {
					id: 'foo',
					description: 'foo',
					browsers: [ 'ie11' ]
				} ),
				view = new App.Jobs.EditJobView( {
					model: model
				} );

			view.render();

			model.set( 'tempBrowsers', [ 'ie11', 'chrome', 'safari' ], {
				silent: true
			} );

			view.ui.description.val( '    bar   ' );

			view.saveJob( {
				stopPropagation: function() {}
			} );

			expect( model.get( 'description' ) ).to.equal( 'bar' );
			expect( model.get( 'browsers' ) ).to.deep.equal( [ 'ie11', 'chrome', 'safari' ] );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 500, {
				'Content-Type': 'text/plain'
			}, 'Internal server error' );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( 'danger', 'Internal server error', 'Error!' ) ).to.be.true();

			expect( view.isRendered ).to.be.true();
		} );
	} );

	describe( 'Controller', function() {
		var sandbox = sinon.sandbox.create(),
			requests,
			xhr;

		beforeEach( function() {
			App.Sockets = {
				socket: _.extend( {}, Backbone.Events )
			};

			App.Alerts = {
				controller: {
					add: sandbox.spy()
				}
			};

			App.showError = sandbox.spy();
			App.showConfirmPopup = sandbox.spy();
			App.navigate = sandbox.spy();
			App.Jobs.controller = new App.Jobs.Controller();
			App.Jobs.jobList = new App.Jobs.JobList();

			xhr = sinon.useFakeXMLHttpRequest();
			requests = [];

			xhr.onCreate = function( req ) {
				requests.push( req );
			};
		} );

		afterEach( function() {
			sandbox.restore();
			xhr.restore();

			delete App.showConfirmPopup;
			delete App.Sockets;
			delete App.Alerts;
			delete App.Jobs.controller;
			delete App.Jobs.jobList;
		} );

		it( 'should bind to App.Sockets.socket#job:update event and re-emit it', function() {
			var spy = sandbox.spy();

			App.Jobs.controller.on( 'job:update', spy );
			App.Sockets.socket.trigger( 'job:update', 'foo' );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( 'foo' ) ).to.be.true();
		} );

		it( 'should show "Edit a job" modal', function() {
			var stub = sandbox.stub( App.modal, 'show' ),
				model = new App.Jobs.Job();

			App.Jobs.controller.editJob( model );

			expect( stub.calledOnce ).to.be.true();

			var view = stub.args[ 0 ][ 0 ];

			expect( view ).to.be.instanceof( App.Jobs.EditJobView );
			expect( view.model ).to.equal( model );
		} );

		it( 'should list jobs', function() {
			var headerStub = sandbox.stub( App.header, 'show' ),
				contentStub = sandbox.stub( App.content, 'show' ),
				fetchStub = sandbox.stub( App.Jobs.JobList.prototype, 'fetch' );

			App.Jobs.controller.listJobs();

			expect( headerStub.calledOnce ).to.be.true();

			var arg = headerStub.args[ 0 ][ 0 ];

			expect( arg ).to.be.instanceof( App.Jobs.JobListHeaderView );
			expect( arg.collection ).to.equal( App.Jobs.jobList );

			expect( contentStub.calledOnce ).to.be.true();

			arg = contentStub.args[ 0 ][ 0 ];

			expect( arg ).to.be.instanceof( App.Jobs.JobListView );
			expect( arg.collection ).to.equal( App.Jobs.jobList );

			expect( fetchStub.calledOnce ).to.be.true();

			arg = fetchStub.args[ 0 ][ 0 ];

			expect( arg ).to.deep.equal( {
				force: true,
				reset: true
			} );
		} );

		it( 'should remove a job', function() {
			var destroyStub = sandbox.stub( App.Jobs.Job.prototype, 'destroy' );

			App.Jobs.controller.removeJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to remove this job?' );
			expect( arg.callback ).to.be.a( 'function' );

			arg.callback();

			expect( destroyStub.calledOnce ).to.be.true();
		} );

		it( 'should show a success notification after removing a job', function() {
			App.Jobs.controller.removeJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: 'foo'
			} ) );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();

			expect( App.Alerts.controller.add.calledWith(
				'success',
				'Removed a job: <strong>foo</strong>',
				'Success!'
			) ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( true ) ).to.be.true();
			expect( App.navigate.calledOnce ).to.be.true();
			expect( App.navigate.calledWith( 'jobs' ) ).to.be.true();
		} );

		it( 'should show an error notification on remove error', function() {
			App.Jobs.controller.removeJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 404, {
				'Content-Type': 'text/plain'
			}, 'Not found' );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith( 'danger', 'Not found', 'Error!' ) ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( true ) ).to.be.true();

			expect( App.navigate.called ).to.be.false();
		} );

		it( 'should restart a job', function() {
			App.Jobs.controller.restartJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to restart this job?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );
			expect( requests[ 0 ].url ).to.equal( '/jobs/foo/restart' );
			expect( requests[ 0 ].method ).to.equal( 'GET' );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: 'foo'
			} ) );
		} );

		it( 'should show a success notification after restarting', function() {
			var fetchStub = sandbox.stub( App.Jobs.Job.prototype, 'fetch' );

			App.Jobs.controller.restartJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to restart this job?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: 'foo'
			} ) );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith(
				'success',
				'Restarted a job: <strong>foo</strong>',
				'Success!'
			) ).to.be.true();

			expect( fetchStub.calledOnce ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( true ) ).to.be.true();
		} );

		it( 'should show an error notification on restart errors', function() {
			App.Jobs.controller.restartJob( new App.Jobs.Job( {
				id: 'foo'
			} ) );

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to restart this job?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 404, {
				'Content-Type': 'text/plain'
			}, 'Not found' );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith( 'danger', 'Not found', 'Error!' ) ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( false ) ).to.be.true();
		} );

		it( 'shouldn\'t proceed if there\'s no selected jobx', function() {
			App.Jobs.controller.removeSelectedJobs();

			expect( App.showConfirmPopup.called ).to.be.false();

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith( 'danger', 'No jobs selected.', 'Error!' ) ).to.be.true();
		} );

		it( 'should remove selected jobs', function() {
			App.Jobs.jobList.add( [ {
				id: 'foo',
				selected: true
			}, {
				id: 'bar',
				selected: true
			}, {
				id: 'baz',
				selected: false
			} ] );

			App.Jobs.controller.removeSelectedJobs();

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to remove selected jobs?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );
			expect( requests[ 0 ].url ).to.equal( 'jobs/foo,bar' );
			expect( requests[ 0 ].method ).to.equal( 'DELETE' );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: [ 'foo', 'bar' ]
			} ) );
		} );

		it( 'should show a success notification after removing selected jobs', function() {
			App.Jobs.jobList.add( [ {
				id: 'foo',
				selected: true
			}, {
				id: 'bar',
				selected: true
			}, {
				id: 'baz',
				selected: false
			} ] );

			App.Jobs.controller.removeSelectedJobs();

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to remove selected jobs?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				success: true,
				id: [ 'foo', 'bar' ]
			} ) );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith(
				'success',
				'Removed jobs: <strong>foo, bar</strong>',
				'Success!'
			) ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( true ) ).to.be.true();
		} );

		it( 'should show an error notification on removal errors', function() {
			App.Jobs.jobList.add( [ {
				id: 'foo',
				selected: true
			}, {
				id: 'baz',
				selected: false
			} ] );

			App.Jobs.controller.removeSelectedJobs();

			expect( App.showConfirmPopup.calledOnce ).to.be.true();

			var arg = App.showConfirmPopup.args[ 0 ][ 0 ];

			expect( arg.message ).to.equal( 'Do you want to remove selected jobs?' );
			expect( arg.callback ).to.be.a( 'function' );

			var closeSpy = sandbox.spy();

			arg.callback( closeSpy );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 404, {
				'Content-Type': 'text/plain'
			}, 'Not found' );

			expect( App.Alerts.controller.add.calledOnce ).to.be.true();
			expect( App.Alerts.controller.add.calledWith( 'danger', 'Not found', 'Error!' ) ).to.be.true();

			expect( closeSpy.calledOnce ).to.be.true();
			expect( closeSpy.calledWith( false ) ).to.be.true();
		} );

		it( 'should show 404 error', function() {
			App.Jobs.controller.showError();

			expect( App.showError.calledOnce ).to.be.true();
		} );

		it( 'should show task errors', function() {
			var modalStub = sandbox.stub( App.modal, 'show' ),
				model = new Backbone.Model();

			App.Jobs.controller.showTaskErrors( model );

			expect( modalStub.calledOnce ).to.be.true();

			var arg = modalStub.args[ 0 ][ 0 ];

			expect( arg ).to.be.instanceof( App.Common.TestErrorsView );
			expect( arg.model ).to.equal( model );
		} );

		it( 'should show a job', function() {
			var headerSpy = sandbox.stub( App.header, 'show' ),
				contentSpy = sandbox.stub( App.content, 'show' ),
				id = 'foo';

			App.Jobs.controller.showJob( id );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 200, {
				'Content-Type': 'application/json'
			}, JSON.stringify( {
				browsers: [ 'chrome' ],
				description: '',
				tasks: [ {
					id: 'test-dashboard/jobs',
					results: [ {
						name: 'chrome',
						version: 0,
						status: 2,
						testedUA: 'Chrome 42.0.2311 / Linux 0.0.0',
						errors: null
					} ],
					failed: true
				} ],
				id: 'rbqBboaAWPGzuOxB',
				results: [ {
					name: 'chrome',
					version: 0,
					status: 2,
					testedUA: 'Chrome 42.0.2311 / Linux 0.0.0',
					errors: null
				} ]
			} ) );

			expect( headerSpy.calledOnce ).to.be.true();
			expect( headerSpy.args[ 0 ][ 0 ] ).to.be.instanceof( App.Jobs.JobHeaderView );

			expect( contentSpy.calledOnce ).to.be.true();
			expect( contentSpy.args[ 0 ][ 0 ] ).to.be.instanceof( App.Jobs.JobView );

			expect( headerSpy.args[ 0 ][ 0 ].model ).to.equal( contentSpy.args[ 0 ][ 0 ].model )
				.to.be.instanceof( App.Jobs.Job );
		} );

		it( 'should show an error page if a job wasn\'t found', function() {
			var stub = sandbox.stub( App.Jobs.Controller.prototype, 'showError' ),
				id = 'foo';

			App.Jobs.controller.showJob( id );

			expect( requests ).to.have.length( 1 );

			requests[ 0 ].respond( 404, {
				'Content-Type': 'text/plain'
			}, 'Not found' );

			expect( stub.calledOnce ).to.be.true();
			expect( stub.calledWith( 404, 'Not found' ) ).to.be.true();
		} );
	} );

	describe( 'onStart', function() {
		beforeEach( function() {
			App.Sockets = {
				socket: _.extend( {}, Backbone.Events )
			};

			App.Jobs.onStart();
		} );

		afterEach( function() {
			delete App.Sockets;
			delete App.Jobs.jobList;
			delete App.Jobs.controller;
			delete App.Jobs.jobRouter;
		} );

		it( 'should create an instance of Jobs.JobList', function() {
			expect( App.Jobs.jobList ).to.be.instanceof( App.Jobs.JobList );
		} );

		it( 'should create an instance of Jobs.Controller', function() {
			expect( App.Jobs.controller ).to.be.instanceof( App.Jobs.Controller );
		} );

		it( 'should create an instance of Jobs.JobRouter', function() {
			expect( App.Jobs.jobRouter ).to.be.instanceof( App.Jobs.JobRouter );
		} );
	} );
} );
