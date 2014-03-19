var clients = require('./clients'),
    tests = require('./tests');

/**
 * Run given tests on all available clients
 * @param {Array.<Strong>} names List of test ids
 */
function runTests(ids) {
    clients.forEach(function (client) {
        if (!client.busy) {
            client.setBusy(true);
            client.socket.json.emit('run', tests.get(ids));
        }
    });
}

module.exports.runTests = runTests;
