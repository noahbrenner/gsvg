# GSVG - Git-friendly SVG

> Reformat SVG files to reduce `git diff` noise

The impetus for GSVG was the SVG output of [Inkscape][] which comes so close to being [Git][]-friendly but doesn't quite make it. The goal of GSVG is to create a consistent, deterministic formatting for SVG files. This is valuable no matter what SVG editor you use. The formatting that GSVG creates is modeled after Inkscape's output, it just fixes some inconsistencies.

**First, some great things about how Inkscape formats its files:**

* Each attribute of each tag is on its own line. Great for version control systems like Git.
* Attributes are indented a `shiftwidth` + 1 space from their start tag (the extra space is not added to the next nested tag). This is great for humans: It's easy to see which tag an attribute belongs to.

```svg
<g
   class="bar"
   id="foo">
  <defs
     id="baz" />
</g>
```

**However, there are some less ideal Inkscape formatting issues which GSVG addresses:**

* The order of attributes in Inkscape's output is non-deterministic. When you re-save a file, Inkscape usually re-orders attributes in tags unrelated to your edit. This leads to noisy and unclear `git diff` output. **GSVG enforces a consistent order of attributes.**
* Inkscape mixes spaces and tabs for indentation which is bad form no matter what side of the tabs vs. spaces debate you're on. **GSVG creates consistent (and customizable) indentation.**

## Installation

First, make sure you have [Node.js][] installed. Node also comes with [npm][] (Node Package Manager) which is the easiest way to install GSVG.

* For command line usage: `npm install --global gsvg`
* As a package dependency: `npm install --save gsvg`


## Versioning

GSVG uses [Semantic Versioning][semver]. At this point, GSVG hasn't reached version 1.0.0 and the API is not yet stable.


## CLI

### Basic Usage

* `gsvg infile.svg`: Print Git-friendly version of infile.svg to stdout
* `gsvg infile.svg outfile.svg`: Write output to a file
* `gsvg -i infile.svg`: Overwrite original file
* `echo "<svg></svg>" | gsvg`: Use stdin, print to stdout

### More Detailed

```
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
      <string>  Spaces (" ") or "t" (converted to "\t")

  -a, --attr-extra-indent <integer|string>  Added to indent for attributes
      <integer> (Default: 1) Number of spaces (0 or more)
      <string>  Spaces (" ") or "t" (converted to "\t")

Examples
  $ gsvg --shiftwidth t sample.svg
  $ gsvg -i sample.svg
  $ cat sample.svg | gsvg -a 0 > sample.gsvg.svg
```


## API

### Examples

```javascript
var gsvg = require('gsvg');

// get a string
gsvg('<g></g>').then(console.log);
//=> '<g>\n</g>\n'

// get an array
gsvg.array('<g></g>').then(console.log);
//=> ['<g>', '</g>']

// example with nesting and indentation
gsvg.array('<g id="foo"><g></g></g>').then(console.log);
/*=>
[
    '<g',
    '   id="foo"',
    '  <g>',
    '  </g>',
    '</g>'
]
*/

// change default indentation settings
gsvg.array('<g id="foo"><g></g></g>', {
    shiftwidth: '\t',
    attrExtraIndent: 2
}).then(console.log);
/*=>
[
    '<g',
    '\t  id="foo"',
    '\t<g>',
    '\t</g>',
    '</g>'
]
*/
```

### Exported Functions

#### `gsvg(inputSVG, [options]))`

Returns a [promise][] which resolves with the resulting Git-friendly string.

#### `gsvg.array(inputSVG, [options]))`

Returns a promise that resolves with an array of strings, one for each line.

### Arguments (for either function)

#### `inputSVG`

Type: `string`  
Required: yes

The SVG string you want to process. All tags must be properly nested.

#### `options`

Type: `Object`  
Required: no

Change default settings by passing them in this object.

* **`shiftwidth`**  
  Type: `number` `string`  
  Default: `2`

  - `number`: Integer number of spaces by which to increase indentation for each level of nested tags. Zero or more.

  - `string`: The actual string to use for `shiftwidth`. Must be all spaces (`' '`) or all tabs (`'\t'`).

