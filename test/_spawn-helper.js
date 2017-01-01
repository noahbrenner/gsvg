'use strict';

var spawn = require('child_process').spawn;

module.exports = function (input, cliArgs) {
    var allArgs = ['cli.js'];
    cliArgs = cliArgs || [];

    Array.prototype.push.apply(allArgs, cliArgs);

    return new Promise(function (resolve, reject) {
        var gsvg = spawn('node', allArgs);

        var result = {
            stdout: '',
            stderr: ''
        };

        // resolve or reject promise
        gsvg.on('error', reject);

        gsvg.on('close', function (code) {
            result.exitCode = code;
            resolve(result);
        });

        // record output
        gsvg.stdout.on('data', function (data) {
            result.stdout += data;
        });

        gsvg.stderr.on('data', function (data) {
            result.stderr += data;
        });

        // write to stdin
        gsvg.stdin.write(input);
        gsvg.stdin.end();
    });
};
