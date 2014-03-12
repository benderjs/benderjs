var faye = require('faye'),
    clients = require('./clients'),
    logger = require('./logger').create('bayeux');

module.exports.attach = function (server) {
    var bayeux = new faye.NodeAdapter({
            mount: '/faye',
            timeout: 45
        }),
        client;

    bayeux.addExtension({
        incoming: function (msg, callback) {
            logger.info('[bayeux in]', msg);
            callback(msg);
        },
        outgoing: function (msg, callback) {
            logger.info('[bayeux out]', msg);
            callback(msg);
        }
    });

    client = bayeux.getClient();

    client.subscribe('/client_disconnect', function (id) {
        logger.info('client_disconnect: %s', id);
        clients.removeById(id);
    });

    clients.on('change', function () {
        client.publish('/client_list', clients.getAll());
    });

    bayeux.attach(server);
};
