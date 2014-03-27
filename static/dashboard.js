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

        return tpl.replace(/(?:%)(\w+)(?:%)/gi, function (match, param) {
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

    function toggleCollapse(event) {
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

    function addResult(client, test, result) {
        console.log('result', client, test, result);
        
        var pattern = /[\/\\\%\. \,]+/gi,
            elem = $('#' + test.replace(pattern, '_')).find('.' + client);

        if (!elem.length) return;

        if (result.success) {
            elem.addClass('ok');
        } else {
            elem.addClass('fail').attr('title', result.errors.join(''));
        }
    }

    function complete(id, result) {
        console.log('complete', id, result);
        updateRunButton();
    }

    function setStatus(status) {
        $header[0].className = status;
    }

    function initSocket() {
        socket = io.connect('http://' + window.location.hostname +
            ':' + (window.location.port || 80));

        socket.on('connect', function () {
            setStatus('ok');
            socket.emit('register_dashboard');
        });
        socket.on('reconnect', function () { setStatus('warn'); });
        socket.on('reconnecting', function () { setStatus('warn'); });
        socket.on('reconnect_failed', function () { setStatus('warn'); });
        socket.on('disconnect', function () {
            setStatus('fail');
            updateClientList([]);
        });

        socket.on('client_list', updateClientList);
        socket.on('result', addResult);
        socket.on('complete', complete);
    }

    $run.click(runTests);
    $menu.find('a').click(handleTabs);

    $tests.click(testClick);
    $tests.find('.group').click(toggleCollapse);
    $tests.find('.toggle').click(toggleGroup);

    $('#results').hide();

    initSocket();
});
