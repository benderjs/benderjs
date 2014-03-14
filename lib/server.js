var http = require('http'),
    path = require('path'),
    express = require('express'),
    constants = require('./constants'),
    sockets = require('./sockets'),
    uuid = require('node-uuid').v4,
    clients = require('./clients'),
    testHandler = require('./testHandler'),
    tests = require('./tests');

function create() {
    var app = express(),
        server = http.createServer(app);

    sockets.attach(server);

    app.set('views', path.resolve(__dirname, '../views/'));

    app.use(express.logger('dev'));
    app.use(express.static(path.resolve(__dirname, '../static/')));
    app.use(testHandler.create());

    // render a dashboard
    app.get('/', function (req, res) {
        res.render('index.ejs', {
            version: constants.VERSION,
            tests: tests.getList(),
            clients: clients.getList()
        });
    });

    // capture a browser and redirect to it's unique address 
    app.get('/capture', function (req, res) {
        res.redirect(302, '/clients/' + uuid());
    });

    // render a client capture page
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
