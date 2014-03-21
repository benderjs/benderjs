/**
 * @file Manages global emitter
 */

var EventEmitter = require('events').EventEmitter,
    utils = require('util');

/**
 * Event emitter
 * @extends {EventEmitter}
 */
function Emitter() {
    EventEmitter.call(this);
}

utils.inherits(Emitter, EventEmitter);

module.exports = Emitter;
