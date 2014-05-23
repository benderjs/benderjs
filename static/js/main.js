var App = new Backbone.Marionette.Application();

App.addRegions({
    socketStatus: '#socket-status',
    tabs: '#tabs',
    header: '#header',
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

var tabs = [
    { text: 'Tests', url: 'tests', active: false },
    { text: 'Jobs', url: 'jobs', active: false },
    { text: 'Browsers', url: 'browsers', active: false },
];

App.tabsList = new Backbone.Collection(tabs);

App.TabView = Backbone.Marionette.ItemView.extend({
    template: '#tab-view',
    tagName: 'li'
});

App.TabListView = Backbone.Marionette.CollectionView.extend({
    itemView: App.TabView,
    tagName: 'ul',
    className: 'nav nav-tabs nav-justified'
});

App.addInitializer(function () {
    App.tabs.show(new App.TabListView({
        collection: App.tabsList
    }));
});

// <ul class="nav nav-tabs nav-justified" role="navigation">
//     <li><a href="#tests">Tests</a></li>
//     <li><a href="#jobs">Jobs</a></li>
//     <li><a href="#browsers">Browsers</a></li>
// </ul>
