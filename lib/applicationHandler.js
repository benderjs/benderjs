var fs = require('fs'),
    path = require('path'),
    request = require('request'),
    _ = require('lodash'),
    config = require('./config'),
    extension = /\.(css|js)$/;

function validate(app) {
    // TODO consider verbose validation and more sophisticated solution
    return app && app.url && app.files && (app.proxy || app.path);
}

function Application(options) {
    if (options.proxy) this.proxy = options.proxy; // TODO what about multiple proxies?
    if (options.path) this.path = options.path;
    this.files = options.files;
    this.url = options.url;
    this.js = [];
    this.css = [];
    
    this.buildUrls();
}

Application.prototype.buildUrls = function () {
    this.files.forEach(function (file) {
        var ext = extension.exec(file);

        if (ext) this[ext[1]].push('/apps/' + this.url + file);
    }.bind(this));
};

function ApplicationHandler() {
    this.applications = {};
}

ApplicationHandler.prototype.build = function () {
    var app, name;

    if (!_.isPlainObject(config.applications)) return false;

    for (name in config.applications) {
        app = config.applications[name];
        if (validate) {
            this.applications[name] = new Application(app);
        }
    }

    return true;
};

ApplicationHandler.prototype.create = function () {
    var pattern = /^\/apps\/([\w-_%]+\/)([\w\/\.-_%]+)$/;

    this.build();

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            filePath,
            app;

        // url matches /apps/ and there's an app with given url
        if (match && (app = this.get({ url: match[1] }))) {

            filePath = match[2];

            // proxy request to external server
            if (app.proxy) {
                req.pipe(request(app.proxy + filePath)).pipe(res);
            // server file from local file system
            } else {
                fs.readFile(path.resolve(app.path, filePath), function (err, data) {
                    var ext = extension.exec(filePath);
                    // skip on error - in the end it will result with 404
                    if (err) return next();

                    res.type(ext ? ext[1] : 'text').send(data);
                });
            }
        // nothing to do here
        } else {
            next();
        }
    }.bind(this);
};

ApplicationHandler.prototype.get = function (options) {
    if (_.isString(options)) return this.applications[options] || null;
    if (_.isPlainObject(options)) return _.where(this.applications, options)[0] || null;
    return null;
};

module.exports = new ApplicationHandler();
