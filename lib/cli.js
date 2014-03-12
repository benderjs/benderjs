var parser = require('nomnom'),
    constants = require('./constants');

parser.command('server')
    .callback(startServer)
    .option('port', {
        abbr: 'p',
        default: constants.PORT,
        help: 'Port on which the server will run'
    })
    // see if this option is really needed
    .option('hostname', {
        abbr: 'n', // YEAH.. should be h but it's reserved for nomnom's help
        default: constants.HOSTNAME,
        help: 'Hostname used to run server'
    })
    .help('Start Bender.js server');

parser.command('version')
    .callback(function () {
        console.log('Bender.js v%s', constants.VERSION);
    })
    .help('Print Bender.js version');

parser.parse();

function startServer(options) {
    var hs = require('./http-server'),
        server = hs.create();

    server.listen(options.port, function () {
        console.log('Bender.js Server v%s started at http://%s:%s', constants.VERSION, options.hostname, options.port);
    });
}