* **`attrExtraIndent`**  
  Type: `number` `string`  
  Default: `1`

  - `number`: Integer number of spaces by which to increase indentation for each level of nested tags. Zero or more.

  - `string`: The actual string to use for `shiftwidth`. Must be all spaces (`' '`) or all tabs (`'\t'`).


## Integration

* **Git:** A pre-commit hook would be an excellent place for a GSVG run.
* **Vim:** Just use `:%!gsvg` to filter the current buffer contents through GSVG.


## Other Things of Note

### Error Checking:

GSVG is not an SVG linter of any sort. The minimal error checking it has is from using [sax](https://github.com/isaacs/sax-js)'s "strict mode". Errors will be thrown for tags which are improperly nested or improperly opened/closed, but not a whole lot else.

### Promises

We use [bluebird][] for promises.

### Generic XML:

GSVG is designed and optimized for SVG, but it can be used with other XML as well. The [Roadmap](#roadmap) includes plans for customizing some of the SVG-specific defaults which may be valuable for filtering XML that isn't SVG. The main situation where you could run into an issue is if you have a text node that's entirely whitespace which should be preserved. Please file an issue if you run into this.

### Newlines and Encoding:

GSVG always outputs Unix line endings (`'\n'`), UTF-8 encoding, and it includes a newline character and the end of the file. If you need something other than that, you can use the `gsvg.array()` method and convert it however you'd like or you can filter the CLI output in the pipeline.


## Roadmap

### Top Priority

* Sort attributes in a logical order (to humans). Currently they're just alphabetized. Also allow customization of that sort order.
* Add line breaks at each command in path definitions ([d attributes][d-attribute] of `<path>` and `<glyph>` tags).
* Inkscape often changes relative URIs to absolute ones, breaking your `<use xlink:href="other-file.svg#some-id" />` tags (among others) when uploaded or simply moved to a different folder. So: Make paths relative if the absolute URI points to the local file system (and if we know where the files are relative to each other).
* Add more tests.

### Important

* Flesh out Contributing guidelines.
* Remove Inkscape-specific attributes and css properties.
* Stabilize API and release version 1.0.0.

### Other Possibilities

* Make sure GSVG is usable in the browser. It may be there already when using [browserify][] (no native modules are used outside of the CLI), but I haven't verified that.


## Contributing

**Contributions are always welcome!** Before you jump in, please read the [Code of Conduct](CODE_OF_CONDUCT.md).

Make sure that `npm test` is successful before you submit a pull request. Here's what that command runs:

**Linter:** [XO][] which uses [eslint][] under the hood. I've made just a few changes to XO's default setup, most notably: indent is 4 spaces and arrow functions always require parentheses (the test files were left with XO's default AVA setting of omitting the parens when there's only one argument).

**Test runner:** [AVA][]. AVA runs asynchronous tests concurrently so it's nice and fast. It runs its test files through [babel][] which means you can use things like `async` `await` within the test files.

Most pull requests that affect code should be accompanied by relevant test cases.

The ideal way to report bugs is to submit a pull request with a failing test. When submitting a failing test, use `test.failing()` as shown below. Then XO will verify that the test actually fails and report on it, but will still give an exit code of `0`.

```javascript
// your test showing that frobs fail to result in wobbles might look like this:
test.failing('frobs result in wobbles', async t => {
    var result = await gsvg('frobs');
    t.is(result, 'wobbles');
});
```


## Inspiration

[markdown-it][], particularly its use of a tokens array instead of an AST.

[AVA]: https://github.com/avajs/ava
[Inkscape]: https://inkscape.org/en/
[Node.js]: https://nodejs.org/
[XO]: https://github.com/sindresorhus/xo
[babel]: https://babeljs.io/
[bluebird]: http://bluebirdjs.com/
[browserify]: http://browserify.org/
[d-attribute]: https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d
[eslint]: http://eslint.org/
[git]: https://git-scm.com/
[markdown-it]: https://github.com/markdown-it/markdown-it
[npm]: https://www.npmjs.com/
[promise]: https://www.promisejs.org/
[semver]: http://semver.org/
