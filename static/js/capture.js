(function () {
    var statusEl = document.getElementById('status'),
        isIE = navigator.userAgent.match(/msie (\d+)/i),
        oldIE = isIE && isIE[1] < 9,
        fetchInterval = null,
        states = {
            CONNECT: 0,
            RECONNECT: 1,
            RECONNECT_FAIL: 2,
            RECONNECTING: 3,
            DISCONNECT: 4
        },
        socket;

    function clone(src) {
        var output,
            i;

        if (src === null || typeof src !== 'object') return src;

        if (typeof src == 'object') {
            output = {};

            for (i in src) {
                if (src.hasOwnProperty(i)) output[i] = clone(src[i]);
            }

            return output;
        }

        return src;
    }

    function Bender(socket) {
        var testFrame = document.getElementById('context'),
            testTimeout = null,
            testWindow = null,
            runs = 0,
            that = this;

        this.assert = null;
        this.running = false;
        this.results = null;

        function clearTestTimeout() {
            if (testTimeout) clearTimeout(testTimeout);
        }

        function resetTestTimeout() {
            if (!BENDER_TEST_TIMEOUT) return;

            clearTestTimeout();

            testTimeout = setTimeout(function () {
                // reload the page if frozen
                if (testWindow) testWindow.close();
                window.location.reload();
            }, BENDER_TEST_TIMEOUT);
        }

        this.error = function (error) {
            socket.emit('error', error);
        };

        this.result = function (result) {
            // workaround for IE8 and popup issues
            if (isIE) result = clone(result);

            if (!result.success) this.results.success = false;

            this.results.results[result.name] = result;

            resetTestTimeout();
        };

        this.next = function (id) {
            if (typeof id == 'string') {
                runs++;

                if (isIE) {
                    if (runs >= 20 && testWindow) {
                        testWindow.close();
                        setTimeout(function () {
                            runs = 0;
                            window.open(id, 'bendertest');
                        }, 300);
                    } else {
                        testWindow = window.open(id, 'bendertest');
                    }
                } else {
                    testFrame.src = id;
                }

                resetTestTimeout();
            } else {
                this.complete();
            }
        };


        this.complete = function () {
            clearTestTimeout();
            socket.emit('complete', this.results);
            
            if (!isIE) testFrame.src = 'about:blank';

            this.running = false;
            this.results = null;
            socket.emit('fetch');
        };

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.log = function () {
            socket.emit('log', Array.prototype.join.call(arguments, ' '));
        };

        this.setup = function (context, steal) {
            context.bender = this;

            if (steal) context.onerror = this.error;

            function stealLogs() {
                var commands = ['log', 'info', 'warn', 'debug', 'error'],
                    replace = function(command) {
                        var old = context.console[command];

                        context.console[command] = function () {
                            that.log(arguments);
                            if (old) Function.prototype.apply.call(old, context.console, arguments);
                        };
                    },
                    i;

                context.console = context.console || {};

                for (i = 0; i < commands.length; i++) {
                    replace(commands[i]);
                }

                context.alert = function (msg) {
                    that.log(msg);
                };
            }

            if (steal) stealLogs();
        };

        // handle socket run message
        socket.on('run', function (data) {
            data.results = {};
            data.success = true;

            that.results = data;
            that.running = true;

            that.next(data.id);
        });
    }

    function startFetch() {
        fetchInterval = setInterval(function () {
            if (!bender.running) socket.emit('fetch');
        }, 2000);
    }

    function stopFetch() {
        if (fetchInterval) clearInterval(fetchInterval);
    }

    function setStatus(status) {
        var messages = [
                'Connected', 'Reconnected', 'Failed to reconnect',
                'Reconnecting in ', 'Disconnected'
            ];

        return function (options) {
            statusEl.innerHTML = messages[status] + (options ? options + 'ms...' : '');
            statusEl.className = status === states.CONNECT ? 'ok' :
                (status === states.RECONNECT || status === states.RECONNECTING) ? 'warn' :
                (status === states.RECONNECT_FAIL || states.DISCONNECT) ? 'fail' : '';
        };
    }

    socket = io.connect(
        'http://' + window.location.hostname + ':' + (window.location.port || 80) + '/client',
        {
            'reconnection delay': 2000,
            'reconnection limit': 2000,
            'max reconnection attempts': Infinity
        }
    );

    // handle socket connection status
    socket
        .on('connect', setStatus(states.CONNECT))
        .on('connect', function () {
            var id = /\/clients\/([^\/]+)/.exec(window.location)[1];

            socket.emit('register', {
                id: id,
                ua: navigator.userAgent
            }, startFetch);

            
        })
        .on('reconnect', setStatus(states.RECONNECT))
        .on('reconnect_failed', setStatus(states.RECONNECT_FAIL))
        .on('reconnecting', setStatus(states.RECONNECTING))
        .on('disconnect', setStatus(states.DISCONNECT))
        .on('disconnect', stopFetch);

    window.bender = new Bender(socket);

})();
