var clients = require('./clients'),
    tests = require('./tests');

module.exports.runTests = function (names) {
    clients.forEach(function (client) {
        client.setBusy(true);
        client.socket.json.emit('run', tests.getTests(names));
    });
};
