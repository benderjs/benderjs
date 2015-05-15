/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Browsers module
 */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js, %APPS_DIR%bender/js/browsers.js */

describe( 'Browsers', function() {
	describe( 'BrowserRouter', function() {
		it( 'should inherit from Marionette.AppRouter', function() {
			var router = new App.Browsers.BrowserRouter( {
				controller: {
					showBrowsers: sinon.spy()
				}
			} );

			expect( router ).to.be.instanceof( Marionette.AppRouter );
		} );


		it( 'should show a browser list on "browsers" route', function() {
			var router = new App.Browsers.BrowserRouter( {
					controller: {
						showBrowsers: sinon.spy()
					}
				} ),
				routerSpy = router.options.controller.showBrowsers,
				oldHash = window.location.hash;

			Backbone.history.start();

			router.navigate( 'browsers', {
				trigger: true
			} );

			window.location.hash = oldHash;

			expect( routerSpy.called ).to.be.true();
		} );
	} );

	describe( 'Browser', function() {
		it( 'should inherit from Backbone.Model', function() {
			var browser = new App.Browsers.Browser();

			expect( browser ).to.be.instanceof( Backbone.Model );
		} );

		it( 'should instantiate with default attributes', function() {
			var browser = new App.Browsers.Browser();

			expect( browser.toJSON() ).to.deep.equal( {
				id: '',
				name: '',
				addr: '',
				ua: '',
				version: '',
				ready: true,
				header: false
			} );
		} );
	} );

	describe( 'BrowserView', function() {
		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
		} );

		it( 'should inherit from Marionette.ItemView', function() {
			var view = new App.Browsers.BrowserView( {
				model: new App.Browsers.Browser()
			} );

			expect( view ).to.be.instanceof( Marionette.ItemView );
		} );

		it( 'should use "#browser" template', function() {
			var view = new App.Browsers.BrowserView( {
				model: new App.Browsers.Browser( {
					name: 'foo',
					version: 1
				} )
			} );

			view.render();

			var td = view.$el.find( 'td' );

			expect( td.eq( 0 ).text() ).to.equal( 'foo' );
			expect( td.eq( 1 ).text() ).to.equal( '1' );
		} );

		it( 'should have TR tag name', function() {
			var view = new App.Browsers.BrowserView( {
				model: new App.Browsers.Browser()
			} );

			view.render();

			expect( view.el.tagName ).to.equal( 'TR' );
		} );

		it( 'templateHelpers.formatName should format browsers name', function() {
			var view = new App.Browsers.BrowserView( {
				model: new App.Browsers.Browser()
			} );

			expect( view.templateHelpers.formatName( 'chrome', 40 ) ).to.equal( 'Chrome 40' );
			expect( view.templateHelpers.formatName( 'ie', 12 ) ).to.equal( 'IE 12' );
			expect( view.templateHelpers.formatName( 'firefox' ) ).to.equal( 'Firefox' );
		} );

		it( 'should listen to the model changes and re-render on those', function() {
			var spy = sandbox.spy( App.Browsers.BrowserView.prototype, 'render' ),
				model = new App.Browsers.Browser( {
					name: 'foo',
					version: 1
				} ),
				view = new App.Browsers.BrowserView( {
					model: model
				} );

			view.render();

			model.set( 'name', 'bar' );

			expect( spy.calledTwice ).to.be.true();
		} );
	} );

	describe( 'BrowserList', function() {
		it( 'should inherit from Backbone.Collection', function() {
			var browsers = new App.Browsers.BrowserList();

			expect( browsers ).to.be.instanceof( Backbone.Collection );
		} );

		it( 'should use Browsers.Browser class for models', function() {
			var browsers = new App.Browsers.BrowserList( [ {
				name: 'foo',
				version: 1
			} ] );

			expect( browsers.at( 0 ) ).to.be.instanceof( App.Browsers.Browser );
		} );
	} );

	describe( 'BrowserListView', function() {
		it( 'should inherit from Common.TableView', function() {
			var view = new App.Browsers.BrowserListView();

			expect( view ).to.be.instanceof( App.Common.TableView );
		} );

		it( 'should use "#browsers" template', function() {
			var view = new App.Browsers.BrowserListView( {
				collection: new App.Browsers.BrowserList()
			} );

			view.render();

			expect( view.$el.find( 'table' ) ).to.have.length( 1 );
			expect( view.$el.text() ).to.match( /Browser\s+UA\s+Address\s+Mode\s+Status/ );
		} );

		it( 'should use Browsers.BrowserView for child views', function() {
			var view = new App.Browsers.BrowserListView( {
				collection: new App.Browsers.BrowserList( [ {
					name: 'foo',
					version: 1
				} ] )
			} );

			view.render();

			expect( view.children.findByIndex( 0 ) ).to.be.instanceof( App.Browsers.BrowserView );
		} );
	} );

	describe( 'Controller', function() {
		var example = [ {
			id: 'chrome',
			name: 'chrome',
			version: 0,
			manual: true,
			clients: [ {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52441',
				id: 'edfed367-5e46-4162-9cdc-a2331011c665',
				mode: 'unit',
				ready: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52440',
				id: '01b61677-9191-4ab9-9406-135eec825ed8',
				mode: 'unit',
				ready: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52439',
				id: '792b5110-ee05-479a-bf03-fe0eca375a53',
				mode: 'unit',
				ready: true
			} ]
		}, {
			id: 'firefox',
			name: 'firefox',
			version: 0,
			manual: true,
			clients: [ {
				ua: 'Firefox 37.0.0 / Ubuntu 0.0.0',
				browser: 'firefox',
				version: 37,
				addr: '127.0.0.1:52457',
				id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
				mode: 'unit',
				ready: true
			} ]
		}, {
			id: 'ie11',
			name: 'ie',
			version: 11,
			manual: true,
			clients: []
		}, {
			id: 'safari',
			name: 'safari',
			version: 0,
			manual: true,
			clients: []
		} ];

		beforeEach( function() {
			App.Browsers.controller = new App.Browsers.Controller();
			App.Browsers.browserList = new App.Browsers.BrowserList();
		} );

		var sandbox = sinon.sandbox.create();

		afterEach( function() {
			sandbox.restore();
			delete App.Browsers.controller;
			delete App.Browsers.browserList;
			App.content.empty();
		} );

		it( 'should parse a browser list', function() {
			var expected = [ {
				id: 'chrome',
				name: 'chrome',
				version: 0,
				manual: true,
				clients: [ {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52441',
					id: 'edfed367-5e46-4162-9cdc-a2331011c665',
					mode: 'unit',
					ready: true
				}, {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52440',
					id: '01b61677-9191-4ab9-9406-135eec825ed8',
					mode: 'unit',
					ready: true
				}, {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52439',
					id: '792b5110-ee05-479a-bf03-fe0eca375a53',
					mode: 'unit',
					ready: true
				} ],
				header: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52441',
				id: 'edfed367-5e46-4162-9cdc-a2331011c665',
				mode: 'unit',
				ready: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52440',
				id: '01b61677-9191-4ab9-9406-135eec825ed8',
				mode: 'unit',
				ready: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52439',
				id: '792b5110-ee05-479a-bf03-fe0eca375a53',
				mode: 'unit',
				ready: true
			}, {
				id: 'firefox',
				name: 'firefox',
				version: 0,
				manual: true,
				clients: [ {
					ua: 'Firefox 37.0.0 / Ubuntu 0.0.0',
					browser: 'firefox',
					version: 37,
					addr: '127.0.0.1:52457',
					id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
					mode: 'unit',
					ready: true
				} ],
				header: true
			}, {
				ua: 'Firefox 37.0.0 / Ubuntu 0.0.0',
				browser: 'firefox',
				version: 37,
				addr: '127.0.0.1:52457',
				id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
				mode: 'unit',
				ready: true
			}, {
				id: 'ie11',
				name: 'ie',
				version: 11,
				manual: true,
				clients: [],
				header: true
			}, {
				id: 'safari',
				name: 'safari',
				version: 0,
				manual: true,
				clients: [],
				header: true
			} ];

			expect( App.Browsers.controller.parseBrowsers( example ) ).to.deep.equal( expected );
		} );

		it( 'should update a browser list', function() {
			expect( App.Browsers.browserList ).to.have.length( 0 );

			App.Browsers.controller.updateBrowsers( example );

			var expected = [ {
				id: 'chrome',
				name: 'chrome',
				version: 0,
				manual: true,
				clients: [ {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52441',
					id: 'edfed367-5e46-4162-9cdc-a2331011c665',
					mode: 'unit',
					ready: true
				}, {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52440',
					id: '01b61677-9191-4ab9-9406-135eec825ed8',
					mode: 'unit',
					ready: true
				}, {
					ua: 'Chrome 42.0.2311 / Linux 0.0.0',
					browser: 'chrome',
					version: 42,
					addr: '127.0.0.1:52439',
					id: '792b5110-ee05-479a-bf03-fe0eca375a53',
					mode: 'unit',
					ready: true
				} ],
				header: true,
				addr: '',
				ua: '',
				ready: true
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52441',
				id: 'edfed367-5e46-4162-9cdc-a2331011c665',
				mode: 'unit',
				ready: true,
				name: '',
				header: false
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52440',
				id: '01b61677-9191-4ab9-9406-135eec825ed8',
				mode: 'unit',
				ready: true,
				name: '',
				header: false
			}, {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52439',
				id: '792b5110-ee05-479a-bf03-fe0eca375a53',
				mode: 'unit',
				ready: true,
				name: '',
				header: false
			}, {
				id: 'firefox',
				name: 'firefox',
				version: 0,
				manual: true,
				clients: [ {
					ua: 'Firefox 37.0.0 / Ubuntu 0.0.0',
					browser: 'firefox',
					version: 37,
					addr: '127.0.0.1:52457',
					id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
					mode: 'unit',
					ready: true
				} ],
				header: true,
				addr: '',
				ua: '',
				ready: true
			}, {
				ua: 'Firefox 37.0.0 / Ubuntu 0.0.0',
				browser: 'firefox',
				version: 37,
				addr: '127.0.0.1:52457',
				id: 'fa705b6c-5ea2-4d5f-824e-ca3cfd2662ec',
				mode: 'unit',
				ready: true,
				name: '',
				header: false
			}, {
				id: 'ie11',
				name: 'ie',
				version: 11,
				manual: true,
				clients: [],
				header: true,
				addr: '',
				ua: '',
				ready: true
			}, {
				id: 'safari',
				name: 'safari',
				version: 0,
				manual: true,
				clients: [],
				header: true,
				addr: '',
				ua: '',
				ready: true
			} ];

			expect( App.Browsers.browserList.toJSON() ).to.deep.equal( expected );
		} );

		it( 'should clear a browser list', function() {
			App.Browsers.controller.updateBrowsers( example );

			expect( App.Browsers.browserList ).to.have.length( 8 );

			App.Browsers.controller.clearBrowsers();

			expect( App.Browsers.browserList ).to.have.length( 0 );
		} );

		it( 'should update a single client', function() {
			var client = {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52961',
				id: 'edfed367-5e46-4162-9cdc-a2331011c665',
				mode: 'unit',
				ready: false
			};

			App.Browsers.controller.updateBrowsers( example );

			expect( App.Browsers.browserList.get( client.id ).get( 'ready' ) ).to.be.true();

			App.Browsers.controller.updateClient( client );

			expect( App.Browsers.browserList.get( client.id ).get( 'ready' ) ).to.be.false();
		} );

		it( 'should ignore updates of unknown clients', function() {
			var client = {
				ua: 'Chrome 42.0.2311 / Linux 0.0.0',
				browser: 'chrome',
				version: 42,
				addr: '127.0.0.1:52961',
				id: 'unknown-client-id',
				mode: 'unit',
				ready: false
			};

			App.Browsers.controller.updateBrowsers( example );

			expect( App.Browsers.browserList.get( client.id ) ).to.be.undefined();

			App.Browsers.controller.updateClient( client );

			expect( App.Browsers.browserList.get( client.id ) ).to.be.undefined();
		} );

		it( 'should show a browser list', function() {
			var headerSpy = sandbox.spy( App.header, 'empty' ),
				contentSpy = sandbox.spy( App.content, 'show' );

			App.Browsers.controller.updateBrowsers( example );

			App.Browsers.controller.showBrowsers();

			expect( headerSpy.calledOnce ).to.be.true();

			var view = contentSpy.getCall( 0 ).args[ 0 ];

			expect( view ).to.be.instanceof( App.Browsers.BrowserListView );
			expect( view.collection ).to.equal( App.Browsers.browserList );
		} );
	} );

	describe( 'onStart', function() {
		var sockets = {
				socket: _.extend( {}, Backbone.Events )
			},
			sandbox = sinon.sandbox.create();

		beforeEach( function() {
			App.Sockets = sockets;
		} );

		afterEach( function() {
			sandbox.restore();
			delete App.Browsers.controller;
			delete App.Browsers.browserList;
			delete App.Browsers.browserRouter;
			delete App.Sockets;
		} );

		it( 'should instantiate a controller', function() {
			expect( App.Browsers.controller ).to.not.be.ok();

			App.Browsers.onStart();

			expect( App.Browsers.controller ).to.be.instanceof( App.Browsers.Controller );
		} );

		it( 'should instantiate a router', function() {
			expect( App.Browsers.browserRouter ).to.not.be.ok();

			App.Browsers.onStart();

			expect( App.Browsers.browserRouter ).to.be.instanceof( App.Browsers.BrowserRouter );
		} );

		it( 'should instantiate a browsers collection', function() {
			expect( App.Browsers.browserList ).to.not.be.ok();

			App.Browsers.onStart();

			expect( App.Browsers.browserList ).to.be.instanceof( App.Browsers.BrowserList );
		} );

		it( 'should update browsers on the socket\'s "browsers:update" event', function() {
			var spy = sandbox.spy( App.Browsers.Controller.prototype, 'updateBrowsers' );

			App.Browsers.onStart();

			sockets.socket.trigger( 'browsers:update' );

			expect( spy.calledOnce ).to.be.true();
		} );

		it( 'should update a client on the socket\'s "client:update" event', function() {
			var spy = sandbox.spy( App.Browsers.Controller.prototype, 'updateClient' );

			App.Browsers.onStart();

			var client = {
				id: 1
			};

			sockets.socket.trigger( 'client:update', client );

			expect( spy.calledOnce ).to.be.true();
			expect( spy.calledWith( client ) ).to.be.true();
		} );

		it( 'should clear browsers on the socket\'s "disconnect" event', function() {
			var spy = sandbox.spy( App.Browsers.Controller.prototype, 'clearBrowsers' );

			App.Browsers.onStart();

			sockets.socket.trigger( 'disconnect' );

			expect( spy.calledOnce ).to.be.true();
		} );
	} );
} );
