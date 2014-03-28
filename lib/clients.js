/**
 * @file Manages clients connected to the server
 */
var ua = require('useragent'),
    _ = require('lodash');

/**
 * Client
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @constructor
 */
function Client(data) {
    this.id = data.id;
    this.ua = ua.parse(data.ua).toString();
    this.busy = false;
}



/**
 * Collection of Clients
 * @constructor
 */
function ClientCollection(bender) {
    this.bender = bender;
    this.clients = [];
}

/**
 * Add new client to the collection
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @fires bender#clients:change
 */
ClientCollection.prototype.add = function (data) {
    var client = new Client(data);

    this.clients.push(client);
    /**
     * @event bender#clients:change
     * @type  {Array.<Client>}
     */
    this.bender.emit('clients:change', this.clients);
};

/**
 * Remove a client from the collection
 * @param {String} id Client's id
 * @fires ClientCollection#change
 */
ClientCollection.prototype.remove = function (id) {
    var client = this.get({
            id: id
        }),
        idx = this.clients.indexOf(client);

    if (idx > -1) {
        this.clients.splice(idx, 1);
        this.bender.emit('clients:change', this.clients);
    }
};

/**
 * Get a client from the collection
 * @param  {Object} option Object of property values to filter a client 
 * @return {Client|Null}
 */
ClientCollection.prototype.get = function (option) {
    return _.where(this.clients, option)[0] || null;
};

/**
 * Get all clients from the collection
 * @return {Array.<Client>}
 */
ClientCollection.prototype.getAll = function () {
    return this.clients;
};

/**
 * Check if all clients are not busy at the moment
 * @return {Boolean}
 */
ClientCollection.prototype.checkReady = function () {
    return !this.clients.some(function (client) {
        return client.busy;
    });
};

/**
 * Set client's busy state
 * @param {String} [id] Client's id, if none, all clients will be affected
 * @param {Boolean} state Busy state
 */
ClientCollection.prototype.setBusy = function (id, state) {
    if (typeof id == 'boolean') {
        state = id;
        this.clients.forEach(function (client) {
            client.busy = state;
        });
    } else {
        if ((client = this.get({ id: id }))) {
            client.busy = state;
        }
    }

    this.bender.emit('clients:change', this.clients);
};

module.exports = {

    name: 'clients',

    attach: function () {
        var bender = this;

        bender.clients = new ClientCollection(bender);

        bender.on('client:register', function (client) {
            bender.clients.add(client);
        });

        bender.on('client:disconnect', function (id) {
            bender.clients.remove(id);
        });
    }
};
    
    
