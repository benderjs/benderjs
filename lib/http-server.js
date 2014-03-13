var http = require('http'),
    path = require('path'),
    express = require('express'),
    constants = require('./constants'),
    uuid = require('node-uuid').v4,
    clients = require('./clients');

function create(port) {
    var app = express(),
        server = http.createServer(app),
        io = require('socket.io').listen(server);

    io.sockets.on('connection', function (socket) {
        console.log('[NEW SOCKET CONNECTION]');

        socket.on('register', function (client) {
            clients.add({
                id: client.id,
                userAgent: client.userAgent,
                socket: socket
            });

            console.log('[CLIENT REGISTERED]', client.id);
        });

        socket.on('result', function (result) {
            console.log('[RESULT]', result);
        });

        socket.on('error', function (error) {
            console.error('[ERROR]', error);
        });

        socket.on('log', function (error) {
            console.error('[LOG]', error);
        });

        socket.on('disconnect', function () {
            var client = clients.getBy('socket', socket);

            if (client) {
                console.log('[CLIENT DISCONNECTED]', client.id);
                clients.remove(client);
            }
        });
    });

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
        res.writeHead(302, {'Location': '/clients/' + uuid() });
        res.end();
    });

    app.get(/^\/clients\/[\w]{8}(-[\w]{4}){3}-[\w]{12}$/, function (req, res) {
       res.render('capture.ejs');
    });

    app.get('/run', function (req, res) {
        // run all tests
    });

    app.post('/run', function (req, res) {
        // run specific tests
        console.log('req.body', req.body);
    });

    return server;
}

module.exports.create = create;
