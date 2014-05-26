App.module('Tests', function (Tests, App, Backbone) {

    /**
     * Tests Router
     */
    Tests.Router = Marionette.AppRouter.extend({
        name: 'tests',

        appRoutes: {
            'tests': 'listTests'
        }
    });

    /**
     * Tests status model
     */
    Tests.testStatus = new (Backbone.Model.extend({
        defaults: {
            passed: 0,
            failed: 0,
            time: 0,
            completed: 0,
            total: 0,
            tags: [],
            running: false
        },

        timeToText: function (ms) {
            var h, m, s;

            s = Math.floor(ms / 1000);
            ms %= 1000;
            m = Math.floor(s / 60);
            s %= 60;
            h = Math.floor(m / 60);
            m %= 60;

            return h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' +
                (s < 10 ? '0' : '') + s + 's ' +
                (ms < 10 ? '00' : ms < 100 ? '0' : '') + ms + 'ms';
        },

        increment: function (name, value) {
            this.set(name, this.get(name) + value);
        },

        reset: function () {
            this.set(this.defaults);
        },

        update: function (data) {
            if (typeof data == 'object' && data !== null) {
                this.increment('passed', data.passed);
                this.increment('failed', data.failed);
                this.increment('time', data.duration);
                this.increment('completed', 1);
            }
        },

        toJSON: function () {
            var json = _.clone(this.attributes);

            json.timeText = this.timeToText(json.time);
            json.percent = json.total > 0 ?
                Math.ceil(json.completed / json.total * 100) : 0;

            return json;
        },

        start: function (total) {
            this.reset();
            this.set('running', true).set('total', total);
        },

        stop: function () {
            this.set('running', false);
        }
    }))();

    /**
     * Tests header view
     */
    Tests.TestHeaderView = Backbone.Marionette.ItemView.extend({
        template: '#test-header',
        className: 'row',

        ui: {
            'run': '.run-button',
            'create': '.create-button',
            'filter': '.tag-filter',
            'clear': '.clear-filter'
        },

        events: {
            'click @ui.run': 'runTests',
            'click @ui.create': 'createJob',
            'click @ui.clear': 'clearFilter',
            'change @ui.filter': 'filterTags',
            'click .dropdown-menu a': 'addFilter'
        },

        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },

        runTests: function () {
            var ids;

            if (!this.model.get('running')) {
                Tests.filteredList.clearResults();

                ids = Tests.filteredList.getIds();
                this.model.start(ids.length);
                bender.run(ids);
            } else {
                bender.stop();
                this.model.stop();
            }
        },

        createJob: function () {
            // TODO to be moved to jobs tab?
            console.log('create job');
        },

        addFilter: function (event) {
            var tag = $(event.target).text(),
                filter = this.ui.filter,
                tags = filter.val().split(/\s+/);

            if (tags.indexOf(tag) === -1) tags.push(tag);

            filter.val(tags.join(' ')).change();
        },

        filterTags: function () {
            var filter = this.ui.filter.val();

            this.ui.clear.css('display', filter ? 'inline-block' : 'none');

            Tests.filteredList.reset(Tests.testsList.filterTests(filter));
        },

        clearFilter: function () {
            this.ui.filter.val('').change();
        }
    });

    /**
     * Test model
     */
    Tests.Test = Backbone.Model.extend({
        defaults: {
            id: '',
            group: '',
            tags: '',
            result: '',
            status: ''
        }
    });

    /**
     * Test view
     */
    Tests.TestView = Backbone.Marionette.ItemView.extend({
        template: '#test',
        tagName: 'tr',

        ui: {
            icon: '.glyphicon',
            result: '.result'
        },

        initialize: function () {
            this.listenTo(this.model, 'change', this.updateStatus);
        },

        updateStatus: function () {
            var model = this.model.toJSON();

            this.el.className = model.status ?
                model.status + ' bg-' + model.status + ' text-' + model.status :
                '';

            this.ui.icon[0].className = 'glyphicon' + (model.status ?
                ' glyphicon-' + (model.status === 'success' ? 'ok' : 'remove') :
                '');

            this.ui.result.text(model.result);
        }
    });

    /**
     * Tests collection
     */
    Tests.testsList = new (Backbone.Collection.extend({
        model: Tests.Test,
        url: '/tests',

        parse: function (response) {
            this.getTags(response.test);

            return response.test;
        },

        getTags: function(tests) {
            var tags = [],
                negTags = [];

            _.each(tests, function (test) {
                tags = tags.concat(test.tags.split(', '));
            });

            tags = _.uniq(tags).sort();

            negTags = _.map(tags, function (tag) {
                return '-' + tag;
            });

            tags = tags.concat(negTags);

            Tests.testStatus.set('tags', tags);
        },

        filterTests: function (filter) {
            var includes = [],
                excludes = [],
                filtered,
                tags;

            if (!filter) return this.toJSON();
            
            tags = filter.split(/\s+/);

            _.each(tags, function (tag) {
                if (tag.charAt(0) === '-') excludes.push(tag.slice(1));
                else if (tag) includes.push(tag);
            });

            filtered = this.filter(function (test) {
                var tags = test.get('tags').split(', '),
                    result = true;

                if (includes.length) {
                    result = _.any(tags, function (tag) {
                        return includes.indexOf(tag) > -1;
                    });
                }

                if (excludes.length) {
                    result = !_.any(tags, function (tag) {
                        return excludes.indexOf(tag) > -1;
                    });
                }

                return result;
            });

            return filtered;
        }
    }))();

    /**
     * Filtered tests collection
     */
    Tests.filteredList = new (Backbone.Collection.extend({
        getIds: function () {
            return this.map(function (test) {
                return test.get('id');
            });
        },

        update: function (data) {
            var model;

            if (typeof data == 'string') {
                model = this.get(data);

                if (model) model.set('result', 'Running...');
            } else if (typeof data == 'object' && data !== null) {
                model = this.get(data.id);
                if (model) {
                    model
                        .set('result', this.buildResult(data))
                        .set('status', data.success ? 'success' : 'danger');
                }
            }
        },

        buildResult: function (data) {
            var result = [];

            result.push(data.passed, 'passed', '/');
            result.push(data.failed, 'failed');
            if (data.ignored) result.push('/', data.ignored, 'ignored');
            result.push('in', data.duration + 'ms');

            return result.join(' ');
        },

        clearResults: function () {
            this.each(function (test) {
                test.set('result', '').set('status', '');
            });
        }
    }))();

    /**
     * Test list view
     */
    Tests.TestsListView = Backbone.Marionette.CompositeView.extend({
        template: '#tests',
        itemView: Tests.TestView,

        appendHtml: function (collView, itemView) {
            if (collView.isBuffering) collView.elBuffer.appendChild(itemView.el);
            else collView.$('tbody').append(itemView.el);
        },

        appendBuffer: function (collView, buffer) {
            collView.$('tbody').append(buffer);
        }
    });

    /**
     * Tests controller
     * @type {Object}
     */
    Tests.controller = {
        listTests: function () {
            App.header.show(new Tests.TestHeaderView({
                model: Tests.testStatus
            }));

            App.content.show(new Tests.TestsListView({
                collection: Tests.filteredList
            }));

            Tests.testsList.fetch({
                success: function () {
                    Tests.filteredList.reset(Tests.testsList.filterTests());
                }
            });
        }
    };

    /**
     * Add initialzier for tests module
     */
    Tests.addInitializer(function () {
        // create router instance
        new Tests.Router({
            controller: Tests.controller
        });

        // attach event listeners
        Tests.on('tests:list', function () {
            App.navigate('tests');
            Tests.controller.listTests();
        });

        bender.on('update', function (data) {
            Tests.testStatus.update(data);
            Tests.filteredList.update(data);
        });

        bender.on('complete', function () {
            Tests.testStatus.stop();
        });
    });
});
