(function (window, undefined) {
    var resultsEl = document.createElement('div');

    resultsEl.className = 'results';

    function escapeTags(str) {
        var replacements = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;'
        };

        return str.replace(/[&<>]/g, function (item) {
            return replacements[item] || item;
        });
    }

    function addResult(result) {
        var resEl = document.createElement('li'),
            res = [
                '<p>', result.module, ' - ', result.name,
                '<strong> ', result.success ? result.ignored ? 'IGNORED' : 'PASSED' : 'FAILED', '</strong></p>'
            ],
            i;

        if (!result.success) {
            for (i = 0; i < result.errors.length; i++) {
                res.push('<pre>', escapeTags(result.errors[i]), '</pre>');
            }
        }

        resEl.className = result.success ? result.ignored ? 'warn' : 'ok' : 'fail';
        resEl.innerHTML = res.join('');

        resultsEl.appendChild(resEl);
    }

    addListener = function (target, name, callback, scope) {
        function handler () { callback.call(scope || this); }

        if (target.addEventListener) {
            target.addEventListener(name, handler, false);
        } else if (target.attachEvent) {
            target.attachEvent('on' + name, handler);
        } else {
            target['on' + name] = handler;
        }
    };

    removeListener = function (target, name, callback) {
        if (target.removeEventListener) {
            target.removeEventListener(name, callback, false);
        } else {
            target.detachEvent('on' + name, callback);
        }
    };

    function Bender() {
        this.error = function () {
            console.error.apply(console, arguments);
        };

        this.result = function (result) {
            addResult(result);
        };

        this.log = function () {
            console.log.apply(console, arguments);
        };

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
            this.start = null;
        };

        // stubbed for compability
        // this might be overriden by a framework adapter
        this.start = this.next = this.complete = this.setup = function () {};
    }

    window.bender = new Bender();

    addListener(window, 'load', function () {
        document.body.appendChild(resultsEl);
        bender.ready();
    }, this);

})(this);
