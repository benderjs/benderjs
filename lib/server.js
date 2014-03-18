var http = require('http'),
    path = require('path'),
    express = require('express'),
    constants = require('./constants'),
    sockets = require('./sockets'),
    uuid = require('node-uuid').v4,
    clients = require('./clients'),
    applications = require('./applications'),
    tests = require('./tests');

/**
 * Create an instance of HTTP Server with Web Socket attached to it
 * @return {Object}
 */
function create() {
    var app = express(),
        server = http.createServer(app);

    // attach Web Socket server to the existing HTTP server
    sockets.attach(server);

    app.set('views', path.resolve(__dirname, '../views/'));

    app.use(express.logger('dev'));
    // serve static files, e.g. client scripts and styles
    app.use(express.static(path.resolve(__dirname, '../static/')));
    // serve application sorces / proxy application requests
    app.use(applications.create());
    // serve test files
    app.use(tests.create());

    // render a dashboard
    app.get('/', function (req, res) {
        res.render('index.ejs', {
            version: constants.VERSION,
            tests: tests.list(),
            clients: clients.list()
        });
    });

    // capture a browser and redirect to it's unique address 
    app.get('/capture', function (req, res) {
        res.redirect(302, '/clients/' + uuid());
    });

    // render individual client capture page /clients/<uuid>
    // e.g. GET:/clients/dddb54f6-0735-40bf-b463-5fbffc93f05b
    app.get(/^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/, function (req, res) {
       res.render('capture.ejs');
    });

    // handle 404s
    app.use(function (req, res, next) {
        res.send(404, 'Error 404: Page not found');
    });

    return server;
}

module.exports.create = create;
