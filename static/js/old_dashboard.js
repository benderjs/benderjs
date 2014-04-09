$(function () {
    var $clients = $('#browsers ul'),
        $status = $('.title span'),
        $tests = $('#testsTable'),
        $menu = $('#menu'),
        $run = $('#run'),
        contextEl = $('#context')[0],
        headerEl = $('header')[0],
        socket,
        status,
        tpl;

    function getTemplates() {
        tpl = {};

        $('script[type="text/x-dot-template"]').each(function (idx, elem) {
            tpl[elem.id.split('-')[0]] = doT.template($(elem).text());
        });
    }

    function updateTests(data) {
        var html = [],
            group,
            test,
            name;

        if (!data) return $tests.empty().addClass('loading');

        for (name in data) {
            if (!(group = data[name])) continue;
            group.name = name;
            html.push(tpl.group(group));

            for (name in group.tests) {
                if (!(test = group.tests[name])) continue;
                html.push(tpl.test(test));
            }
        }

        $tests
            .html(tpl.tests({ html: html.join('') }))
            .removeClass('loading')
            .find('.group')
                .click(clickGroup);
    }

    function updateJobs(data) {
        // TODO
    }

    function updateClients(data) {
        var list = [],
            name;

        if (data) {
            for (name in data) {
                if (data[name]) list.push(data[name]);
            }
        }

        $clients.html(tpl.clients({ clients: list }));
    }

    function clickGroup(event) {
        var $target = $(event.target),
            $this = $(this),
            isCollapsed;

        if ($target.hasClass('toggle')) {
            toggleGroup($target);
            return event.stopPropagation();
        }

        isCollapsed = $this.hasClass('collapsed');

        $this
            .toggleClass('collapsed', !isCollapsed)
            .nextUntil('.group')[isCollapsed ? 'show' : 'hide']();
    }

    function toggleGroup(elem) {
        var state = elem.prop('checked');

        elem.parent().parent()
            .nextUntil('.group')
            .find('input').prop('checked', state);
    }

    function switchTabs(event) {
        var $this = $(this);

        $('section').addClass('hidden');
        $menu.find('.selected').removeClass('selected');
        $this.addClass('selected');
        $($this.attr('href')).removeClass('hidden');

        event.preventDefault();
    }

    function getTests() {
        return $tests
            .find('input:not(.toggle):checked')
            .map(function () {
                return this.name;
            })
            .get();
    }

    function runTests() {
        var tests = getTests();

        if (!tests.length) return;

        $tests.find('.result').empty().removeClass('ok fail');
        $run.addClass('disabled');

        $status.empty();
        status = {
            passed: 0,
            failed: 0,
            runtime: 0
        };

        bender.suite = tests;
        bender.next();

    }

    function startTest(id) {
        $('td[data-id="' + id + '"]').html('Testing...');
    }

    function endTest(data) {
        $('td[data-id="' + data.id + '"]')
            .addClass(data.passed === data.total ? 'ok' : 'fail')
            .html(tpl.result(data));

        updateStatus(data);
    }

    function updateStatus(data) {
        status.passed += data.passed;
        status.failed += data.failed;
        status.runtime += data.runtime;

        $status.html(status.passed + ' passed / ' + status.failed + ' failed in ' + status.runtime + 'ms');
    }

    function setStatus(status) {
        return function () {
            headerEl.className = status;
        };
    }

    function cleanTabs() {
        updateClients(null);
        updateJobs(null);
        updateTests(null);
    }

    function initSocket() {
        var loc = window.location,
            url = 'http://' + loc.hostname + ':' +
                (loc.port || 80) + '/dashboard';

        socket = io.connect(url, {
            'reconnection limit': 2000,
            'max reconnection attempts': 30
        });

        socket
            .on('connect', setStatus('ok'))
            .on('reconnect', setStatus('warn'))
            .on('reconnecting', setStatus('warn'))
            .on('reconnect_failed', setStatus('warn'))
            .on('disconnect', setStatus('fail'))
            .on('connect', function () { socket.emit('register'); })
            .on('disconnect', cleanTabs)
            .on('clients:update', updateClients)
            .on('jobs:update', updateJobs)
            .on('tests:update', updateTests);
    }

    function Bender() {
        this.current = null;
        this.suite = null;

        this.error = function () {
            console.error.apply(console, arguments);
        };

        // stubbed for compatibility
        this.result = function () {};

        this.log = function () {
            console.log.apply(console, arguments);
        };

        this.next = function (details) {
            if (details) {
                details.id = this.current;
                endTest(details);
            }

            this.current = this.suite.shift();

            if (this.current) {
                startTest(this.current);
                contextEl.src = '../tests/' + this.current;
            } else {
                this.complete();
            }
        };

        this.complete = function () {
            contextEl.src = 'about:blank';
            $run.removeClass('disabled');
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
            this.start = null;
        };

        this.addListener = function (target, name, callback, scope) {
            function handler () { callback.call(scope || this); }

            if (target.addEventListener) {
                target.addEventListener(name, handler, false);
            } else if (target.attachEvent) {
                target.attachEvent('on' + name, handler);
            } else {
                target['on' + name] = handler;
            }
        };

        this.removeListener = function (target, name, callback) {
            if (target.removeEventListener) {
                target.removeEventListener(name, callback, false);
            } else {
                target.detachEvent('on' + name, callback);
            }
        };

        this.setup = function (context) {
            context.bender = this;
            context.onerror = this.error;

            this.addListener(context, 'load', this.ready, this);
        };
    }

    function init() {
        $run.click(runTests);
        $menu.find('a').click(switchTabs);
        getTemplates();
        initSocket();
        window.bender = new Bender();
    }

    init();
});
