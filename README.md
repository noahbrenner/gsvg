# GSVG - Git-friendly SVG

> Reformat SVG files to reduce `git diff` noise

The impetus for GSVG was the SVG output of [Inkscape][] which is almost, but not at all, [git][]-friendly. The goal is to create a consistent, deterministic formatting for SVG files. This may be valuable no matter what SVG editor you use. The formatting that GSVG outputs is modeled after Inkscape's output, it just fixes some inconsistencies. It's also not limited to the elements that Inkscape outputs; comments, cdata, and stylesheets are preserved. *All* data is preserved\* by default, though you can optionally ask GSVG to remove some Inkscape-specific tags, attributes, and quirks.

First, some great things about how Inkscape formats its output:

* Each attribute of each tag is on its own line. Great for version control systems like git.
* Attributes are indented 1 space more than their start tag (and the extra space is *not* added to the next nested tag). Great for humans -- It's easy to see which tag an attribute belongs to but it's not indented as much as the next start tag.
    ```svg
    <g
       class="bar"
       id="foo">
      <defs
         id="baz" />
    </g>
    ```

However, there are some less ideal Inkscape formatting issues which GSVG addresses:

* The order of attributes in Inkscape's output is non-deterministic. When you re-save a file, Inkscape usually re-orders attributes in tags unrelated to your edit -- which leads to noisy and unclear `git diff` output. **GSVG enforces a consistent order of attributes.**
* Inkscape mixes spaces and tabs for indentation which is bad form no matter what side of the tabs vs. spaces debate you're on. **GSVG creates consistent (and customizable) indentation.**

\* Text nodes that are not nested inside a `<text>` tag are *not* preserved. They are assumed to be whitespace from indentation which this module is supposed to recalculate. This should only be an issue if you're parsing xml that isn't SVG. I'm open to addressing that use case. Let me know if it's important to you.


## Installation

Command line use: `npm install --global gsvg`
Use in your project: `npm install --save gsvg`


## Versioning

GSVG uses Semantic Versioning as defined at <http://semver.org/>. GSVG hasn't reached major version 1 yet, so the API is not stable.


## CLI

### Basic Usage

`gsvg infile.svg`: Print git-friendly output to stdout
`gsvg infile.svg outfile.svg`: Write output to a file
`gsvg -i infile.svg`: Overwrite original file
`cat infile.svg | gsvg`: Use stdin, print to stdout.

### More Detailed

```
Usage
  $ gsvg --help
  $ gsvg --version
  $ gsvg [flags/options] [<infile>] [<outfile>]
  $ echo "<svg></svg>" | gsvg [flags/options] [<outfile>]

<infile> Input filename
    If a string is piped to gsvg, that will be used as the input and
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
  -s, --shiftwidth        Shiftwidth used for indentation
  -a, --attrExtraIndent   Add this to shifwidth for attribute lines
      <integer> Number of spaces (default 2)
      <string>  String of only spaces or only 't' character(s);
                't' will be converted to tab

Examples
  $ gsvg --shiftwidth 4
  $ gsvg -s t
  $ gsvg -s '  '
```


## API

```javascript
var gsvg = require('gsvg');

gsvg('<g></g>').then(console.log);
// '<g>\n</g>\n'

gsvg.array('<g></g>').then(console.log);
// ['<g>', '</g>']


var svgString = '<g id="foo"><g></g></g>';

gsvg.array(svgString).then(console.log);
/*
[
    '<g',
    '   id="foo"',
    '  <g>',
    '  </g>',
    '</g>'
]
*/

var opt = {
    shiftwidth: '\t',
    attrExtraIndent: 2
};

gsvg.array(svgString, opt).then(console.log);
/*
[
    '<g',
    '\t  id="foo"',
    '\t<g>',
    '\t</g>',
    '</g>'
]
*/
```

### Functions

* `gsvg(inputSVG, [options]))` - Returns a promise that resolves with a string.
* `gsvg.array(inputSVG, [options]))` - Returns a promise that resolves with an array of strings, one for each line.

### Arguments

#### inputSVG

Type: `string`
Required: yes

All tags must be properly nested. Self-closing tags, XML declarations, and comments are fine.

#### options

Type: `Object`
Required: no

##### shiftwidth
Type: `number` `string`
Default: 2

Number: How many spaces added to the indent for each new level of nesting.

String: The string to use for `shiftwidth`. It must be all spaces (`' '`) or all tabs (`'\t'`).

##### attrExtraIndent
Type: `number` `string`
Default: 2

Number: How many more spaces past `shiftwidth` to indent attributes. The indent string for an attribute is: `indent of its opening tag` + `shiftwidth` + `attrExtraIndent`

String: The string to use for `attrExtraIndent`. It must be all spaces (`' '`) or all tabs (`'\t'`).


## Things of Note

* **Error Checking:** GSVG is not a linter of any sort. The minimal error checking it has is from [sax](https://github.com/isaacs/sax-js) in strict mode. Errors will be thrown for tags which are improperly nested or improperly opened/closed.

* **Generic XML:** GSVG is designed and optimized for SVG, but it can be used with other XML as well. The [Roadmap](#roadmap) includes plans for customizing some of the SVG-specific defaults which may be valuable for this purpose.

* **Newlines:** GSVG always outputs Unix line endings (`\n`), UTF-8 encoding, and puts a newline character and the end of the file. If you need something other than that, you can use the `gsvg.array()` method and convert it however you'd like.


## Roadmap
* xlink:href
* Inkscape-specific attributes, css properties

### Top Priority

* Sort attributes in a logical order (to humans). Currently they're just alphabetized. Also allow customization of that sort order.
* Add line breaks at each command in path definitions ([d attributes][d-attribute] of `<path>` and `<glyph>` tags).
* Add more tests.

### Important

* Flesh out Contributing guidelines.
* Remove Inkscape-specific attributes and css properties.
* Stabilize API and release version 1.0.0.

### Other Possibilities

* Make sure GSVG is usable in the browser. It may be there already when using [browserify][] (no native modules are used outside of the CLI), but I haven't verified that.
* Make a Vim plugin (though this can already be done with `:%!gsvg`)


## Contributing

Contributions are always welcome. Before you jump in, please read the [Code of Conduct](CODE_OF_CONDUCT.md).

Before you submit a pull request, make sure that `npm test` is successful. Here's what that command runs:

Linter: [XO][] which uses [eslint][] under the hood. I've made just a few changes to XO's default setup, most notably: indent is 4 spaces and arrow functions always require parentheses (the test files were left with XO's default of leaving out the parens when there's only one argument).

Test runner: [AVA][]. AVA runs asynchronous tests concurrently and it runs its test files through [babel] so you can use things like `async` `await` within the test files.

The ideal way to report bugs is to submit a pull request with failing test. When submitting a failing test, use `test.failing()` as shown below. That will verify that the test actually fails and report on it, but still give an exit code of `0`.

```javascript
test.failing('gsvg does a thing', function t {
    // your test here
});
```


## Inspiration

markdown-it

[AVA]: https://github.com/avajs/ava
[Inkscape]: https://inkscape.org/en/
[XO]: https://github.com/sindresorhus/xo
[babel]: https://babeljs.io/
[browserify]: http://browserify.org/
[d-attribute]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
[eslint]: http://eslint.org/
[git]: https://git-scm.com/
