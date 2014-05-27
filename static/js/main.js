/**
 * Marionette Application
 */
var App = new Backbone.Marionette.Application(),
    tabs = [
        { text: 'Tests', id: 'tests', active: false },
        { text: 'Jobs', id: 'jobs', active: false },
        { text: 'Browsers', id: 'browsers', active: false },
    ];

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
 * Tabs collection
 */
App.tabsList = new (Backbone.Collection.extend({
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
}))(tabs);

/**
 * Single tab view
 */
App.TabView = Backbone.Marionette.ItemView.extend({
    template: '#tab-view',
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

    appendHtml: function (collView, itemView) {
        if (collView.isBuffering) collView.elBuffer.appendChild(itemView.el);
        else collView.$('tbody').append(itemView.el);
    },

    appendBuffer: function (collView, buffer) {
        collView.$('tbody').append(buffer);
    }
});
