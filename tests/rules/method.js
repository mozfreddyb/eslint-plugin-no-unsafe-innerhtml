/**
 * @fileoverview Test for no-unsanitized rule
 * @author Frederik Braun et al.
 * @copyright 2015-2017 Mozilla Corporation. All rights reserved
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../lib/rules/method");
const RuleTester = require("eslint").RuleTester;

const PATH_TO_BABEL_ESLINT = `${process.cwd()}/node_modules/babel-eslint/`;
const PATH_TO_TYPESCRIPT_ESLINT = `${process.cwd()}/node_modules/@typescript-eslint/parser/`;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const eslintTester = new RuleTester();

eslintTester.run("method", rule, {

    // Examples of code that should not trigger the rule
    // XXX this does not find z['innerHTML'] and the like.

    valid: [
        // tests for insertAdjacentHTML calls
        {
            code: "n.insertAdjacentHTML('afterend', 'meh');",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "n.insertAdjacentHTML('afterend', `<br>`);",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "n.insertAdjacentHTML('afterend', Sanitizer.escapeHTML`${title}`);",
            parserOptions: { ecmaVersion: 6 }
        },

        // document.write/writeln
        {
            code: "document.write('lulz');",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "document.write();",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "document.writeln(Sanitizer.escapeHTML`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "otherNodeWeDontCheckFor.writeln(evil);",
            parserOptions: { ecmaVersion: 6 }
        },

        // Native method (Check customize code doesn't include these)
        {
            code: "document.toString(evil);"
        },

        {
            code: "document.write(escaper(x))",
            options: [
                {
                    escape: {
                        methods: ["escaper"]
                    }
                }
            ]
        },

        // Checking write can be overriden
        {
            code: "document.write(evilest)",
            options: [
                {
                    objectMatches: ["document", "documentFun"]
                },
                {
                    write: {
                        objectMatches: ["thing"]
                    }
                }
            ]
        },

        // Checking disableDefault can remove the default rules
        {
            code: "document.write(evil)",
            options: [
                {
                    defaultDisable: true
                }
            ]
        },

        // rule should not barf on a CallExpression result being called again
        {
            code: "  _tests.shift()();",
        },
        {
            code: "(Async.checkAppReady = function() { return true; })();"
        },
        {
            code: "let endTime = (mapEnd || (e => e.delta))(this._data[this._data.length - 1]);",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "(text.endsWith('\\n') ? document.write : document.writeln)(text)"
        },

        // issue 71 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/71
        {
            code: "function foo() { return this().bar(); };",
        },

        // issue 73 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/73
        {
            code: "new Function()();",
        },
        { // issue 79
            code: "range.createContextualFragment('<p class=\"greeting\">Hello!</p>');"
        },
        { // issue 79
            code: "range.createContextualFragment(Sanitizer.escapeHTML`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {

                    escape: {
                        methods: ["escaper"]
                    }
                }
            ]
        },
        { // issue 79
            code: "range.createContextualFragment(escaper('<em>'+evil+'</em>'));",
            options: [
                {

                    escape: {
                        methods: ["escaper"]
                    }
                }
            ]
        },

        // Issue 135: Check literal imports in all parsers:
        {
            code: "import('lodash')",
            parserOptions: { ecmaVersion: 2020 },
        },

        // Issue 83: Support import() expressions as parsed by babel-eslint
        {
            code: "import('lodash')",
            parser: PATH_TO_BABEL_ESLINT
        },

        // Issue 135: Check literal imports in all parsers:
        {
            code: "import('lodash')",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: "module",
            },
        },
        { // issue 108: adding tests for custom escaper
            code: "range.createContextualFragment(templateEscaper`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        taggedTemplates: ["templateEscaper"]
                    }
                }
            ]
        },
        { // issue 108: adding tests for custom escaper
            code: "n.insertAdjacentHTML('afterend', DOMPurify.sanitize(evil));",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        methods: ["DOMPurify.sanitize"]
                    }
                }
            ]
        },
        { // issue 108: adding tests for custom escaper
            code: "n.insertAdjacentHTML('afterend', DOMPurify.sanitize(evil, options));",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        methods: ["DOMPurify.sanitize"]
                    }
                }
            ]
        },
        { // issue 108: adding tests for custom escaper
            code: "n.insertAdjacentHTML('afterend', DOMPurify.sanitize(evil, {ALLOWED_TAGS: ['b']}));",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        methods: ["DOMPurify.sanitize"]
                    }
                }
            ]
        },
        { // issue 154: Adding tests for TaggedTemplateExpression callee https://jestjs.io/docs/api#2-describeeachtablename-fn-timeout
            code: "describe.each`table`(name, fn, timeout)",
            parserOptions: { ecmaVersion: 6 },
        },
        {
            code: "document.write`text`",
            parserOptions: { ecmaVersion: 6 },
        },
        {
            code: "document.write`text ${'static string'}`",
            parserOptions: { ecmaVersion: 6 },
        },
        {
            code: "custom`text ${variable}`",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {},
                {
                    "custom": {
                        "properties": [0]
                    }
                }
            ]
        },
        {
            code: "custom`text ${'string'}`",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {},
                {
                    "custom": {
                        "properties": [1]
                    }
                }
            ]
        },
        { // This is allowed because of how tagged templates pass function parameters
            code: "document.write`text ${variable}`",
            parserOptions: { ecmaVersion: 6 },
        },
        { // basic support for SequenceExpressions, which always return the last item - fixes #113
            code: "let a = (0,1,2,34);",
            parserOptions: { ecmaVersion: 6 },
        },
        { // issue #122 calling an await expression
            code: "(async function()  { (await somePromise)(); })",
            parserOptions: { ecmaVersion: 8 }
        },
        { // issue #122 calling an await expression
            // note how we won't be able to tell if the promise resolves to foo.insertAdjacentHTML
            code: "async () => (await TheRuleDoesntKnowWhatIsBeingReturnedHere())('afterend', blah);",
            parserOptions: { ecmaVersion: 2020 }
        },
        { // Regression test for #124, make sure we don't raise an "Unexpected Callee" error.
            code: "(e = this.n[n.i])(i, r)",
            parserOptions: { ecmaVersion: 6 },
        },
        { // Regression test for #124, make sure we go deeper into validating the AssignmentExpression.
            code: "(e = node.insertAdjacentHTML('beforebegin', '<s>safe</s>'))()",
            parserOptions: { ecmaVersion: 6 },
        },

        // Typescript support tests
        {
            code: "node.insertAdjacentHTML('beforebegin', (5 as string));",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
        },
        {
            code: "node!.insertAdjacentHTML('beforebegin', 'raw string');",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            }
        },
        {
            code: "node!().insertAdjacentHTML('beforebegin', 'raw string');",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            }
        },
        

        // Flow support tests
        {
            code: "(node: HTMLElement).insertAdjacentHTML('beforebegin', 'raw string');",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "node.insertAdjacentHTML('beforebegin', (5: string));",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "(insertAdjacentHTML: function)('afterend', 'static string');",
            parser: PATH_TO_BABEL_ESLINT,
        },


        // Issue 135: method calls to import should not warn.
        {
            code: "foo.import(bar)",
            parserOptions: { ecmaVersion: 2020 },
        },
        {
            code: "foo.import(bar)",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "foo.import(bar)",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: "module",
            }
        },
    ],

    // Examples of code that should trigger the rule
    invalid: [
        /* XXX Do NOT change the error strings below without review from freddy:
         * The strings are optimized for SEO and understandability.
         * The developer can search for them and will find this MDN article:
         *  https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation
         */ 


        // insertAdjacentHTML examples
        {
            code: "node.insertAdjacentHTML('beforebegin', htmlString);",
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "node.insertAdjacentHTML('beforebegin', template.getHTML());",
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },

        // document.write / writeln
        {
            code: "document.write('<span>'+ htmlInput + '</span>');",
            errors: [
                {
                    message: "Unsafe call to document.write for argument 0",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "documentish.write('<span>'+ htmlInput + '</span>');",
            errors: [
                {
                    message: "Unsafe call to documentish.write for argument 0",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "documentIframe.write('<span>'+ htmlInput + '</span>');",
            errors: [
                {
                    message: "Unsafe call to documentIframe.write for argument 0",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "document.writeln(evil);",
            errors: [
                {
                    message: "Unsafe call to document.writeln for argument 0",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "window.document.writeln(bad);",
            errors: [
                {
                    message: "Unsafe call to window.document.writeln for argument 0",
                    type: "CallExpression"
                }
            ]
        },

        // issue 71 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/71
        {
            code: "function foo() { return this().insertAdjacentHTML(foo, bar); };",
            errors: [
                {
                    message: "Unsafe call to this().insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },

        // Broken config
        {
            code: "b.boop(pie)",
            options: [
                {
                },
                {
                    boop: {
                    }
                }
            ],
            errors: [
                {
                    message: "Method check requires properties array in eslint rule boop",
                    type: "CallExpression"
                }
            ]
        },

        // Checking disableDefault can remove the default rules but also add more
        {
            code: "document.write(evil); b.thing(x); b.other(me);",
            options: [
                {
                    defaultDisable: true
                },
                {
                    thing: {
                    },
                    other: {
                        properties: [0]
                    }
                }
            ],
            errors: [
                {
                    message: "Method check requires properties array in eslint rule thing",
                    type: "CallExpression"
                },
                {
                    message: "Unsafe call to b.other for argument 0",
                    type: "CallExpression"
                }
            ]
        },

        // Test that stem from former parser errors and breakage
        {
            code: "getDocument(myID).write(evil)",
            errors: [
                {
                    message: "Unsafe call to getDocument(myID).write for argument 0",
                    type: "CallExpression"
                }
            ]
        },

        // Issue 79: Warn for use of createContextualFragment
        {
            code: "range.createContextualFragment(badness)",
            errors: [
                {
                    message: "Unsafe call to range.createContextualFragment for argument 0",
                    type: "CallExpression"
                }
            ]
        },

        // Issue 135: Disallow import() with non-literal params
        {
            code: "import(foo)",
            parserOptions: { ecmaVersion: 2020 },
            errors: [
                {
                    message: "Unsafe call to import for argument 0",
                    type: "ImportExpression"
                }
            ]
        },
        {
            code: "import(foo)",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe call to import for argument 0",
                    type: "ImportExpression"
                }
            ]
        },
        {
            code: "import(foo)",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe call to import for argument 0",
                    type: "ImportExpression"
                }
            ]
        },
        { // basic support for SequenceExpressions, which always return the last item - fixes #113
            code: "(0, node.insertAdjacentHTML)('beforebegin', evil);",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // issue 108: adding tests for custom escaper
            // in this case we allow a function for templates, but it's used as a method
            code: "n.insertAdjacentHTML('afterend', templateEscaper(evil, options));",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        taggedTemplates: ["templateEscaper"]
                    }
                }
            ],
            errors: [
                {
                    message: "Unsafe call to n.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // issue 108: adding tests for custom escaper
            // in this case we allow a function for methods, but it's used fo template strings
            code: "n.insertAdjacentHTML('afterend', sanitize`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        methods: ["sanitize"]
                    }
                }
            ],
            errors: [
                {
                    message: "Unsafe call to n.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "document.writeln(Sanitizer.escapeHTML`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    defaultDisable: true
                },
                {

                    // check first parameter to .writeLn(), as long as the preceeding object matches the regex "document"
                    writeln: {
                        objectMatches: [
                            "document"
                        ],
                        properties: [0],
                        escape: {
                            methods: [],
                            taggedTemplates: [],
                        }
                    }
                }

            ],
            errors: [
                {
                    message: "Unsafe call to document.writeln for argument 0",
                    type: "CallExpression"
                }
            ]
        },

        // issue 154: Adding tests for TaggedTemplateExpression callee https://jestjs.io/docs/api#2-describeeachtablename-fn-timeout
        { 
            code: "describe.each`table${node.insertAdjacentHTML('beforebegin', htmlString)}`(name, fn, timeout)",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { 
            code: "describe.each`table${document.writeln(evil)}`(name, fn, timeout)",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to document.writeln for argument 0",
                    type: "CallExpression"
                }
            ]
        },
        { 
            code: "node.insertAdjacentHTML`text ${variable}`",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "TaggedTemplateExpression"
                }
            ]
        },
        {
            code: "custom`text ${variable}`",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {},
                {
                    "custom": {
                        "properties": [1]
                    }
                }
            ],
            errors: [
                {
                    message: "Unsafe call to custom for argument 1",
                    type: "TaggedTemplateExpression"
                }
            ]
        },
        {
            code: "custom`text ${variable} ${variable2}`",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {},
                {
                    "custom": {
                        "properties": [2]
                    }
                }
            ],
            errors: [
                {
                    message: "Unsafe call to custom for argument 2",
                    type: "TaggedTemplateExpression"
                }
            ]
        },
        { // basic support for SequenceExpressions, which always return the last item - fixes #113
            code: "(0, node.insertAdjacentHTML)('beforebegin', evil);",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // admittedly, this doesnt make a lot of sense, since the func doesnt return a promise
            code: "async () => await foo.insertAdjacentHTML('afterend', blah);",
            parserOptions: { ecmaVersion: 2020 },
            errors: [
                {
                    message: "Unsafe call to foo.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // admittedly, this doesnt make a lot of sense, since the func doesnt return a promise
            code: "async () => (await foo.insertAdjacentHTML('afterend', blah))();",
            parserOptions: { ecmaVersion: 2020 },
            errors: [
                {
                    message: "Unsafe call to foo.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "async () => (await foo)().insertAdjacentHTML('afterend', blah);",
            parserOptions: { ecmaVersion: 2020 },
            errors: [
                {
                    message: "Unsafe call to (await foo)().insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // AssignmentExpression, ensure we are detecting the pattern from the right part - Regression test for #124
            code: "(e = node.insertAdjacentHTML)('beforebegin', evil)",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        { // Regression test for #124, make sure we go deeper and detect the unsafe pattern
            code: "(e = node.insertAdjacentHTML('beforebegin', evil))()",
            parserOptions: { ecmaVersion: 6 },
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "(9)()",
            errors: [
                {
                    message: "Error in no-unsanitized: Unexpected Callee. Please report a minimal code snippet to the developers at https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/new?title=Unsupported%20Callee%20of%20type%20Literal%20for%20CallExpression",
                    type: "Literal"
                }
            ]
        },

        // Typescript test cases
        //
        // Null coalescing operator
        {
            code: "node!().insertAdjacentHTML('beforebegin', htmlString);",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe call to node!().insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "node!.insertAdjacentHTML('beforebegin', htmlString);",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe call to node!.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "(x as HTMLElement).insertAdjacentHTML('beforebegin', htmlString)",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe call to x as HTMLElement.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },

        // Flow test cases

        {
            code: "(node: HTMLElement).insertAdjacentHTML('beforebegin', unsafe);",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe call to node: HTMLElement.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "node.insertAdjacentHTML('beforebegin', (unsafe: string));",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe call to node.insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "(insertAdjacentHTML: function)('beforebegin', unsafe);",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe call to insertAdjacentHTML for argument 1",
                    type: "CallExpression"
                }
            ]
        },
        {
            code: "var copies = evil; n.insertAdjacentHTML('beforebegin', copies);",
            errors: [
                {
                    message: /Unsafe call to n.insertAdjacentHTML for argument 1 \(Variable 'copies' initialized with unsafe value at \d+:\d+\)/,
                    type: "CallExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; copies = suddenlyUnsafe; n.insertAdjacentHTML('beforebegin', copies);",
            errors: [
                {
                    message: /Unsafe call to n.insertAdjacentHTML for argument 1 \(Variable 'copies' reassigned with unsafe value at \d+:\d+\)/,
                    type: "CallExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
    ]
});
