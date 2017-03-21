/* global module */
/**
 * @fileoverview Rule to flag unescaped assignments to innerHTML
 * @author Frederik Braun, April King
 * @copyright 2015 Mozilla Corporation. All rights reserved.
 */

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
    meta: {
        docs: {
            description: "Rule to flag unescaped assignments to innerHTML",
            category: "possible-errors"
        },
        /* schema statement TBD until we have options
        schema: [
            {
                type: array
            }
        ]*/
    },
    create: function (context) {
        "use strict";

        // valid operators to match against, such as X.innerHTML += foo
        var OPERATORS = ["=", "+="];

        // names of escaping functions that we acknowledge
        var VALID_ESCAPERS = ["Sanitizer.escapeHTML", "escapeHTML"];
        var VALID_UNWRAPPERS = ["Sanitizer.unwrapSafeHTML", "unwrapSafeHTML"];


        /**
         * Returns true if the expression contains allowed syntax, otherwise false.
         * For Template Strings with interpolation (e.g. |`${foo}`|) and
         * Binary Expressions (e.g. |foo+bar|), the function will look into the expression
         * recursively.
         * For testing and development, I recommend looking at example code and its syntax tree.
         * Using the Esprima Demo, for example: http://esprima.org/demo/parse.html
         *
         * @param {Object} expression Checks whether this node is an allowed expression.
         * @param {Object} parent Parent node of the expression node (first param)
         * @returns {boolean}
         */
        function allowedExpression(expression) {
            /*
            expression = { right-hand side of innerHTML or 2nd param to insertAdjacentHTML
            parent is the parent node of the call or assignment.
            */
            var allowed;
            /* check the stringish-part, which is either the right-hand-side of
            an inner/outerHTML assignment or the 2nd parameter to insertAdjacentTML
            */

            /*  surely, someone could have an evil literal in there, but that"s malice
            we can just check for unsafe coding practice, not outright malice
            example literal "<script>eval(location.hash.slice(1)</script>"
            (it"s the task of the tagger-function to be the gateway here.)
            */
            if (expression.type === "Literal") {
                // we just assign a literal (e.g. a string, a number, a bool)
                allowed = true;
            } else if (expression.type === "TemplateLiteral") {
                allowed = true;
                // check for ${..} expressions
                for (var e = 0; e < expression.expressions.length; e++) {
                    var templateExpression = expression.expressions[e];
                    if (!allowedExpression(templateExpression)) {
                        allowed = false;
                        break;
                    }
                }
            } else if (expression.type === "TaggedTemplateExpression") {
                //TODO avoid code-duplication with CallExpression-case below.
                var functionName = context.getSource(expression.tag);
                if (VALID_ESCAPERS.indexOf(functionName) !== -1) {
                    allowed = true;
                } else {
                    allowed = false;
                }
            } else if ((expression.type === "CallExpression") &&
                    (expression.callee.property || expression.callee.name)) {
                var funcName = expression.callee.name || expression.callee.property.name;
                if (funcName && VALID_UNWRAPPERS.indexOf(funcName) !== -1) {
                    allowed = true;
                } else {
                    allowed = false;
                }
            } else if (expression.type === "BinaryExpression") {
                allowed = ((allowedExpression(expression.left))
                && (allowedExpression(expression.right)));
            } else {
                // everything that doesn't match is unsafe:
                allowed = false;
            }
            return allowed;
        }

        return {
            "AssignmentExpression": function (node) {
                // called when an identifier is found in the tree.
                // the "exit" prefix ensures we know all subnodes already.
                if ("property" in node.left) {
                    if (OPERATORS.indexOf(node.operator) !== -1) {
                        if ((node.left.property.name === "innerHTML") ||
                            (node.left.property.name === "outerHTML")) {
                            if (!allowedExpression(node.right)) {
                                context.report(node, "Unsafe assignment to " + node.left.property.name);
                            }
                        }
                    }
                }
            },

            CallExpression: function (node) {
                // this is for insertAdjacentHTML(position, markup)
                switch(node.callee.type) {
                case "Identifier":
                case "MemberExpression":
                    if ("property" in node.callee && node.arguments.length > 0) {
                        if (node.callee.property.name === "insertAdjacentHTML") {
                            if (!allowedExpression(node.arguments[1])) {
                                context.report(node, "Unsafe call to insertAdjacentHTML");
                            }
                        } else if (context.getSource(node.callee) === "document.write") {
                            if (!allowedExpression(node.arguments[0])) {
                                context.report(node, "Unsafe call to document.write");
                            }
                        } else if (context.getSource(node.callee) === "document.writeln") {
                            if (!allowedExpression(node.arguments[0])) {
                                context.report(node, "Unsafe call to" + " document.writeln");
                            }
                        }
                    }
                    break;
                // those are fine:
                case "ArrowFunctionExpression":
                    break;
                case "FunctionExpression":
                    break;
                case "Super":
                    break;
                default:
                    context.report(node, "Error in no-unsafe-innerhtml: Unexpected Callee." +
                     "Please report this function call to the developers at" +
                     "https://github.com/mozfreddyb/eslint-plugin-no-unsafe-innerhtml/issues/" +
                     "new?title=Unsupported+Callee+for+CallExpression");
                }
            }
        };

    }
};
