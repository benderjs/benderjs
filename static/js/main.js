var App = new Backbone.Marionette.Application();

App.addRegions({
    socketStatus: '#socket-status',
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
