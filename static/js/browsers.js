(function (Ember, App) {

    App.BrowsersController = Ember.ArrayController.extend({
        clients: function () {
            return this.get('content')
                .reduce(function (result, current) {
                    return result.concat(current.clients);
                }, []);
        }.property('content'),

        sockets: {
            'browsers:update': function (data) {
                this.set('content', data);
            },
            'client:update': function (data) {
                var client = this.get('clients').findBy('id', data.id);

                if (client) Ember.setProperties(client, data);
            },
            disconnect: function () {
                this.get('content').clear();
            }
        }
    });

})(Ember, App);
