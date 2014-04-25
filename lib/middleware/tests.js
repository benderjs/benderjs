/**
 * @file Builds test context, serves test assets
 */

var fs = require('fs'),
    path = require('path'),
    send = require('send'),
    combine = require('dom-combiner'),
    whenKeys = require('when/keys'),
    whenNode = require('when/node'),
    readFile = whenNode.lift(fs.readFile),
    logger = require('../logger');

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(bender) {
    var defaultTemplatePath = path.join(__dirname, '../../static/default.html'),
        defaultTemplate;

    /**
     * Build test context for the given test
     * @param  {Test}   test Test object
     * @return {String}
     */
    function build(test) {
        var data = {
                apps: bender.applications.get(test.applications),
                assert: bender.plugins.get('assertion', test.assertion)
            };

        if (defaultTemplate) {
            data.default = defaultTemplate;
        } else {
            data.default = readFile(defaultTemplatePath)
                .then(function (data) {
                    defaultTemplate = data.toString();
                    return defaultTemplate;
                });
        }
        if (test.html) data.html = readFile(test.html);
        if (test.js) data.js = readFile(test.js);

        return whenKeys
            .all(data)
            .then(buildTemplate);
    }

    /**
     * Build a HTML template from given test data
     * @param  {Object} data         Test data
     * @param  {Array}  data.apps    Applications required by test
     * @param  {Objet}  data.assert  Test assertion files
     * @param  {String} data.default Default test template
     * @param  {String} [data.html]  Test HTML content
     * @param  {String} data.js      Test script
     * @return {String} Context HTML
     */
    function buildTemplate(data) {
        var toCombine = [data.default],
            head = ['<head>'];

        /**
         * Append to head link/script tags created from src object
         * @param {Object}         src       Source object
         * @param {Array.<String>} [src.css] Paths to stylesheets
         * @param {Array.<String>} [src.js]  Paths to scripts
         */
        function addToHead(src) {
            src.css.forEach(function (css) {
                head.push('<link rel="stylesheet" href="' + css + '">');
            });
            src.js.forEach(function (js) {
                head.push('<script src="' + js + '"></script>');
            });
        }

        // add scripts and styles to <head>
        addToHead(data.assert);
        data.apps.forEach(addToHead);
        head.push('</head>');
        toCombine.push(head.join(''));

        // add test html to combine
        if (data.html) toCombine.push(data.html.toString());

        if (data.js) {
            toCombine.push('<script>(function (bender) {' +
                data.js.toString() + '})(window.bender || {});</script>');
        }


        return combine(toCombine);
    }

    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            filePath,
            file,
            ext;

        function resume(err) {
            if (err) logger.error(err);
            next();
        }

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        file = url.slice(1).join('/');

        // serve list of all tests
        if (!file) {
            return bender.tests
                .list()
                .done(function (data) {
                    bender.utils.renderJSON(res, {
                        test: data
                    });
                }, resume);
        }

        bender.tests
            .get(decodeURIComponent((ext = path.extname(file)) ? file.replace(ext, '') : file))
            .done(function (test) {
                // host assets from a test directory
                if (!test) return send(req, file).on('error', resume).pipe(res);
                
                // render test context page
                filePath = bender.cache.getPath(test.id);
                // server from the cache
                if (filePath) {
                    send(req, filePath).on('error', resume).pipe(res);
                // write to the cache and render
                } else {
                    build(test)
                        .then(function (data) {
                            return bender.cache.write(test.id, data);
                        })
                        .done(function (content) {
                            bender.utils.renderHTML(res, content);
                        }, resume);
                }
            }, resume);
    };
}

module.exports.create = create;
