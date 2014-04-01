/**
 * @file Builds test context, serves test assets
 */

var fs = require('fs'),
    path = require('path'),
    cheerio = require('cheerio'),
    send = require('send'),
    whenNode = require('when/node'),
    whenKeys = require('when/keys'),
    readFile = whenNode.lift(fs.readFile),
    logger = require('../logger'),
    defaultTemplatePath = path.join(__dirname, '../../static/default.html'),
    defaultTemplate;

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(bender) {

    /**
     * Append to given element link/script nodes created from src object
     * @param {Object}         elem      Cheerio's DOM element
     * @param {Object}         src       Source object
     * @param {Array.<String>} [src.css] Paths to stylesheets
     * @param {Array.<String>} [src.js]  Paths to scripts
     */
    function addFiles(elem, src) {
        src.css.forEach(function (css) {
            elem.append('<link rel="stylesheet" href="' + css + '">');
        });
        src.js.forEach(function (js) {
            elem.append('<script src="' + js + '"></script>');
        });
    }

    /**
     * Build test context for the given test
     * @param  {Test}   test Test object
     * @return {String}
     */
    function buildTemplate(test) {
        var data = {
                apps: bender.applications.get(test.applications),
                assert: bender.plugins.get('assertion', test.assertion)
            };

        if (defaultTemplate) {
            data.default = defaultTemplate;
        } else {
            data.default = readFile(defaultTemplatePath)
                .then(function (data) {
                    defaultTemplate = cheerio.load(data.toString());
                    return defaultTemplate;
                });
        }
        if (test.html) data.html = readFile(test.html);
        if (test.js) data.js = readFile(test.js);

        // TODO handle this when manual tests are ready
        // if (test.manual && test.md) data.md = readFile(test.md);

        return whenKeys.all(data)
            .then(function (result) {
                var $default = result.default,
                    $output,
                    $test,
                    $head,
                    $body;

                $output = $default('html').clone();
                $head = $output.find('head');
                $body = $output.find('body');

                if (Array.isArray(result.apps)) {
                    result.apps.forEach(function (app) {
                        addFiles($head, app);
                    });
                }

                // TODO copy DOCTYPE

                addFiles($head, result.assert);

                if (result.html) {
                    $test = cheerio.load(result.html.toString());
                    
                    // TODO parse $test
                    // if no doctype - include default else use the one of test
                    // if no html tags - inlcude default with content
                    // if html tag
                    // 
                    // if head tag - prepend setup script
                    // else append all scripts and css needed
                    // 
                    // if body tag - append spec
                    // else include default with spec inside

                    $body.append(result.html.toString());
                }

                if (result.js) {
                    $body.append('<script>(function (bender) {' +
                        result.js + '})(window.bender || {});</script>');
                }

                return $output.html();
            });
    }

    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            filePath,
            file,
            test;

        function resume(err) {
            if (err) logger.error(err);
            next();
        }

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        file = url.slice(1).join('/');
        test = bender.tests.get(decodeURIComponent(file));

        // render test context page
        if (test) {
            filePath = bender.cache.getPath(test.id);
            // server from the cache
            if (filePath) {
                send(req, filePath).on('error', resume).pipe(res);
            // write to the cache and render
            } else {
                buildTemplate(test)
                    .then(function (data) {
                        return bender.cache.write(test.id, data);
                    },
                    function (err) {
                        logger.error(err);
                    })
                    .done(function (content) {
                        bender.utils.renderHTML(res, content);
                    }, resume);
            }
        // host assets from a test directory
        } else {
            send(req, file).on('error', resume).pipe(res);
        }
    };
}

module.exports.create = create;
