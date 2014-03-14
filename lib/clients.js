var events = require('events'),
    ua = require('useragent'),
    util = require('util');

function Client(data) {
    events.EventEmitter.call(this);
    this.id = data.id;
    this.ua = ua.parse(data.ua).toString();
    this.socket = data.socket;
    this.busy = false;
}

util.inherits(Client, events.EventEmitter);

Client.prototype.setBusy = function(state) {
    this.busy = state;
    this.emit('change', this);
};

function ClientCollection() {
    events.EventEmitter.call(this);
    this.clients = [];
}

util.inherits(ClientCollection, events.EventEmitter);

ClientCollection.prototype.add = function (data) {
    var client = new Client(data);

    // to inform about changes in clients, e.g. going into busy state
    client.on('change', function () {
        this.emit('change');
    }.bind(this));

    this.clients.push(client);
    this.emit('change', this);
};

ClientCollection.prototype.remove = function (client) {
    var idx = this.clients.indexOf(client);
    if (idx > -1) {
        client.removeAllListeners();
        this.clients.splice(idx, 1);
    }
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

ClientCollection.prototype.getList = function () {
    return this.clients.map(function (client) {
        return {
            id: client.id,
            ua: client.ua,
            busy: client.busy
        };
    });
};

ClientCollection.prototype.map = function(callback) {
    return this.clients.map(callback);
};

ClientCollection.prototype.forEach = function(callback) {
    this.clients.forEach(callback);
};

module.exports = new ClientCollection();
