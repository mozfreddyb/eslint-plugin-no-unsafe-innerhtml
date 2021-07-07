/**
 * @fileoverview Test for no-unsanitized rule
 * @author Frederik Braun et al.
 * @copyright 2015-2017 Mozilla Corporation. All rights reserved
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../lib/rules/property");
const RuleTester = require("eslint").RuleTester;

const PATH_TO_BABEL_ESLINT = `${process.cwd()}/node_modules/babel-eslint/`;
const PATH_TO_TYPESCRIPT_ESLINT = `${process.cwd()}/node_modules/@typescript-eslint/parser/`;

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

const eslintTester = new RuleTester();

eslintTester.run("property", rule, {

    // Examples of code that should not trigger the rule
    // XXX this does not find z['innerHTML'] and the like.

    valid: [
        // tests for innerHTML equals
        {
            code: "a.innerHTML = '';",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "a.innerHTML *= 'test';",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "c.innerHTML = ``;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "g.innerHTML = Sanitizer.escapeHTML``;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "h.innerHTML = Sanitizer.escapeHTML`foo`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "i.innerHTML = Sanitizer.escapeHTML`foo${bar}baz`;",
            parserOptions: { ecmaVersion: 6 }
        },

        // tests for innerHTML update (+= operator)
        {
            code: "a.innerHTML += '';",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "b.innerHTML += \"\";",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "c.innerHTML += ``;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "g.innerHTML += Sanitizer.escapeHTML``;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "h.innerHTML += Sanitizer.escapeHTML`foo`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "i.innerHTML += Sanitizer.escapeHTML`foo${bar}baz`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "i.innerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "i.outerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)",
            parserOptions: { ecmaVersion: 6 }
        },

        // (binary) expressions
        {
            code: "x.innerHTML = `foo`+`bar`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "y.innerHTML = '<span>' + 5 + '</span>';",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "document.writeln(Sanitizer.escapeHTML`<em>${evil}</em>`);",
            parserOptions: { ecmaVersion: 6 }
        },

        // template string expression tests
        {
            code: "u.innerHTML = `<span>${'lulz'}</span>`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "v.innerHTML = `<span>${'lulz'}</span>${55}`;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "w.innerHTML = `<span>${'lulz'+'meh'}</span>`;",
            parserOptions: { ecmaVersion: 6 }
        },

        // testing unwrapSafeHTML spread
        {
            code: "this.imeList.innerHTML = Sanitizer.unwrapSafeHTML(...listHtml);",
            parserOptions: { ecmaVersion: 6 }
        },

        // Native method (Check customize code doesn't include these)
        {
            code: "document.toString = evil;"
        },
        { // issue 108: adding tests for custom escaper
            code: "w.innerHTML = templateEscaper`<em>${evil}</em>`;",
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
            code: "w.innerHTML = DOMPurify.sanitize('<em>${evil}</em>');",
            parserOptions: { ecmaVersion: 6 },
            options: [
                {
                    escape: {
                        methods: ["DOMPurify.sanitize"]
                    }
                }
            ]
        },

        // Typescript support valid cases
        // raw strings can be assigned to innerHTML
        {
            code: "(options as HTMLElement).innerHTML = '<s>safe</s>';",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            }
        },
        {
            code: "(<HTMLElement>items[i](args)).innerHTML = 'rawstring';",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            }
        },
        {
            code: "lol.innerHTML = (5 as string);",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
        },
        {
            code: "node!.innerHTML = DOMPurify.sanitize(evil);",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            options: [
                {
                    escape: {
                        methods: ["DOMPurify.sanitize"]
                    }
                }
            ]
        },

        // Flow support cases
        {
            code: "(x: HTMLElement).innerHTML = 'static string'",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "(x: HTMLElement).innerHTML = '<b>safe</b>'",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "(x: HTMLElement).innerHTML = '<b>safe</b>'",
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "(items[i](args): HTMLElement).innerHTML = 'rawstring';",
            parser: PATH_TO_BABEL_ESLINT,
        },

        // support for variables that are declared elsewhere
        {
            code: "var literalFromElsewhere = '<b>safe</b>'; y.innerHTML = literalFromElsewhere;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "const literalFromElsewhereWithInnerExpr = '<b>safe</b>'+'yo'; y.innerHTML = literalFromElsewhereWithInnerExpr;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var multiStepVarSearch = '<b>safe</b>'+'yo'; const copy = multiStepVarSearch; y.innerHTML = copy;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; var copies = 'stillOK'; y.innerHTML = copies;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; if (monday) { copies = 'stillOK'; }; y.innerHTML = copies;",
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var msg = '<b>safe</b>'; var altMsg = 'also cool';  if (monday) { msg = altMsg; }; y.innerHTML = msg;",
            parserOptions: { ecmaVersion: 6 }
        },
    ],

    // Examples of code that should trigger the rule
    invalid: [
        /* XXX Do NOT change the error strings below without review from freddy:
         * The strings are optimized for SEO and understandability.
         * The developer can search for them and will find this MDN article:
         *  https://developer.mozilla.org/en-US/Firefox_OS/Security/Security_Automation
         */

        // innerHTML examples
        {
            code: "m.innerHTML = htmlString;",
            errors: [
                { message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression" }
            ]
        },
        {
            code: "a.innerHTML += htmlString;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "a.innerHTML += template.toHtml();",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "m.outerHTML = htmlString;",
            errors: [
                {
                    message: "Unsafe assignment to outerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "t.innerHTML = `<span>${name}</span>`;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "t.innerHTML = `<span>${'foobar'}</span>${evil}`;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },

        // (binary) expressions
        {
            code: "node.innerHTML = '<span>'+ htmlInput;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "node.innerHTML = '<span>'+ htmlInput + '</span>';",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },

        // bug https://bugzilla.mozilla.org/show_bug.cgi?id=1198200
        {
            code: "title.innerHTML = _('WB_LT_TIPS_S_SEARCH'," +
            " {value0:engine});",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },

        // https://bugzilla.mozilla.org/show_bug.cgi?id=1192595
        {
            code: "x.innerHTML = Sanitizer.escapeHTML(evil)",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "x.innerHTML = Sanitizer.escapeHTML(`evil`)",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "y.innerHTML = ((arrow_function)=>null)`some HTML`",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "y.innerHTML = ((arrow_function)=>null)`some HTML`",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "y.innerHTML = ((arrow_function)=>null)`some HTML`",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },

        // testing unwrapSafeHTML spread sanitizer typo
        {
            code: "this.imeList.innerHTML = Sanitizer.unrapSafeHTML(...listHtml);",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },

        // the previous override for manual review and legacy code is now invalid
        {
            code: "g.innerHTML = potentiallyUnsafe; // a=legacy, bug 1155131",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "function foo() { return this().innerHTML = evil; };",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },

        // issue 154: Adding tests for TaggedTemplateExpression callee https://jestjs.io/docs/api#2-describeeachtablename-fn-timeout
        { 
            code: "describe.each`table${m.innerHTML = htmlString}`(name, fn, timeout)",   
            parserOptions: { ecmaVersion: 6 },
            errors: [
                { message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression" }
            ]
        },
        { 
            code: "describe.each`table${t.innerHTML = `<span>${name}</span>`}`(name, fn, timeout)",   
            parserOptions: { ecmaVersion: 6 },
            errors: [
                { message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression" }
            ]
        },

        // Typescript support cases
        {
            code: "x!().innerHTML = htmlString",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "(x as HTMLElement).innerHTML = htmlString",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "lol.innerHTML = (foo as string);",
            parser: PATH_TO_TYPESCRIPT_ESLINT,
            parserOptions: {
                ecmaVersion: 2018,
                sourceType: "module",
            },
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },

        // Flow support cases
        {
            code: "(x: HTMLElement).innerHTML = htmlString",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "node.innerHTML = (foo: string);",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },
        {
            code: "(items[i](args): HTMLElement).innerHTML = unsafe;",
            parser: PATH_TO_BABEL_ESLINT,
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ]
        },

        // ES2020 support cases
        {
            code: "yoink.innerHTML &&= bar;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "yoink.innerHTML ||= bar;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "yoink.innerHTML ??= bar;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parser: PATH_TO_BABEL_ESLINT,
        },
        {
            code: "copy = '<b>safe</b>'; copy = evil; y.innerHTML = copy;",
            errors: [
                {
                    message: "Unsafe assignment to innerHTML",
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; copies = suddenlyUnsafe; y.innerHTML = copies;",
            errors: [
                {
                    message: /Unsafe assignment to innerHTML \(Variable 'copies' reassigned with unsafe value at \d+:\d+\)/,
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; var copies = suddenlyUnsafe; y.innerHTML = copies;",
            errors: [
                {
                    message: /Unsafe assignment to innerHTML \(Variable 'copies' initialized with unsafe value at \d+:\d+\)/,
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: "var copies = '<b>safe</b>'; if (monday) { copies = badness }; y.innerHTML = copies;",
            errors: [
                {
                    message: /Unsafe assignment to innerHTML \(Variable 'copies' reassigned with unsafe value at \d+:\d+\)/,
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: `var copies = "<b>safe</b>";
              (() => {
                  copies = badness;
              })();
              y.innerHTML = copies;
            `,
            errors: [
                {
                    message: /Unsafe assignment to innerHTML \(Variable 'copies' reassigned with unsafe value at \d+:\d+\)/,
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
        {
            code: `var obj = { prop: "<b>safe</b>" };
              doSomething(obj);
              var copies = obj.prop;
              y.innerHTML = copies;
            `,
            errors: [
                {
                    message: /Unsafe assignment to innerHTML \(Variable 'copies' initialized with unsafe value at \d+:\d+\)/,
                    type: "AssignmentExpression"
                }
            ],
            parserOptions: { ecmaVersion: 6 }
        },
    ]
});
