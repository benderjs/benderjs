/**
 * @file Creates HTTP Server
 */

var http = require('http'),
    path = require('path'),
    connect = require('connect'),
    render = require('connect-render'),
    defaultMiddleware = require('./middleware/default'),
    testsMiddleware = require('./middleware/tests'),
    appMiddleware = require('./middleware/applications'),
    fsMiddleware = require('./middleware/filesystem');

/**
 * Create an instance of HTTP Server with Web Socket attached to it
 * @return {Object}
 */
function create(constants, sockets, applications, tests, injector) {
    var statics = path.resolve(__dirname, '../static/'),
        app = connect(
            render({
                root: statics,
                layout: false,
                helpers: {
                    version: constants.VERSION
                }
            })
        ),
        server = http.createServer(app);

    // attach Web Socket server to the existing HTTP server
    sockets.attach(server);

    // enable connect' logger
    app.use(connect.logger('dev'));

    // serve static files, e.g. client scripts and styles
    app.use(connect.static(statics));

    // serve all files with absolute paths - HTTP Handler: FileSystem
    app.use(injector.invoke(fsMiddleware.create));

    // serve application sorces / proxy application requests
    app.use(injector.invoke(appMiddleware.create));

    // serve test files - HTTP Handler: Test
    app.use(injector.invoke(testsMiddleware.create));

    // serve default paths - / and /capture
    app.use(injector.invoke(defaultMiddleware.create));

    // server 404 for unhandled requests
    app.use(function (req, res, next) {
        res.writeHead(404);
        res.end('404 - Not found');
    });

    return server;
}

module.exports.create = create;
