App.module('Browsers', function (Browsers, App, Backbone) {
    
    Browsers.Router = Marionette.AppRouter.extend({
        name: 'browsers',

        appRoutes: {
            'browsers': 'show'
        }
    });

    Browsers.Client = Backbone.Model.extend({
        defaults: {
            id: '',
            name: '',
            addr: '',
            ready: true
        }
    });

    Browsers.ClientView = Backbone.Marionette.ItemView.extend({
        template: '#client',
        tagName: 'tr'
    });

    Browsers.ClientsList = Backbone.Collection.extend({
        model: Browsers.Client
    });

    Browsers.ClientsListView = Backbone.Marionette.ItemView.extend({
        template: '#clients'
    });

    Browsers.Browser = Backbone.Model.extend({
        defaults: {
            id: '',
            name: '',
            version: '',
            clients: []
        }
    });

    Browsers.BrowserView = Backbone.Marionette.ItemView.extend({
        template: '#browser',
        tagName: 'tr'
    });

    Browsers.browsersList = new (Backbone.Collection.extend({
        model: Browsers.Browser
    }))();

    Browsers.BrowsersListView = App.TableView.extend({
        template: '#browsers',
        itemView: Browsers.BrowserView
    });

    Browsers.controller = {
        show: function () {
            App.header.close();

            App.content.show(new Browsers.BrowsersListView({
                collection: Browsers.browsersList
            }));
        },

        updateBrowsers: function (data) {
            Browsers.browsersList.set(data);
        },

        clearBrowsers: function () {
            Browsers.browsersList.reset();
        },

        updateClient: function (data) {
            // TODO
            console.log('update client', data);
        }
    };

    Browsers.addInitializer(function () {
        var controller = Browsers.controller;

        Browsers.router = new Browsers.Router({
            controller: controller
        });

        App.Sockets.on('browsers:update', controller.updateBrowsers);
        App.Sockets.on('client:update', controller.updateClient);
        App.Sockets.on('disconnect', controller.clearBrowsers);
    });
});
// (function (Ember, App) {

//     App.BrowsersController = Ember.ArrayController.extend({
//         clients: function () {
//             return this.get('content')
//                 .reduce(function (result, current) {
//                     return result.concat(current.clients);
//                 }, []);
//         }.property('content'),

//         sockets: {
//             'browsers:update': function (data) {
//                 this.set('content', data);
//             },
//             'client:update': function (data) {
//                 var client = this.get('clients').findBy('id', data.id);

//                 if (client) Ember.setProperties(client, data);
//             },
//             disconnect: function () {
//                 this.get('content').clear();
//             }
//         }
//     });

// })(Ember, App);
