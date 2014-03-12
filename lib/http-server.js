var http = require('http'),
    path = require('path'),
    express = require('express'),
    bayeux = require('./bayeux'),
    constants = require('./constants'),
    clients = require('./clients');

function create(port) {
    var app = express(),
        server = http.createServer(app);

    bayeux.attach(server);

    app.configure(function () {
        app.use(express.logger('dev'));
        app.use(express.urlencoded());
        app.use(express.json());
        app.use(express.static('static'));
    });

    app.get('/', function (req, res) {
        res.render('index.ejs', {
            version: constants.VERSION,
            tests: ['foo', 'bar', 'baz'],
            clients: clients.getAll()
        });
    });

    app.get('/capture', function (req, res) {
        var id = clients.add(req.headers['user-agent']);

        res.writeHead(302, {'Location': '/clients/' + id });
        res.end();
    });

    app.get(/^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/, function (req, res) {
       res.render('capture.ejs');
    });

    app.get('/run', function (req, res) {

    });

    return server;
}

module.exports.create = create;
