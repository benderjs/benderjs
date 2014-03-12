var events = require('events'),
    util = require('util'),
    uuid = require('node-uuid').v4;

function ClientCollection() {
    events.EventEmitter.call(this);
    this.clients = [];
}

util.inherits(ClientCollection, events.EventEmitter);

ClientCollection.prototype.add = function (userAgent) {
    var id = uuid();

    this.clients.push({
        id: id,
        userAgent: userAgent
    });
    this.emit('change', this);

    return id;
};

ClientCollection.prototype.remove = function (client) {
    var idx = this.clients.indexOf(client);
    if (idx > -1) this.clients.splice(idx, 1);
    this.emit('change', this);
};

ClientCollection.prototype.getById = function (id) {
    return this.clients.filter(function (client) {
        return client.id === id;
    })[0] || null;
};

ClientCollection.prototype.removeById = function(id) {
    var item = this.getById(id);

    if (item) {
        this.remove(item);
    } else {
        return false;
    }
};

ClientCollection.prototype.getAll = function () {
    return this.clients;
};

module.exports = new ClientCollection();
