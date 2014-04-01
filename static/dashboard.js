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
            name;

        tests = list;

        if (!tests) return $tests.empty().addClass('loading');

        for (name in tests) {
            if (!(group = tests[name])) continue;
            group.name = name;
            html.push(tpl.group(group));

            for (name in group.tests) {
                if (group.tests[name]) html.push(tpl.test(group.tests[name]));
            }
        }

        $tests
            .html(tpl.tests({ html: html.join('') }))
            .removeClass('loading')
            .find('.group').click(toggleCollapse).end()
            .find('.toggle').click(toggleGroup);
    }

    function updateRunButton() {
        $run.toggleClass('disabled',checkBusy() || !clients.length);
    }

    function testClick(event) {
        var $target = $(event.target);

        if ($target.prop('nodeName') === 'A') {
            runTests($target.attr('href'));
            event.preventDefault();
        }
    }

    function toggleCollapse() {
        var $this = $(this),
            isCollapsed = $this.hasClass('collapsed');

        $this
            .toggleClas('collapsed', isCollapsed)
            .nextUntil('.group')[isCollapsed ? 'show' : 'hide']();
    }

    function handleTabs(event) {
        switchTab($(this).attr('href').substring(1));
        event.preventDefault();
    }

    function switchTab(name) {
        $('section').hide();
        
        $menu
            .find('.selected').removeClass('selected').end()
            .find('a[href="#' + name +'"]').addClass('selected');

        $('#' + name).show();
    }

    function toggleGroup(event) {
        var $this = $(this),
            state = $this.prop('checked');

        $this.parent().parent()
            .nextUntil('.group')
            .find('input').prop('checked', state);

        event.stopPropagation();
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
        var tests;

        if (checkBusy() || !clients.length) return;

        tests = typeof test == 'string' ? [test] : getTests();

        prepareResults(tests);

        switchTab('results');
        socket.emit('run', tests);
    }

    function prepareResults(tests) {
        var pattern = /[\/\\\%\. \,]/gi,
            clientsHtml = tpl.client({ clients: clients }),
            html = [],
            i;
        
        for (i = 0; i < tests.length; i++) {
            html.push(tpl.result({
                id: tests[i],
                idEsc: tests[i].replace(pattern, '_'),
                clients: clientsHtml
            }));
        }

        $results.html(tpl.results({
            clients: clients,
            html: html.join('')
        }));
    }

    function addResult(data) {
        var pattern = /[\/\\\%\. \,]+/g,
            elem = $('#' + data.suite.replace(pattern, '_')).find('.' + data.client);

        if (!elem.length) return;

        if (data.result.success) {
            elem.addClass('ok');
        } else {
            elem.addClass('fail').attr('title', data.result.errors.join(''));
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
            .on('result', addResult)
            .on('complete', complete);
    }

    $run.click(runTests);
    $menu.find('a').click(handleTabs);
    $tests.click(testClick);
    $('#results').hide();

    initSocket();
});
