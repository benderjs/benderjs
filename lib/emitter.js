var EventEmitter = require('events').EventEmitter,
    utils = require('util');

function Emitter() {
    EventEmitter.call(this);
}

utils.inherits(Emitter, EventEmitter);

module.exports = Emitter;
