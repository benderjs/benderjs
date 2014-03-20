(function () {
    var host = /^[a-z]+:\/\/([^\/]+)/.exec(window.location)[1].split(":"),
        runBtnEl = document.getElementById('runBtn'),
        clientsEl = document.getElementById('clients'),
        testsEl = document.getElementById('tests'),
        socket = io.connect('http://' + host[0] + ':' + (host[1] || 80)),
        clients = [],
        results = {};

    runBtnEl.onclick = runTests;

    function updateClientList(list) {
        var html = [],
            client,
            i;

        clients = list;

        for (i = 0; i < list.length; i++) {
            client = list[i];
            html.push('<li>', client.ua, ' <strong>', (client.busy ? 'Busy' : 'Ready'), '</strong></li>');
            if (!results[client.id]) {
                results[client.id] = {};
            }
        }

        clientsEl.innerHTML = html.join('') || 'none';
        updateRunButton();
    }

    function checkBusy() {
        var i;

        for (i = 0; i < clients.length; i++) {
            if (clients[i].busy) return true;
        }

        return false;
    }

    function updateRunButton() {
        runBtnEl.className = (!checkBusy() && clientsEl.getElementsByTagName('li').length) ?
            'btn' : 'btn disabled';
    }

    function addResult(id, spec, result) {
        // TODO pass it to the table
        console.log('result', id, spec, result);
    }

    function clearResults() {
        var elems = tests.getElementsByClassName('results'),
            i = elems.length - 1;

        while (i >= 0) {
            elems[i].innerHTML = '';
            i--;
        }

        for (i in results) {
            results[i] = {};
        }
    }

    function getTests() {
        var checks = testsEl.getElementsByTagName('input'),
            tests = [],
            len,
            i;

        for (i = 0, len = checks.length; i < len; i++) {
            if (checks[i].checked) {
                tests.push(checks[i].name);
            }
        }

        socket.emit('run', tests);
    }

    function runTests() {
        updateRunButton();
        clearResults();
        getTests();
    }

    function complete(id, result) {
        console.log('complete', id, result);
        updateRunButton();
    }

    socket.on('client_list', updateClientList);
    socket.on('result', addResult);
    socket.on('complete', complete);
    socket.on('disconnect', function () {
        updateClientList([]);
    });

    function register() {
        socket.emit('register_dashboard');
    }

    socket.on('connect', register);

    updateRunButton();
})();
