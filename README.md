[![Build Status](https://travis-ci.org/benderjs/benderjs.svg?branch=master)](https://travis-ci.org/benderjs/benderjs)
[![NPM Version](http://img.shields.io/npm/v/benderjs.svg)](https://www.npmjs.org/package/benderjs)

# Bender.js

The anti-human approach to JavaScript testing.

## Installation

To install Bender.js locally use:

```
$ npm install benderjs
```

To simplify your work with Bender.js we highly encourage you to use [benderjs-cli](https://github.com/benderjs/benderjs-cli) module that registers `bender` command.

**Warning**: All the following code samples assume you have `benderjs-cli` installed globally:

```
$ [sudo] npm install benderjs-cli -g
```

## Getting started

To get more insight into testing with Bender, check the [Testing in Bender](https://github.com/benderjs/benderjs/wiki/Testing-in-Bender) wiki page.

If you prefer to see Bender in action, have a look at the [example project](https://github.com/benderjs/benderjs-example-project) showing how to configure Bender and use it to run tests written in [Jasmine](http://jasmine.github.io/).

## Configuration

In order to configure Bender.js for your project, you need to create a configuration file.

Use `bender init` command to create Bender configuration file and its local `.bender/` directory.

Below is an empty configuration file:

```javascript
/**
 * Bender configuration file
 *
 * @param {Object}   applications       Applications used in current project
 * @param {Array}    browsers           List of browsers used for testing
 * @param {Number}   captureTimeout     Timeout before which a launched browser should connect to the server
 * @param {String}   certificate		Location of the certificate file
 * @param {Boolean}  debug              Enable debug logs
 * @param {Number}   defermentTimeout	Timeout before which a plugin should finish initializing on a test page
 * @param {String}   framework          Default framework used for the tests
 * @param {String}   hostname           Host on which the HTTP and WebSockets servers will listen
 * @param {Array}    manualBrowsers     List of browsers accepting manual tests
 * @param {Number}   manualTestTimeout  Timeout after which a manual test is marked as failed
 * @param {Array}    plugins            List of Bender plugins to load at startup (Required)
 * @param {Number}   port               Port on which the HTTP and WebSockets servers will listen
 * @param {String}   privateKey			Location of the private key file
 * @param {Boolean}  secure				Flag telling whether to serve contents over HTTPS and WSS
 * @param {Number}   slowAvgThreshold   Average test case duration threshold above which a test is marked as slow
 * @param {Number}   slowThreshold      Test duration threshold above which a test is marked as slow
 * @param {String}   startBrowser       Name of a browser to start when executing bender run command
 * @param {Number}   testRetries        Number of retries to perform before marking a test as failed
 * @param {Object}   tests              Test groups for the project (Required)
 * @param {Number}   testTimeout        Timeout after which a test will be fetched again
 */

var config = {
	// put your configuration here
};

module.exports = config;
```

For more information on Bender configuration, check out the Wiki - [Configuration](https://github.com/benderjs/benderjs/wiki/Configuration) page.

## Usage

Type `bender` to see available commands:

```
Usage: bender <command> [options]

Commands:

  clean    Clean all Bender.js local files except the configuration
  init     Initialize Bender.js for this directory
  run      Run the tests in a browser and output the results to the console
  server   Handle Bender.js server

Options:

  -c, --config    Alternative path to Bender.js configuration file [bender.js]
  -d, --debug
  -H, --hostname  Hostname used to run the server
  -p, --port      Port on which the server will listen
  -v, --version   Print Bender.js version
```

In order to run Bender in your project, open the console in project's directory and type:

```
$ bender server run
```

This will start the server in the verbose mode.

Now open a web browser. By default, Bender.js dashboard is available under:

```
http://localhost:1030
```

If you configured Bender.js to serve contents over HTTPS, use:

```
https://localhost:1030
```

**Note:** You can also run the server as a daemon:

```
bender server start
```

At the moment, starting a daemon is supported **on Unix systems only**.

If you want, you can specify a port or a hostname where Bender.js runs:

```
-p, --port      The port on which the server will run (default: 1030).
-H, --hostname  The hostname used to run the server (default: 0.0.0.0).
```

For more information on Bender command line interface, check out the Wiki - [Command line](https://github.com/benderjs/benderjs/wiki/Command-line) page.

## Running tests for Bender.js

```
$ npm install
$ npm test
```

To get the code coverage report run:

```
$ npm test --coverage
```

A detailed report will be created in `./coverage/lcov-report/index.html` file.

License
-------

For license details see: [LICENSE.md](https://github.com/benderjs/benderjs/blob/master/LICENSE.md).
