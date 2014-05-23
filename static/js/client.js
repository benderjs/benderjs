(function () {
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
                    '<strong> ', result.success ? result.ignored ?
                        'IGNORED' : 'PASSED' : 'FAILED', '</strong></p>'
                ],
            i;

        if (!result.success) res.push('<pre>', escapeTags(result.error), '</pre>');

        resEl.className = result.success ? result.ignored ? 'warn' : 'ok' : 'fail';
        resEl.innerHTML = res.join('');

        resultsEl.appendChild(resEl);
    }

    var bender,
        init;

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

        this.start = this.next = this.complete = function () {};
    }

    if (parent && parent.bender && parent.bender.runAsChild) {
        bender = {
            result: function (result) {
                parent.bender.result(JSON.stringify(result));
            },
            next: function (result) {
                parent.bender.next(JSON.stringify(result));
            }
        };

        window.error = function (error) {
            parent.bender.error(JSON.stringify(error));
        };

        init = function () {
            bender.start();
        };
    } else {
        bender = new Bender();
        init = function () {
            document.body.appendChild(resultsEl);
            bender.start();
        };
    }

    window.bender = bender;

    if (window.addEventListener) window.addEventListener('load', init, false);
    else if (window.attachEvent) window.attachEvent('onload', init);
    else window['onload'] = init;
})();
