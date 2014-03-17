(function () {
    var host = /^[a-z]+:\/\/([^\/]+)/.exec(window.location)[1].split(":"),
        runBtnEl = document.getElementById('runBtn'),
        clientsEl = document.getElementById('clients'),
        testsEl = document.getElementById('tests'),
        socket = io.connect('http://' + host[0] + ':' + (host[1] || 80)),
        isRunning = false;

    runBtnEl.onclick = runTests;

    function updateClientList(list) {
        clientsEl.innerHTML = list.map(function (client) {
            return '<li>' + client.ua + ' <strong>' + (client.busy ? 'Busy' : 'Ready') + '</strong></li>';
        }).join('') || 'none';
        updateRunButton();
    }

    function updateRunButton() {
        runBtnEl.className = (!isRunning && clientsEl.getElementsByTagName('li').length) ?
            'btn' : 'btn disabled';
    }

    function addResult(result) {
        // TODO pass it to the table
        console.log('result', result);
    }

    function clearResults() {
        var elems = tests.getElementsByClassName('results'),
            i = elems.length - 1;

        while (i >= 0) {
            elems[i].innerHTML = '';
            i--;
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
        if (!isRunning) {
            isRunning = true;
            updateRunButton();
            clearResults();
            getTests();
        }
    }

    function complete() {
        isRunning = false;
        updateRunButton();
    }

    socket.on('client_list', updateClientList);
    socket.on('result', addResult);
    socket.on('complete', complete);
    socket.on('disconnect', function () {
        updateClientList([]);
    });

    updateRunButton();
})();
