'use strict';

import test from 'ava';

var parser = require('../lib/parser');

// define macros
var expectTokens = async function (t, input, expectedTokens) {
    var result = await parser(input);
    t.deepEqual(result, expectedTokens);
};

// === TESTS === //

// errors
test('error is thrown for unmatched opening tag', t => {
    t.throws(parser('<g>'));
});

test('error is thrown for unmatched closing tag', t => {
    t.throws(parser('</g>'));
});

test('error is thrown for improperly nested tags', t => {
    t.throws(parser('<text><tspan></text></tspan>'));
});

test('error is not thrown for properly nested tags', t => {
    t.notThrows(parser('<text><tspan></tspan></text>'));
});

// output
test('empty string input', expectTokens, '', []);

test(
    'xml declaration',
    expectTokens,
    '<?xml version="1.0"\n    encoding="UTF-8" standalone="no"?>',
    [{
        name: 'xml',
        body: 'version="1.0"\n    encoding="UTF-8" standalone="no"',
        indentLevel: 0
    }]
);

test(
    'nested tags',
    expectTokens,
    '<g><g></g></g>',
    [{
        name: 'g',
        attributes: {},
        isSelfClosing: false,
        indentLevel: 0
    }, {
        name: 'g',
        attributes: {},
        isSelfClosing: false,
        indentLevel: 1
    }, {
        name: 'closetag',
        body: 'g',
        indentLevel: 1
    }, {
        name: 'closetag',
        body: 'g',
        indentLevel: 0
    }]
);

test(
    'tag with attributes',
    expectTokens,
    '<g id="test-id" madeup="still works"></g>',
    [{
        name: 'g',
        attributes: {
            id: 'test-id',
            madeup: 'still works'
        },
        isSelfClosing: false,
        indentLevel: 0
    }, {
        name: 'closetag',
        body: 'g',
        indentLevel: 0
    }]
);
