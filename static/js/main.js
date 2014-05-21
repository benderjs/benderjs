// Backbone.Marionette.Renderer.render = function (template, data) {
//     return doT.template(template)(data);
// };

var App = new Backbone.Marionette.Application();


App.addRegions({
    content: '#content'
    // TODO add dialog/modal region
});

App.navigate = function (route, options) {
    options = options || {};

    Backbone.history.navigate(route, options);
};

App.getCurrentRoute = function () {
    return Backbone.history.fragment;
};

App.on('initialize:after', function () {
    Backbone.history.start();
    if (this.getCurrentRoute() === '') App.Tests.trigger('tests:list');
});

// OLD EMBER CODE >>>


// App.ApplicationController = Ember.Controller.extend({
//     needs: ['tests', 'browsers'],

//     browsersCount: Ember.computed.alias('controllers.browsers.clients.length'),
//     testsRunning: Ember.computed.alias('controllers.tests.testStatus.running'),

//     tabs: [
//         { target: 'tests', name: 'Tests' },
//         { target: 'jobs', name: 'Jobs' },
//         { target: 'browsers', name: 'Browsers', browsers: true }
//     ],

//     socketStatus: Ember.Object.extend({
//         status: 'disconnected',

//         css: function () {
//             var status = this.get('status');

//             return status === 'connected' ? 'success' :
//                 status === 'reconnecting' ? 'warning' : 'danger';
//         }.property('status')
//     }).create(),

//     sockets: {
//         connect: function () {
//             this.socket.emit('register');
//             this.socketStatus.set('status', 'connected');
//         },
//         reconnect: function () {
//             this.socketStatus.set('status', 'reconnecting');
//         },
//         reconnecting: function () {
//             this.socketStatus.set('status', 'reconnecting');
//         },
//         reconnect_failed: function () {
//             this.socketStatus.set('status', 'disconnected');
//         },
//         disconnect: function () {
//             this.socketStatus.set('status', 'disconnected');
//         }
//     }
// });
