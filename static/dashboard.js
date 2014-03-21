$(function () {
    var $header = $('header'),
        $clients = $('#clients'),
        $tests = $('#tests'),
        $run = $('#run'),
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

        $clients.html(clients.length ? html.join('') : 'none');

        updateRunButton();
    }

    function updateRunButton() {
        $run.toggleClass(
            'disabled',
            checkBusy() || !clients.length
        );
    }

    function handleClick(event) {
        var $target = $(event.target);

        if ($target.prop('nodeName') === 'A') {
            if (!checkBusy() && clients.length) {
                socket.emit('run', [$target.attr('href')]);
            }
            event.preventDefault();
        }

        if ($target.prop('nodeName') === 'INPUT' &&
            $target.parent().parent().hasClass('group')) {
            toggleAll($target);
        }
    }

    function toggleAll(target) {
        var state = target.prop('checked'),
            row = target.parent().parent().next();

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
            .find('tr:not(.group) input:checked')
            .map(function () {
                return this.name;
            })
            .get();
    }

    function runTests() {
        if (checkBusy() || !clients.length) return;

        socket.emit('run', getTests());
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
    $tests.click(handleClick);

    initSocket();
});
