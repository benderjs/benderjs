/**
 * @file Creates HTTP Server
 */

var http = require('http'),
    path = require('path'),
    connect = require('connect'),
    render = require('connect-render'),
    middleware = require('./middleware');

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
        server = http.createServer(app),
        name;

    // attach Web Socket server to the existing HTTP server
    sockets.attach(server);

    // enable connect' logger
    app.use(connect.logger('dev'));

    // serve static files, e.g. client scripts and styles
    app.use(connect.static(statics));

    // create middleware instances
    for (name in middleware) {
        if (middleware[name]) app.use(injector.invoke(middleware[name].create));
    }

    // server 404 for unhandled requests
    app.use(function (req, res, next) {
        res.writeHead(404);
        res.end('404 - Not found');
    });

    return server;
}

module.exports.create = create;
