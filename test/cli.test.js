'use strict';

import test from 'ava';

var gsvgSpawn = require('./_spawn-helper');

// define macros
var testIO = async function (t, cliArgs, opt) {
    // extract from `opt` and set defaults
    var {
        stdin = '',
        exitCode = 0,
        stderrCompare = 'is', stderr = '',
        stdoutCompare = 'is', stdout = ''
    } = opt;

    t.truthy(exitCode || stderr || stdout, 'Test Error: no input');

    var stdio = await gsvgSpawn(stdin, cliArgs);

    t.is(stdio.exitCode, exitCode);
    t[stderrCompare](stdio.stderr, stderr);
    t[stdoutCompare](stdio.stdout, stdout);
};

var testShortFlag = function (t, cliArgs, opt) {
    t.truthy(cliArgs.length);
    t.regex(cliArgs[0], /^--[a-zA-Z]/);

    var newCliArgs = cliArgs.slice(0);
    var shortFlag = '-' + cliArgs[0][2];
    newCliArgs[0] = shortFlag;

    return testIO(t, newCliArgs, opt);
};

testShortFlag.title = providedTitle => `${providedTitle} - short flag`;

// === TESTS === //

// errors
test('unmatched open tag', [testIO], [], {
    stdin: '<g>',
    exitCode: 1,
    stderrCompare: 'regex',
    stderr: /gsvg: Unclosed root tag/
});

// output
test('display help', [testIO, testShortFlag], ['--help'], {
    stdoutCompare: 'regex',
    stdout: /^\n {2}Git-Friendly SVG\n\n {2}Usage\n/
});

test('display help when no input received', testIO, [], {
    exitCode: 1,
    stderrCompare: 'regex',
    stderr: /^\n {2}Git-Friendly SVG\n\n {2}Usage\n/
});

test('display version', [testIO, testShortFlag], ['--version'], {
    stdoutCompare: 'regex',
    stdout: /^\d+\.\d+\.\d+\n$/
});

test('false flag', [testIO, testShortFlag], ['--zomg-fake'], {
    exitCode: 1,
    stderrCompare: 'regex',
    stderr: /gsvg: Invalid flag/
});

test('shiftwidth', [testIO, testShortFlag], ['--shiftwidth', 1], {
    stdin: '<g><g></g></g>',
    exitCode: 0,
    stdout: [
        '<g>',
        ' <g>',
        ' </g>',
        '</g>'
    ].join('\n') + '\n'
});
