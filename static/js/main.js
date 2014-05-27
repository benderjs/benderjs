/**
 * Marionette Application
 */
var App = new Backbone.Marionette.Application();

// add main layout regions
App.addRegions({
    socketStatus: '#socket-status',
    tabs: '#tabs',
    header: '#header',
    content: '#content'
    // TODO add dialog/modal region
});

/**
 * Navigate to a route
 * @param {String}  route             Route to navigate to
 * @param {Object}  [options]         Backbone.history.navigate options
 * @param {Boolean} [options.trigger] Force triggering route event
 * @param {Boolean} [options.replace] Replace current route with new one instead of adding another record in the history
 * 
 */
App.navigate = function (route, options) {
    options = options || { trigger: true };

    Backbone.history.navigate(route, options);
};

/**
 * Get current route
 * @return {String}
 */
App.getCurrentRoute = function () {
    return Backbone.history.fragment;
};

/**
 * Alias for history.back
 */
App.back = function () {
    Backbone.history.history.back();
};

/**
 * Tab model
 */
App.Tab = Backbone.Model.extend({
    defaults: {
        id: '',
        label: '',
        active: false,
        disabled: false
    }
});

/**
 * Tabs collection
 */
App.tabsList = new (Backbone.Collection.extend({
    model: App.Tab,

    initialize: function () {
        App.vent.on('tests:start', this.disableTabs, this);
        App.vent.on('tests:stop', this.enableTabs, this);
    },

    activateTab: function (name) {
        var next = this.get(name);

        this.each(function (tab) {
            tab.set('active', false);
        });

        if (next) next.set('active', true);
    },

    disableTabs: function () {
        this.each(function (tab) {
            tab.set('disabled', true);
        });
    },

    enableTabs: function () {
        this.each(function (tab) {
            tab.set('disabled', false);
        });
    }
}))([
    { label: 'Tests', id: 'tests' },
    { label: 'Jobs', id: 'jobs' },
    { label: 'Browsers', id: 'browsers' }
]);

/**
 * Single tab view
 */
App.TabView = Backbone.Marionette.ItemView.extend({
    template: '#tab',
    tagName: 'li',

    events: {
        'click a': 'navigate'
    },

    initialize: function () {
        this.listenTo(this.model, 'change', this.changeState);
    },

    navigate: function () {
        var model = this.model.toJSON();

        if (!model.active && !model.disabled) App.navigate(model.id);
    },

    changeState: function () {
        var model = this.model.toJSON();

        this.el.className = (model.active ? 'active ' : ' ') +
            (model.disabled ? 'disabled' : '');
    }
});

/**
 * Tabs list view
 */
App.TabListView = Backbone.Marionette.CollectionView.extend({
    itemView: App.TabView,
    tagName: 'ul',
    className: 'nav nav-tabs nav-justified'
});

/**
 * Add initializer for application
 */
App.addInitializer(function () {
    App.tabs.show(new App.TabListView({
        collection: App.tabsList
    }));

    Backbone.history.on('route', function (router) {
        if (router.name) App.tabsList.activateTab(router.name);
    });
});

App.on('initialize:after', function () {
    Backbone.history.start();
    if (this.getCurrentRoute() === '') App.Tests.trigger('tests:list');
});


App.TableView = Backbone.Marionette.CompositeView.extend({
    className: 'panel panel-default',
    itemViewContainer: 'tbody'
});
