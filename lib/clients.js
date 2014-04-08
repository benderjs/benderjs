/**
 * @file Manages clients connected to the server
 */
var util = require('util'),
    ua = require('useragent'),
    Collection = require('./collection');

/**
 * Client browser
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @class
 */
function Client(data) {
    this.id = data.id;
    this.ua = ua.parse(data.ua).toString();
    this.browser = this.ua.split(' ')[0].toLowerCase();
    this.busy = false;
}

module.exports = {

    name: 'clients',

    attach: function () {
        var bender = this;
        
        /**
         * Clients collection
         * @extends {Collection}
         */
        function Clients () {
            Collection.call(this);
        }

        util.inherits(Clients, Collection);

        /**
         * Check if all clients are not busy at the moment
         * @return {Boolean}
         */
        Clients.prototype.checkReady = function () {
            return !Object.keys(this.items).some(function (id) {
                return this.items[id].busy;
            }, this);
        };

        /**
         * Set client's busy state
         * @param {String} [id] Client's id, if none, all clients will be affected
         * @param {Boolean} state Busy state
         */
        Clients.prototype.setBusy = function (id, state) {
            var item;

            if (typeof id == 'boolean') {
                state = id;

                this.each(function (client) {
                    client.busy = !!state;
                });
            } else if ((item = this.get(id))) {
                item.busy = !!state;
            } else return;

            bender.emit('clients:change', this.get());
        };

        bender.clients = new Clients();

        bender.clients.on('change', function (clients) {
            bender.emit('clients:change', clients);
        });

        bender.on('client:register', function (client) {
            bender.clients.add(client.id, new Client(client));
        });

        bender.on('client:disconnect', function (id) {
            bender.clients.remove(id);
        });
    }
};
    
    
