$(function () {
    var $header = $('header'),
        $clients = $('#clients'),
        $tests = $('#testsTable'),
        $results = $('#resultsTable'),
        $run = $('#run'),
        $menu = $('#menu'),
        tpl = getTemplates(),
        clients = null,
        tests = null,
        socket;

    function getTemplates() {
        var tpl = {};

        $('script[type="text/x-dot-template"]').each(function (idx, elem) {
            tpl[elem.id.split('-')[0]] = doT.template(elem.innerText);
        });

        return tpl;
    }

    function updateClientList(list) {
        clients = list;
        $clients.html(tpl.clients({ clients: list }));
        updateRunButton();
    }

    function updateTestList(list) {
        var html = [],
            group,
            test,
            name;

        if (!list) return $tests.empty().addClass('loading');

        $tests
            .html(tpl.tests({ html: html.join('') }))
            .removeClass('loading');

        tests = {};

        for (name in list) {
            if (!(group = list[name])) continue;
            group.name = name;
            html.push(tpl.group(group));

            for (name in group.tests) {
                
                if (!(test = group.tests[name])) continue;
                
                tests[test.id] = {
                    id: test.id,
                    tags: test.tags,
                    el: $(tpl.test(test))
                };

                html.push(tests[test.id].el);
            }
        }

        $tests
            .find('tbody')
            .append(html)
            .find('.group').click(toggleCollapse);
    }

    function updateRunButton() {
        $run.toggleClass('disabled',checkBusy() || !clients.length);
    }

    function testClick(event) {
        var $target = $(event.target);

        if ($target.hasClass('run')) {
            runTests($target.data('id'));
            return event.preventDefault();
        }

        if ($target.hasClass('toggle')) {
            toggleGroup($target);
            return event.stopPropagation();
        }
    }

    function toggleCollapse() {
        var $this = $(this),
            isCollapsed = $this.hasClass('collapsed');

        $this
            .toggleClass('collapsed', !isCollapsed)
            .nextUntil('.group')[isCollapsed ? 'show' : 'hide']();
    }

    function handleTabs(event) {
        switchTab($(this).attr('href').substring(1));
        event.preventDefault();
    }

    function switchTab(name) {
        $('section').addClass('hidden');
        
        $menu
            .find('.selected').removeClass('selected').end()
            .find('a[href="#' + name +'"]').addClass('selected');

        $('#' + name).removeClass('hidden');
    }

    function toggleGroup(elem) {
        var state = elem.prop('checked');

        elem.parent().parent()
            .nextUntil('.group')
            .find('input').prop('checked', state);
    }

    function checkBusy() {
        var i;

        for (i = 0; i < clients.length; i++) {
            if (clients[i].busy) return true;
        }

        return false;
    }

    function getTests() {
        return $tests
            .find('input:not(.toggle):checked')
            .map(function () {
                return this.name;
            })
            .get();
    }

    function runTests(test) {
        if (checkBusy() || !clients.length) return;

        test = typeof test == 'string' ? [test] : getTests();

        prepareResults(test);
        switchTab('results');
        socket.emit('run', test);
    }

    function prepareResults(tests) {
        var clientsHtml = tpl.client({ clients: clients }),
            html = [],
            i;
        
        for (i = 0; i < tests.length; i++) {
            html.push(tpl.result({
                id: tests[i],
                clients: clientsHtml
            }));
        }

        $results.html(tpl.results({
            clients: clients,
            html: html.join('')
        }));
    }

    function addResult(data) {
        var elem = $('tr[data-id="' + data.suite + '"]')
            .find('td[data-id="' + data.client + '"]');

        if (!elem.length) return;

        if (data.result.success) {
            elem.addClass('ok');
        } else {
            elem.addClass('fail').attr('title', data.result.errors.join(''));
        }
    }

    function setReady(id) {
        if (!tests[id]) return;

        tests[id].el.find('.status')
            .removeClass('running').addClass('ready');
    }

    function setRunning(data) {
        var test,
            i;

        for (i = 0; i < data.length; i++) {
            test = tests[data[i]];
            if (test) {
                test.el.find('.status')
                    .removeClass('ready').addClass('running');
            }
        }
    }

    function complete(data) {
        console.log('complete', data);
        updateRunButton();
    }

    function setStatus(status) {
        return function () {
            $header[0].className = status;
        };
    }

    function initSocket() {
        var loc = window.location;

        socket = io.connect(
            'http://' + loc.hostname + ':' + (loc.port || 80) + '/dashboard',
            {
                'reconnection limit': 2000,
                'max reconnection attempts': 30
            });

        socket
            .on('connect', setStatus('ok'))
            .on('reconnect', setStatus('warn'))
            .on('reconnecting', setStatus('warn'))
            .on('reconnect_failed', setStatus('warn'))
            .on('disconnect', setStatus('fail'))
            .on('connect', function () {
                socket.emit('register');
            })
            .on('disconnect', function () {
                updateClientList([]);
                updateTestList(null);
            })
            .on('clients:update', updateClientList)
            .on('tests:update', updateTestList)
            .on('run', setRunning)
            .on('result', addResult)
            .on('complete', complete);
    }

    $run.click(runTests);
    $menu.find('a').click(handleTabs);
    $tests.click(testClick);

    initSocket();
});
