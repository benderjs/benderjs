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

    attach: function () {
        var bender = this,
            server = bender.server = {};

        bender.checkDeps(module.exports.name, 'constants', 'sockets');

        /**
         * Create an instance of HTTP Server with Web Socket attached to it
         * @return {Object}
         */
        server.create = function () {
            var app = connect(),
                server = http.createServer(app),
                name,
                mw;

            // attach Web Socket server to the existing HTTP server
            bender.sockets.attach(server);

            // enable connect's middleware
            app.use(connect.logger('dev'));
            app.use(connect.json());
            app.use(connect.urlencoded());

            // create middleware instances
            for (name in middleware) {
                mw = middleware[name];
                if (mw && typeof mw.create == 'function') app.use(mw.create(bender));
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
