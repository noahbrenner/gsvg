'use strict';

var config = require('../config');

var opt;
var linesOut;

var inlineStartNodes = [
    'cdata',
    'textnode',

    'br'
];

var newlineEndNodes = [
    'g',
    'defs',
    'svg'
];

var simpleNodes = [
    'xml',
    'doctype',
    'cdata',
    'comment',
    'closetag',
    'textnode'
];

var contains = function (array, element) {
    return array.indexOf(element) !== -1;
};

var delimiters = {
    xml: ['<?xml ', '?>'],
    doctype: ['<!DOCTYPE', '>'],
    cdata: ['<![CDATA[', ']]>'],
    comment: ['<!--', '-->'],
    textnode: ['', ''],
    opentag: ['<', '>'],
    closetag: ['</', '>'],
    selfclosingtag: ['<', ' />']
};

var getIndentUnit = (function () {
    var onlySpace = /^ *$/;
    var onlyTab = /^\t*$/;

    return function (indent) {
        var isNumber = typeof indent === 'number';
        var isString = !isNumber && typeof indent === 'string';

        if (isNumber && (indent >= 0) && (indent % 1 === 0)) {
            return new Array(indent + 1).join(' '); // TODO use lodash
        }

        if (isString && (onlySpace.test(indent) || onlyTab.test(indent))) {
            return indent;
        }

        // throw an error if `indent` isn't a positive integer or valid string
        throw new Error(
            'gsvg: "opt.' + indent + '" must be a positive integer ' +
            'or a string of zero or more spaces or tabs.'
        );
    };
}());

var getIndentString = function (indentLevel) {
    var result = '';

    // TODO use lodash
    while (indentLevel) {
        result += opt.shiftwidth;
        indentLevel -= 1;
    }

    return result;
};

var pushLines = (function () {
    var appendLines = function (array, startIndex) {
        var i = startIndex;
        var length = array.length;

        while (i < length) {
            linesOut.push(array[i]);
            i += 1;
        }
    };

    return function (node, lines) {
        var inlineStart = contains(inlineStartNodes, node.name) || (
            node.name === 'closetag' && !contains(newlineEndNodes, node.body)
        );

        if (inlineStart) {
            linesOut[linesOut.length - 1] += lines[0];
            appendLines(lines, 1);
        } else {
            lines[0] = getIndentString(node.indentLevel) + lines[0];
            appendLines(lines, 0);
        }
    };
}());

var pushSimpleNodes = function (node) {
    var delims = delimiters[node.name];
    var result = delims[0] + node.body + delims[1];

    pushLines(node, result.split('\n'));
};

var pushOpenTags = function (node) {
    var result = [];

    var attributes = node.attributes;
    var attrOrder = Object.keys(attributes);
    var attrFullIndent = getIndentString(node.indentLevel) + opt.attrIndent;
    var delims = node.isSelfClosing ?
        delimiters.selfclosingtag :
        delimiters.opentag;

    result.push(delims[0] + node.name);

    attrOrder.sort();

    attrOrder.forEach(function (attr) {
        result.push(attrFullIndent + attr + '="' + attributes[attr] + '"');
    });

    result[result.length - 1] += delims[1];

    pushLines(node, result);
};

module.exports = function (tokens, options) {
    var shiftwidth = options.shiftwidth === undefined ?
        config.shiftwidth :
        options.shiftwidth;

    var attrExtraIndent = options.attrExtraIndent === undefined ?
        config.attrExtraIndent :
        options.attrExtraIndent;

    linesOut = [];
    opt = {};

    opt.shiftwidth = getIndentUnit(shiftwidth);
    opt.attrIndent = opt.shiftwidth + getIndentUnit(attrExtraIndent);

    tokens.forEach(function (node) {
        if (contains(simpleNodes, node.name)) {
            pushSimpleNodes(node);
        } else {
            pushOpenTags(node);
        }
    });

    return linesOut;
};
