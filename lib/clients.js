var events = require('events'),
    util = require('util'),
    Client = require('./client').Client;

function ClientCollection() {
    events.EventEmitter.call(this);
    this.clients = [];
}

util.inherits(ClientCollection, events.EventEmitter);

ClientCollection.prototype.add = function (client) {
    
    // TODO check if a client doesn't appear already?
    this.clients.push(new Client(client));
    this.emit('change', this);
};

ClientCollection.prototype.remove = function (client) {
    var idx = this.clients.indexOf(client);
    if (idx > -1) this.clients.splice(idx, 1);
    this.emit('change', this);
};

ClientCollection.prototype.getBy = function (attr, value) {
    return this.clients.filter(function (client) {
        return client[attr] === value;
    })[0] || null;
};

ClientCollection.prototype.getAll = function () {
    return this.clients;
};

module.exports = new ClientCollection();
