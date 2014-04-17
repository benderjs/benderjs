(function (window, undefined) {

    var resultsEl = document.getElementById('results');

    function addResult(result) {
        var resEl = document.createElement('li');

        resEl.className = result.success ? 'ok' : 'fail';

        resEl.innerHTML = [
            '<p>', result.module, result.name,
            '<strong>', result.success ? 'PASSED' : 'FAILED', '</strong>',
            result.failed, '/', result.passed, '/', result.total, '</p>',
            result.failed ? ('<p>' + result.errors.join('</p><p>').replace(/\n/g, '<br>') + '</p>') : null
        ].join(' ');

        resultsEl.appendChild(resEl);
    }

    function Bender() {
        this.assert = null;

        this.error = function () {
            console.error.apply(console, arguments);
        };

        this.result = function (result) {
            this.log(result);
            addResult(result);
        };

        this.log = function () {
            console.log.apply(console, arguments);
        };

        // stubbed for compability
        this.next = this.complete = function () {};

        // this will be overriden by a framework adapter
        this.start = this.complete;

        this.ready = function () {
            if (typeof this.start == 'function') this.start();
            this.start = null;
        };

        this.addListener = function (target, name, callback, scope) {
            function handler () { callback.call(scope || this); }

            if (target.addEventListener) {
                target.addEventListener(name, handler, false);
            } else if (target.attachEvent) {
                target.attachEvent('on' + name, handler);
            } else {
                target['on' + name] = handler;
            }
        };

        this.removeListener = function (target, name, callback) {
            if (target.removeEventListener) {
                target.removeEventListener(name, callback, false);
            } else {
                target.detachEvent('on' + name, callback);
            }
        };

        this.setup = function (context) {
            context.bender = this;
            context.onerror = this.error;

            this.addListener(context, 'load', this.ready, this);
        };
    }

    window.bender = new Bender();

})(this);
