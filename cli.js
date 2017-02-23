#!/usr/bin/env node
'use strict';

var fs = require('fs');

var Promise = require('bluebird');
var getStdin = require('get-stdin');
var meow = require('meow');

var config = require('./config');
var validateArgs = require('./lib/validate-cli-args');
var gsvg = require('./');

// eslint-disable-next-line no-use-extend-native/no-use-extend-native
fs = Promise.promisifyAll(fs);

// is this module imported or is it run as a CLI?
var isImportedModule = require.main !== module;

// make a token which validateArgs can return to represent "no input received"
// this allows us to show help instead of err message for this special case
var NO_INPUT = new Error('NO INPUT');

var minimistOptions = {
    // long CLI flags are camelCased, but meow will --de-camelize them
    alias: config.validationInfo.cliAliases
};

var meowOptionsTemplate = {
    inferType: true,
    help: `
Usage
  $ gsvg [--help|--version]
  $ gsvg [flags/options] [<infile> [<outfile>]]
  $ echo "<svg></svg>" | gsvg [flags/options] [<outfile>]

<infile> Input filename
    If a string is piped to GSVG, that will be used as the input and
    the first positional argument will be treated as <outfile> instead.

<outfile> Output filename
    The file will be overwritten if it exists.
    If <outfile> is omitted, output will be piped to stdout.

Flags
  -h, --help,         Display this message
  -v, --version       Display version number

  -i, --in-place      Change file in place
      Requires: <infile>
      Excludes: piping, <outfile>

Options
  -s, --shiftwidth <integer|string>         Shiftwidth used for indentation
      <integer> (Default: 2) Number of spaces (0 or more)
      <string>  Spaces (" ") or "t" (converted to "\\t")

  -a, --attr-extra-indent <integer|string>  Added to indent for attributes
      <integer> (Default: 1) Number of spaces (0 or more)
      <string>  Spaces (" ") or "t" (converted to "\\t")

Examples
  $ gsvg --shiftwidth t sample.svg
  $ gsvg -i sample.svg
  $ cat sample.svg | gsvg -a 0 > sample.gsvg.svg
    `
};

module.exports = function (cliArgs, testStdin) {
    // `cliArgs` and `testStdin` are optional and only used for tests

    var meowOptions = Object.assign({}, meowOptionsTemplate);

    // if we're running tests, use passed in args instead of process.argv
    if (isImportedModule) {
        meowOptions.argv = cliArgs || [];
    }

    var cli = meow(meowOptions, minimistOptions);

    var result = {
        flags: cli.flags,
        files: cli.input
    };

    // use bluebird promise instead of the one returned by getStdin()
    return Promise.resolve().then(function () {
        // only check for real stdin if this file is run directly
        return isImportedModule ?
            testStdin :
            getStdin();
    }).then(function (stdin) {
        // get input from stdin if it's not empty
        if (stdin) {
            result.stdin = stdin;
            return stdin;
        }

        // otherwise, read first named file if it exists
        if (cli.input[0]) {
            result.infile = cli.input[0];
            return fs.readFileAsync(result.infile, 'utf8');
        }
    }).tap(function () {
        // set up filenames
        // it's OK if cli.input[x] is undefined, that's still falsy
        if (result.stdin) {
            result.outfile = cli.input[1];
        } else {
            result.infile = cli.input[0];
            result.outfile = cli.input[1];
        }

        // change 't' to '\t' for cli flags which set indent
        config.validationInfo.indentFlags.forEach(function (flag) {
            if (cli.flags[flag] === 't') {
                cli.flags[flag] = '\t';
            }
        });
    }).tap(function () {
        // throw an error if user input is invalid (handled in catch function)
        return validateArgs(cli, config.validationInfo, result, NO_INPUT);
    }).then(function (input) {
        // process the SVG input
        return gsvg(input, cli.flags);
    }).then(function (output) {
        // write to a file if the user asked for that
        if (result.outfile) {
            result.stdout = '';
            // TODO prompt user first if file exists and !cli.flags.inPlace
            return fs.writeFileAsync(result.outfile, output, 'utf8');
        }

        return output;
    }).catch(function (err) {
        // catch errors and return error messages for humans

        var errors = config.errors;
        var errMsg = '  GSVG: ';

        result.exitCode = 1;

        if (err === NO_INPUT) {
            // show help if user provided no input
            errMsg = cli.help;
        } else if (errors[err.code]) {
            // report file system errors
            errMsg += `${errors[err.code]}: ${err.path || ''} (${err.code})`;
        } else if (err.name === 'Error') {
            // report errors thrown by validateArgs
            errMsg += err.message;
        } else {
            throw err;
        }

        return errMsg;
    }).then(function (output) {
        // collect and return all our data

        if (result.exitCode >= 1) {
            result.stdout = '';
            result.stderr = output + '\n';
        } else {
            result.exitCode = 0;
            result.stdout = output || '';
            result.stderr = '';
        }

        // result: (object)
        // - stdin (string || undefined)
        // - stdout (string)
        // - stderr (string)
        // - exitCode (number)
        // - infile (string || undefined)
        // - outfile (string || undefined)
        // - flags (object)
        // - input (array) filenames which were sorted into infile and outfile
        return result;
    });
};

// run the program and write to stdio if this file was called directly
if (!isImportedModule) {
    module.exports().then(function (result) {
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
        process.exitCode = result.exitCode;
    });
}
