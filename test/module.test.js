'use strict';

import test from 'ava';

var gsvg = require('../');
var gsvgSpawn = require('./_spawn-helper');

// define macros
// var expectLines = async function (t, input, expectedLines) {
var expectLines = async function (t, args) {
    var result = await gsvg(args.in, args.opt || {});
    t.is(result, args.out.join('\n') + '\n');
};

// === TESTS === //

// errors
test('error is thrown for unmatched opening tag', t => {
    t.throws(gsvg('<g>'));
});

test('error is thrown for unmatched closing tag', t => {
    t.throws(gsvg('</g>'));
});

test('error is thrown for improperly nested tags', t => {
    t.throws(gsvg('<text><tspan></text></tspan>'));
});

test('error is not thrown for properly nested tags', t => {
    t.notThrows(gsvg('<text><tspan></tspan></text>'));
});

// output
test('gsvg output ends with a newline', async t => {
    t.is(await gsvg(''), '\n');
});

test('gsvg.array returns an array', async t => {
    t.true(Array.isArray(await gsvg.array('')));
});

// NOTE: most cli tests are found in cli.test.js --
// this one is here to check consistency with the other interfaces
test('cli output ends with a newline', async t => {
    // this test uses '<g></g>' instead of '' because
    // cli doesn't recognize '' from stdin as input
    var {stdout, stderr, exitCode} = await gsvgSpawn('<g></g>');
    t.is(exitCode, 0);
    t.is(stderr, '');
    t.is(stdout, '<g>\n</g>\n');
});

test('gsvg, gsvg.array, and cli give equivalent output', async t => {
    // TODO read in sample file instead of using this
    var input = (
        '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
        '<!-- engaging commentary -->' +
        '<svg><g><text>Blah blah!</text></g></svg>'
    );

    var main = await gsvg(input);
    var array = await gsvg.array(input);
    var {stdout: cliStdin} = await gsvgSpawn(input);
    // TODO test passing a filename to cli

    t.is(main, array.join('\n') + '\n');
    t.is(main, cliStdin);
    // t.is(main, cliFile);
});

test('xml declaration is not modified', expectLines, {
    in: '<?xml version="1.0"\n    encoding="UTF-8" standalone="no"?>',
    out: [
        '<?xml version="1.0"',
        '    encoding="UTF-8" standalone="no"?>'
    ]
});

test('nested tags are indented by 2 spaces', expectLines, {
    in: '<g><g></g></g>',
    out: [
        '<g>',
        '  <g>',
        '  </g>',
        '</g>'
    ]
});

test('attributes are on new lines, aligned past open tag', expectLines, {
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '   id="out">',
        '  <g',
        '     id="in">',
        '  </g>',
        '</g>'
    ]
});

test('set shiftwidth to 0 spaces, passing a string', expectLines, {
    opt: {shiftwidth: ''},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        ' id="out">',
        '<g',
        ' id="in">',
        '</g>',
        '</g>'
    ]
});

test('set shiftwidth to 0 spaces, passing a number', expectLines, {
    opt: {shiftwidth: 0},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        ' id="out">',
        '<g',
        ' id="in">',
        '</g>',
        '</g>'
    ]
});

test('set shiftwidth to 5 spaces, passing a string', expectLines, {
    opt: {shiftwidth: '     '},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '      id="out">',
        '     <g',
        '           id="in">',
        '     </g>',
        '</g>'
    ]
});

test('set shiftwidth to 5 spaces, passing a number', expectLines, {
    opt: {shiftwidth: 5},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '      id="out">',
        '     <g',
        '           id="in">',
        '     </g>',
        '</g>'
    ]
});

test('set shiftwidth to tab', expectLines, {
    opt: {shiftwidth: '\t'},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '\t id="out">',
        '\t<g',
        '\t\t id="in">',
        '\t</g>',
        '</g>'
    ]
});

test('set attrExtraIndent to 0 spaces, passing a string', expectLines, {
    opt: {attrExtraIndent: ''},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '  id="out">',
        '  <g',
        '    id="in">',
        '  </g>',
        '</g>'
    ]
});

test('set attrExtraIndent to 0 spaces, passing a number', expectLines, {
    opt: {attrExtraIndent: 0},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '  id="out">',
        '  <g',
        '    id="in">',
        '  </g>',
        '</g>'
    ]
});

test('set attrExtraIndent to 5 spaces, passing a string', expectLines, {
    opt: {attrExtraIndent: '     '},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '       id="out">',
        '  <g',
        '         id="in">',
        '  </g>',
        '</g>'
    ]
});

test('set attrExtraIndent to 5 spaces, passing a number', expectLines, {
    opt: {attrExtraIndent: 5},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '       id="out">',
        '  <g',
        '         id="in">',
        '  </g>',
        '</g>'
    ]
});

test('set attrExtraIndent to tab', expectLines, {
    opt: {attrExtraIndent: '\t'},
    in: '<g id="out"><g id="in"></g></g>',
    out: [
        '<g',
        '  \tid="out">',
        '  <g',
        '    \tid="in">',
        '  </g>',
        '</g>'
    ]
});
