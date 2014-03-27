/**
 * @file Builds test context, serves test assets
 */

var fs = require('fs'),
    path = require('path'),
    cheerio = require('cheerio'),
    send = require('send'),
    defaultTemplate = fs.readFileSync(path.join(__dirname, '../../static/default.html'));

/**
 * Build test context for the given test
 * @param  {Test}   test Test object
 * @return {String}
 */
function buildTemplate(test) {
    var output = '',
        $test = '',
        $default = cheerio.load(defaultTemplate);
    
    if (test.html) {
        $test = cheerio.load(test.html);
    }

    // TODO how to pass apps and assertions here o_O?
    // {
    //     apps: applications.get(test.apps),
    //     id: test.id,
    //     html: test.html && fs.readFileSync(test.html).toString(),
    //     js: test.js && fs.readFileSync(test.js).toString(),
    //     plugins: [assertions.get(test.assertion)]
    // };

    console.log($default._root);

    output = $default.html();

    return output;
}

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(bender) {
    
    return function (req, res, next) {
        var url = req.url.substr(1).split('/'),
            resume = function () { next(); },
            filePath,
            file,
            test;

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        file = url.slice(1).join('/');
        test = tests.get(decodeURIComponent(file));

        // render test context page
        if (test) {
            filePath = cache.getPath(test.id);
            // server from the cache
            if (filePath) {
                send(req, filePath).on('error', resume).pipe(res);
            // write to the cache and render
            } else {
                cache.write(test.id, buildTemplate(test))
                    .done(bender.utils.renderHTML(res, content.toString()), resume);
            }
        // host assets from a test directory
        } else {
            send(req, file).on('error', resume).pipe(res);
        }

    };
}

module.exports.create = create;
