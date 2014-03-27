/**
 * @file Creates HTTP Server
 */

var http = require('http'),
    path = require('path'),
    connect = require('connect'),
    logger = require('./logger'),
    middleware = require('./middleware');

module.exports = {

    name: 'server',

    attach: function (options) {
        var bender = this,
            server = bender.server = {};

        if (!bender.constants || !bender.sockets) {
            logger.error('Server module requires: constants, sockets');
            process.exit(1);
        }

        /**
         * Create an instance of HTTP Server with Web Socket attached to it
         * @return {Object}
         */
        server.create = function () {
            var app = connect(),
                server = http.createServer(app),
                name;

            // attach Web Socket server to the existing HTTP server
            bender.sockets.attach(server);

            // enable connect' logger
            app.use(connect.logger('dev'));

            // create middleware instances
            for (name in middleware) {
                if (middleware[name]) app.use(middleware[name].create(bender));
            }

            // serve static files, e.g. client scripts and styles
            app.use(connect.static(path.resolve(__dirname, '../static/')));

            // serve 404 for unhandled requests
            app.use(function (req, res) {
                res.writeHead(404);
                res.end('404 - Not found');
            });

            return server;
        };
    }
};
