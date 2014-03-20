var http = require('http'),
    path = require('path'),
    express = require('express'),
    uuid = require('node-uuid').v4;

/**
 * Create an instance of HTTP Server with Web Socket attached to it
 * @return {Object}
 */
function create(constants, sockets, applications, tests, filesystem) {
    var app = express(),
        server = http.createServer(app);

    // attach Web Socket server to the existing HTTP server
    sockets.attach(server);

    app.set('views', path.resolve(__dirname, '../views/'));

    // enable express' logger
    app.use(express.logger('dev'));

    // serve application sorces / proxy application requests
    app.use(applications.create());

    // serve test files - HTTP Handler: Test
    app.use(tests.create());

    // serve static files, e.g. client scripts and styles - HTTP Handler: FileSystem
    app.use(express.static(path.resolve(__dirname, '../static/')));

    app.use(filesystem.create());

    // render a dashboard
    app.get('/', function (req, res) {
        res.render('index.ejs', {
            version: constants.VERSION,
            groups: tests.list()
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

create.$inject = ['constants', 'sockets', 'applications', 'tests', 'filesystem'];

module.exports.create = create;
