var http = require('http'),
    path = require('path'),
    express = require('express'),
    constants = require('./constants'),
    sockets = require('./sockets'),
    uuid = require('node-uuid').v4,
    clients = require('./clients'),
    tests = require('./tests');

function create(port) {
    var app = express(),
        server = http.createServer(app);

    sockets.attach(server);

    app.configure(function () {
        app.use(express.logger('dev'));
        app.use(express.urlencoded());
        app.use(express.json());
        app.use(express.static('static'));
    });

    app.get('/', function (req, res) {
        res.render('index.ejs', {
            version: constants.VERSION,
            tests: tests.getList(),
            clients: clients.getList()
        });
    });

    app.get('/capture', function (req, res) {
        res.redirect(302, '/clients/' + uuid());
    });

    // e.g. GET:/clients/dddb54f6-0735-40bf-b463-5fbffc93f05b
    app.get(/^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/, function (req, res) {
       res.render('capture.ejs');
    });

    // e.g. GET:/tests/test-case-01.js
    app.get(/^\/tests\/([a-zA-Z-_0-9\.\/]+)$/, function (req, res) {
        var testId = req.params[0],
            // TODO write some thing to manage tests, parse meta etc.
            scripts,
            css;

        res.render('context.ejs', {
            name: testId, // TODO retrieve from the test file
            html: '',
            scripts: [],
            css: ''
        });
    });

    app.get('/run', function (req, res) {
        // run all tests
        res.send(200);
    });

    app.post('/run', function (req, res) {
        // run specific tests
        console.log('req.body', req.body);
        res.send(200);
    });

    app.use(function (req, res, next) {
        res.send(404, 'Error 404: Page not found');
    });

    return server;
}

module.exports.create = create;
