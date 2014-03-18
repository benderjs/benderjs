var request = require('request'),
    send = require('send'),
    _ = require('lodash'),
    config = require('./config');

function Application(name, options) {
    if (options.proxy) this.proxy = options.proxy;
    if (options.path) this.path = options.path;
    
    this.name = name;
    this.url = options.url || this.name + '/';
    this.js = [];
    this.css = [];

    this.buildUrls(options.files);
}

Application.prototype.buildUrls = function (files) {
    var pattern = /\.(css|js)$/;

    files.forEach(function (file) {
        var ext = pattern.exec(file);

        if (ext) this[ext[1]].push(this.url + file);
    }.bind(this));
};



function ApplicationCollection() {
    this.applications = {};
}

ApplicationCollection.prototype.build = function () {
    var app, name;

    if (!_.isPlainObject(config.applications)) return false;

    for (name in config.applications) {
        app = config.applications[name];
        if (this.validate(app)) {
            this.applications[name] = new Application(name, app);
        }
    }

    return true;
};

ApplicationCollection.prototype.validate = function (app) {
    return app && app.files && (app.proxy || app.path);
};

ApplicationCollection.prototype.create = function () {
    var pattern = /^\/apps\/([\w-_%]+\/)([\w\/\.-_%]+)$/;

    this.build();

    return function (req, res, next) {
        var match = pattern.exec(req.url),
            filePath,
            app;

        // url matches /apps/<appname> and there's an app with given url
        if (match && (app = this.get({ url: match[1] }))) {

            filePath = match[2];

            // proxy request to external server
            if (app.proxy) {
                req.pipe(request(app.proxy + filePath)).pipe(res);
            // server file from local file system
            } else {
                send(req, filePath).root(app.path).pipe(res);
            }
        // nothing to do here
        } else {
            next();
        }
    }.bind(this);
};

ApplicationCollection.prototype.get = function (options) {
    // get application by name
    if (_.isString(options)) return this.applications[options] || null;
    // get multiple applications
    if (_.isArray(options)) {
        return options.map(function (name) {
            return this.applications[name];
        }.bind(this));
    }
    // get application by options, e.g. {url: 'myApp/'}
    if (_.isPlainObject(options)) return _.where(this.applications, options)[0] || null;
    // return all apps if no options specified
    return this.applications;
};

module.exports = new ApplicationCollection();
