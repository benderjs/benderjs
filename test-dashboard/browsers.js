/**
 * Copyright (c) 2014-2015, CKSource - Frederico Knabben. All rights reserved.
 * Licensed under the terms of the MIT License (see LICENSE.md).
 *
 * @file Tests for Browsers module
 */

/*global App */

/* bender-include: %BASE_PATH%_mocks.js, %APPS_DIR%bender/js/common.js, %APPS_DIR%bender/js/browsers.js */

describe( 'Browsers', function() {
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

		expect( view ).to.be.instanceof( App.Browsers.BrowsersListView );
		expect( view.collection ).to.equal( App.Browsers.browserList );
	} );

	it( 'should show a browser list on "browsers" route', function() {
		App.Browsers.browserRouter = new App.Browsers.BrowserRouter( {
			controller: {
				showBrowsers: sandbox.spy()
			}
		} );

		var routerSpy = App.Browsers.browserRouter.options.controller.showBrowsers,
			oldHash = window.location.hash;

		Backbone.history.start();

		App.Browsers.browserRouter.navigate( 'browsers', {
			trigger: true
		} );

		window.location.hash = oldHash;

		expect( routerSpy.called ).to.be.true();
	} );
} );
