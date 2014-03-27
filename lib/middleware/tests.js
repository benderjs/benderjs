/**
 * @file Builds test context, serves test assets
 */

var fs = require('fs'),
    path = require('path'),
    cheerio = require('cheerio'),
    send = require('send'),
    when = require('when'),
    whenNode = require('when/node'),
    whenKeys = require('when/keys'),
    read = whenNode.lift(fs.readFile),
    defaultTemplate = fs.readFileSync(path.join(__dirname, '../../static/default.html'));

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(bender) {
    /**
     * Build test context for the given test
     * @param  {Test}   test Test object
     * @return {String}
     */
    function buildTemplate(test) {
        var $default = cheerio.load(defaultTemplate),
            tasks = {};

        if (test.html) tasks.html = read(test.html);
        if (test.js) tasks.js = read(test.js);
        if (test.manual && test.md) tasks.md = read(test.md);

        tasks.apps = bender.applications.get(test.apps);
        tasks.assert = bender.plugins.get('assertion', test.assertion);

        // if no doctype - include default else use the one of test
        // if no html tags - inlcude default with content
        // if html tag
        // 
        // if head tag - prepend setup script
        // else append all scripts and css needed
        // 
        // if body tag - append spec
        // else include default with spec inside

        // {
        //     apps: applications.get(test.apps),
        //     plugins: [assertions.get(test.assertion)]
        //     id: test.id,
        //     html: test.html && fs.readFileSync(test.html).toString(),
        //     js: test.js && fs.readFileSync(test.js).toString(),
        // };

        return whenKeys.all(tasks)
            .then(function (result) {
                
                console.log('result', result);
                
                var $output,
                    $test,
                    $head,
                    $body;

                $head = $default('head');
                $body = $default('body');

                if (Array.isArray(result.apps)) {

                }

                if (result.html) {
                    // $test = cheerio.load(result.html);
                    $body.append(result.html.toString());
                }

                if (result.js) {
                    $body.append('<script>' + result.js.toString() + '</script>');
                }

                // return '';
                return $default.html();
            });
    }
    
    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            resume = function () { next(); },
            filePath,
            file,
            test;

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
                        console.log('err', err);
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
