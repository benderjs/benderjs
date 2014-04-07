/**
 * @file Manages clients connected to the server
 */
var ua = require('useragent');

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
    this.browser = this.ua.split(' ')[0].toLowerCase();
    this.busy = false;
}



/**
 * Collection of Clients
 * @constructor
 */
function ClientCollection(bender) {
    this.bender = bender;
    this.clients = {};
}

/**
 * Add new client to the collection
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @fires bender#clients:change
 */
ClientCollection.prototype.add = function (data) {
    this.clients[data.id] = new Client(data);

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
    if (this.clients[id]) {
        delete this.clients[id];
        this.bender.emit('clients:change', this.clients);
    }
};

/**
 * Get a client from the collection
 * @param  {String} id Client's id
 * @return {Client|Null}
 */
ClientCollection.prototype.get = function (id) {
    return this.clients[id];
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
    return !Object.keys(this.clients).some(function (id) {
        return this.clients[id].busy;
    }.bind(this));
};

/**
 * Set client's busy state
 * @param {String} [id] Client's id, if none, all clients will be affected
 * @param {Boolean} state Busy state
 */
ClientCollection.prototype.setBusy = function (id, state) {
    if (typeof id == 'boolean') {
        state = id;

        Object.keys(this.clients).forEach(function (id) {
            this.clients[id].busy = !!state;
        }.bind(this));
    } else if (this.clients[id]) {
        this.clients[id].busy = !!state;
    } else {
        return;
    }

    this.bender.emit('clients:change', this.clients);
};

/**
 * Get list of client ids
 * @return {Array.<String>}
 */
ClientCollection.prototype.list = function () {
    return Object.keys(this.clients);
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
    
    
