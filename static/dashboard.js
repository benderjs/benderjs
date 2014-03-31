$(function () {
    var $header = $('header'),
        $clients = $('#clients'),
        $tests = $('#testsTable'),
        $results = $('#resultsTable'),
        $run = $('#run'),
        $menu = $('#menu'),
        clients = null,
        socket;

    function template(tpl, params) {
        var args = Array.prototype.slice.call(arguments, 1);

        return tpl.replace(/(?:%)(\w+)(?:%)/g, function (match, param) {
            return typeof params == 'object' ? params[param] : args.shift() || '';
        });
    }

    function updateClientList(list) {
        var tpl = '<li class="%browserName%">%ua% - <strong class="%busyText%">%busyText%</strong></li>',
            html = [],
            client,
            i;

        clients = list;

        $clients.empty();
        
        for (i = 0; i < clients.length; i++) {
            client = clients[i];
            client.browserName = (client.ua.split('/')[0].split(' ')[0] || '').toLowerCase();
            client.busyText = client.busy ? 'busy' : 'ready';

            html.push(template(tpl, client));
        }

        $clients.html(clients.length ? html.join('') : '<li>none</li>');

        updateRunButton();
    }

    function updateTestList(tests) {
        var html = ['<thead><tr><th></th><th>ID</th><th>Tags</th></tr></thead><tbody>'],
            groupTpl = ['<tr class="group">',
                        '<td><input type="checkbox" checked="checked" class="toggle"></td>',
                        '<td><span>Group:</span> %name%</td>',
                        '<td></td></tr>'].join(''),
            testTpl = ['<tr><td><input type="checkbox" name="%id%" checked="checked"></td>',
                        '<td><a href="%id%">%id%</a></td>',
                        '<td>%tags%</td></tr>'].join(''),
            group,
            test,
            name;

        if (!tests) return $tests.empty().addClass('loading');

        for (name in tests) {
            group = tests[name];
            
            if (!group) continue;
            
            html.push(template(groupTpl, name));

            for (name in group.tests) {
                test = group.tests[name];
                if (!test) continue;
                html.push(template(testTpl, test));
            }
        }

        html.push('</tbody>');

        $tests.html(html.join('')).removeClass('loading');

        $tests.find('.group').click(toggleCollapse);
        $tests.find('.toggle').click(toggleGroup);
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
            collapsed = $this.hasClass('collapsed');

        $this[collapsed ? 'removeClass' : 'addClass']('collapsed');
        $this.nextUntil('.group')[collapsed ? 'show' : 'hide']();
    }

    function handleTabs(event) {
        switchTab($(this).attr('href').substring(1));
        event.preventDefault();
    }

    function switchTab(name) {
        $('section').hide();
        $menu.find('.selected').removeClass('selected');
        $menu.find('a[href="#' + name +'"]').addClass('selected');
        $('#' + name).show();
    }

    function toggleGroup(event) {
        var $this = $(this),
            state = $this.prop('checked');

        $this.parent().parent().nextUntil('.group').find('input').prop('checked', state);
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
        var thTpl = '<th class="result %browserName%" title="%ua%"></th>',
            tdTpl = '<td class="result %id%"></td>',
            trTpl = '<tr id="%s%"><td>%s%</td>%s%<td></td></tr>',
            pattern = /[\/\\\%\. \,]/gi,
            clientHeader = [],
            clientBody = [],
            html = [];

        $.each(clients, function (idx, client) {
            clientHeader.push(template(thTpl, client));
            clientBody.push(template(tdTpl, client));
        });

        html.push('<thead><tr><th>ID</th>');
        html = html.concat(clientHeader);
        html.push('<th></th></tr></thead><tbody>');
        
        clientBody = clientBody.join('');

        $.each(tests, function (idx, test) {
            html.push(template(trTpl, test.replace(pattern, '_'), test, clientBody));
        });

        html.push('</tbody>');

        $results.html(html.join(''));
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
        $header[0].className = status;
    }

    function initSocket() {
        socket = io.connect('http://' + window.location.hostname +
            ':' + (window.location.port || 80) + '/dashboard');

        socket.on('connect', function () {
            setStatus('ok');
            socket.emit('register');
        });
        socket.on('reconnect', function () { setStatus('warn'); });
        socket.on('reconnecting', function () { setStatus('warn'); });
        socket.on('reconnect_failed', function () { setStatus('warn'); });
        socket.on('disconnect', function () {
            setStatus('fail');
            updateClientList([]);
            updateTestList(null);
        });

        socket.on('clients:update', updateClientList);
        socket.on('tests:update', updateTestList);
        socket.on('result', addResult);
        socket.on('complete', complete);
    }

    $run.click(runTests);
    $menu.find('a').click(handleTabs);

    $tests.click(testClick);

    $('#results').hide();

    initSocket();
});
