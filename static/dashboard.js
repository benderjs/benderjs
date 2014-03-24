$(function () {
    var $header = $('header'),
        $clients = $('#clients'),
        $tests = $('#tests'),
        $results = $('#resultsBody'),
        $run = $('#run'),
        $menu = $('#menu'),
        clients = [],
        socket;

    function template(tpl, params) {
        return tpl.replace(/(?:%)(\w+)(?:%)/gi, function (match, param) {
            return params[param];
        });
    }

    function updateClientList(list) {
        var tpl = '<li class="%browserName%">%ua% - <strong>%busyText%</strong></li>',
            html = [],
            client,
            i;

        clients = list;

        $clients.empty();
        
        for (i = 0; i < clients.length; i++) {
            client = clients[i];
            client.browserName = (client.ua.split('/')[0].split(' ')[0] || '').toLowerCase();
            client.busyText = client.busy ? 'Busy' : 'Ready';

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
            collapsed = $this.hasClass('collapsed'),
            next = $this.next();

        $this[collapsed ? 'removeClass' : 'addClass']('collapsed');

        while (next && next.length && !next.hasClass('group')) {
            next[collapsed ? 'show' : 'hide']();
            next = next.next();
        }
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
            state = $this.prop('checked'),
            row = $this.parent().parent().next();

        event.stopPropagation();

        while (row && row.length && !row.hasClass('group')) {
            row.find('input').prop('checked', state);
            row = row.next();
        }
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

        $results.empty();

        switchTab('results');
        socket.emit('run', typeof test == 'string' ? [test] : getTests());
    }

    function complete(id, result) {
        console.log('complete', id, result);
        updateRunButton();
    }

    function addResult(client, test, result) {
        console.log('result', client, test, result);
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
