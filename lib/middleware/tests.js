var fs = require('fs');

/**
 * Create a HTTP handler that servers test context and files
 * @return {Function}
 */
function create(tests, applications, assertions) {

    tests.build();

    return function (req, res, next) {
        var url = req.url.split('/'),
            testId,
            test;

        url.shift();

        if (req.method !== 'GET' || url[0] !== 'tests') return next();
        
        testId = url.slice(1).join('/');

        test = tests.get(
            decodeURIComponent(testId)
        );

        if (test) {
            var data = {
                quirks: false,
                apps: applications.get(test.apps),
                id: test.id,
                html: test.html && fs.readFileSync(test.html).toString(),
                js: test.js && fs.readFileSync(test.js).toString(),
                plugins: [assertions.get(test.assertion)]
            };

            // TODO replace this piece with proper template builder
            res.render('context.ejs', data);
        // host assets from a test directory
        } else {
            next();
        }

    };
}

module.exports.create = create;
