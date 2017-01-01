'use strict';

var xmlParser = require('sax')
    .parser(true); // use strict mode

var tokens;
var skipCloseTag; // for self-closing tags
var activeTagStack;
var whitespaceRegex = /^\s*$/;

var addParserInfo = function (node) {
    node.indentLevel = activeTagStack.length;
    return node;
};

// xmlParser event listeners

xmlParser.onprocessinginstruction = function (node) {
    node = addParserInfo(node);
    tokens.push(node);
};

xmlParser.ondoctype = function (string) {
    var node = addParserInfo({
        name: 'doctype',
        body: string
    });
    tokens.push(node);
};

xmlParser.oncdata = function (text) {
    var node = addParserInfo({
        name: 'cdata',
        body: text
    });
    tokens.push(node);
};

xmlParser.onopentag = function (node) {
    node = addParserInfo(node);
    activeTagStack.push(node.name); // must be after addParserInfo()

    if (node.isSelfClosing) {
        skipCloseTag = true;
    }

    tokens.push(node);
};

xmlParser.onclosetag = function (string) {
    activeTagStack.pop(); // must be before addParserInfo()
    var node = addParserInfo({
        name: 'closetag',
        body: string
    });

    if (skipCloseTag) {
        skipCloseTag = false;
        return;
    }

    tokens.push(node);
};

xmlParser.oncomment = function (text) {
    var node = addParserInfo({
        name: 'comment',
        body: text
    });
    tokens.push(node);
};

xmlParser.ontext = function (string) {
    var isInsideTextNode = activeTagStack.indexOf('text') !== -1;
    var isWhitespace = whitespaceRegex.test(string);

    var node = addParserInfo({
        name: 'textnode',
        body: string
    });

    if (isInsideTextNode || !isWhitespace) {
        tokens.push(node);
    }
};

module.exports = function (xmlString) {
    tokens = [];
    skipCloseTag = false;
    activeTagStack = [];

    var result = new Promise(function (resolve, reject) {
        xmlParser.onerror = function (err) {
            xmlParser.resume(); // recover from parser error
            reject(err);
        };

        xmlParser.onend = function () {
            resolve(tokens);
        };
    });

    xmlParser
        .write(xmlString)
        .close();

    return result;
};
