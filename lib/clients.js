var events = require('events'),
    ua = require('useragent'),
    util = require('util'),
    _ = require('lodash');

/**
 * Client
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @param {Object} data.socket Reference to client's socket
 * @extends {EventEmitter}
 * @constructor
 */
function Client(data) {
    events.EventEmitter.call(this);
    this.id = data.id;
    this.ua = ua.parse(data.ua).toString();
    this.socket = data.socket;
    this.busy = false;
}

util.inherits(Client, events.EventEmitter);

/**
 * Set client's busy state
 * @param {Boolean} state Client's new busy state
 * @fires Client#change
 */
Client.prototype.setBusy = function (state) {
    this.busy = state;
    /**
     * @event Client#change
     * @type  {Client}
     */
    this.emit('change', this);
};

/**
 * Collection of Clients
 * @extends {EventEmitter}
 * @constructor
 */
function ClientCollection() {
    events.EventEmitter.call(this);
    this.clients = [];
}

util.inherits(ClientCollection, events.EventEmitter);

/**
 * Add new client to the collection
 * @param {Object} data        Client properties
 * @param {String} data.id     Client's unique ID
 * @param {String} data.ua     Client's User Agent
 * @param {Object} data.socket Reference to client's socket
 * @fires ClientCollection#change
 */
ClientCollection.prototype.add = function (data) {
    var client = new Client(data);

    // to inform about changes in clients, e.g. going into busy state
    client.on('change', function () {
        this.emit('change');
    }.bind(this));

    this.clients.push(client);
    /**
     * @event ClientCollection#change
     * @type  {ClientCollection}
     */
    this.emit('change', this);
};

/**
 * Remove a client from the collection
 * @param  {Client} client Client to be removed
 * @fires ClientCollection#change
 */
ClientCollection.prototype.remove = function (client) {
    var idx = this.clients.indexOf(client);
    if (idx > -1) {
        client.removeAllListeners();
        this.clients.splice(idx, 1);
    }
    this.emit('change', this);
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
 * List all the clients of the collection.
 * Used to exclude client's socket property and avoid circular references
 * @return {Array.<Object}
 */
ClientCollection.prototype.list = function () {
    return this.map(function (client) {
        return {
            id: client.id,
            ua: client.ua,
            busy: client.busy
        };
    });
};

/**
 * Perform mapping on the clients collection
 * @param  {Function} callback Function called for each client
 * @return {Array}
 */
ClientCollection.prototype.map = function (callback) {
    return this.clients.map(callback);
};

/**
 * Execute a callback on all of the clients
 * @param  {Function} callback Function called for each client
 */
ClientCollection.prototype.forEach = function (callback) {
    this.clients.forEach(callback);
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

module.exports = new ClientCollection();
