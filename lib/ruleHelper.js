/**
 * @fileoverview ESLint helpers for checking sanitization
 * @author Frederik Braun et al.
 * @copyright 2015-2017 Mozilla Corporation. All rights reserved.
 */
"use strict";

// names of escaping functions that we acknowledge
const VALID_ESCAPERS = ["Sanitizer.escapeHTML", "escapeHTML"];
const VALID_UNWRAPPERS = ["Sanitizer.unwrapSafeHTML", "unwrapSafeHTML"];

/** Change this to class RuleHelper when <4.2.6 is no longer an issue
 *
 * @constructor
 * @param {Object} context ESLint configuration context
 * @param {Object} defaultRuleChecks Default rules to merge with
 * this.context
 *
 */
function RuleHelper(context, defaultRuleChecks) {
    this.context = context;
    this.ruleChecks = this.combineRuleChecks(defaultRuleChecks);
}

RuleHelper.prototype = {
    /**
     * Returns true if the expression contains allowed syntax, otherwise false.
     * For Template Strings with interpolation (e.g. |`${foo}`|) and
     * Binary Expressions (e.g. |foo+bar|), the function will look into the expression
     * recursively.
     * For testing and development, I recommend looking at example code and its syntax tree.
     * Using the Esprima Demo, for example: http://esprima.org/demo/parse.html
     *
     * @constructor
     * @param {Object} expression Checks whether this node is an allowed expression.
     * @param {Object} escapeObject contains keys "methods" and "taggedTemplates" which are arrays of strings
     *                              of matching escaping function names.
     */
    allowedExpression(expression, escapeObject) {
        if (!escapeObject) {
            escapeObject = {};
        }
        /*
        expression = { right-hand side of innerHTML or 2nd param to insertAdjacentHTML
        */
        let allowed;
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
        } else if (expression.type === "TemplateElement") {
            // Raw text from a template
            allowed = true;
        } else if (expression.type === "TemplateLiteral") {
            allowed = true;

            // check for ${..} expressions
            for (let e = 0; e < expression.expressions.length; e++) {
                const templateExpression = expression.expressions[e];
                if (!this.allowedExpression(templateExpression, escapeObject)) {
                    allowed = false;
                    break;
                }
            }
        } else if (expression.type === "TaggedTemplateExpression") {
            allowed = this.isAllowedCallExpression(expression.tag, escapeObject.taggedTemplates || VALID_ESCAPERS);
        } else if (expression.type === "CallExpression") {
            allowed = this.isAllowedCallExpression(expression.callee, escapeObject.methods || VALID_UNWRAPPERS);
        } else if (expression.type === "BinaryExpression") {
            allowed = ((this.allowedExpression(expression.left, escapeObject))
            && (this.allowedExpression(expression.right, escapeObject)));
        } else if (expression.type === "TSAsExpression") {
            // TSAsExpressions contain the raw javascript value in 'expression'
            allowed = this.allowedExpression(expression.expression, escapeObject);
        } else if (expression.type === "TypeCastExpression") {
            allowed = this.allowedExpression(expression.expression, escapeObject);
        } else if (Array.isArray(expression)) {
            allowed = expression.every((e) => this.allowedExpression(e, escapeObject));
        } else if (expression.type == "Identifier") {
            // find declared variables and see which are literals
            const scope = this.context.getScope(expression);
            const variableInfo = scope.set.get(expression.name);

            // let's see if this variable is allowed, by tracing it back through the code
            if (variableInfo) {
                // look if the var was defined as allowable
                let definedAsAllowed = false;
                for (const def of variableInfo.defs) {
                    if (def.node.type === "VariableDeclarator") {
                        // the `init` property carries the right-hand side of the variable definition:
                        const varInitAs = def.node.init;
                        if (!this.allowedExpression(varInitAs, escapeObject)) {
                            // if one variable definition is considered unsafe, all are.
                            // NB: order of definition is unclear. See issue #168.
                            definedAsAllowed = false;
                            break;
                        }

                        // keep iterating through other definitions.
                        definedAsAllowed = true;

                    }
                }
                if (definedAsAllowed) {
                    // the variable was declared as a safe value (e.g., literal)
                    // now inspect writing references to that variable
                    let allWritingRefsAllowed = false;
                    for (const ref of variableInfo.references) {
                        // only look into writing references
                        if (ref.isWrite()) {
                            const writeExpr = ref.writeExpr;

                            // if one is unsafe we'll consider all unsafe.
                            // this is because code occurring doesn't guarantee it being executed
                            // due to dynamic behavior if-conditions and such
                            if (!this.allowedExpression(writeExpr, escapeObject)) {
                                allWritingRefsAllowed = false;
                                break;
                            }
                            allWritingRefsAllowed = true;
                        }
                    }

                    // allow this variable, because all writing references to it were allowed.
                    allowed = allWritingRefsAllowed;
                }
            }
        }
        else {
            // everything that doesn't match is unsafe:
            allowed = false;
        }
        return allowed;
    },

    /**
     * Check if a callee is in the list allowed sanitizers
     *
     * @param {Object} callee Function that is being called expression.tag
     * or expression.callee
     * @param {Array} allowedSanitizers List of valid wrapping expressions
     * @returns {boolean} Returns whether call to the callee is allowed
     */
    isAllowedCallExpression(callee, allowedSanitizers) {
        const funcName = this.getCodeName(callee);
        let allowed = false;
        if (funcName && allowedSanitizers.indexOf(funcName) !== -1) {
            allowed = true;
        }
        return allowed;
    },

    /**
     * Captures safely any new node types that have been missed and throw when we don't support them
     * this normalizes the passed in identifier type to return the same shape
     *
     * @param {Object} node A callable expression to be simplified
     * @returns {Object} Method and (if applicable) object name
     */
    normalizeMethodCall(node) {
        let methodName;
        let objectName;
        switch (node.type) {
        case "Identifier":
            methodName = node.name;
            break;
        case "MemberExpression":
            methodName = node.property.name;
            objectName = node.object.name || this.context.getSource(node.object);
            break;
        case "ArrowFunctionExpression":
            methodName = "";
            break;
        case "Import":
            methodName = "import";
            break;
        default:
            this.reportUnsupported(node, "Unexpected callable", `unexpected ${node.type} in normalizeMethodCall`);
        }
        return {
            objectName,
            methodName
        };
    },

    /**
     * Returns functionName or objectName.methodName of an expression
     *
     * @param {Object} node A callable expression
     * @returns {String} A nice name to expression call
     */
    getCodeName(node) {
        const normalizedMethodCall = this.normalizeMethodCall(node);
        let codeName = normalizedMethodCall.methodName;
        if (normalizedMethodCall.objectName) {
            codeName = `${normalizedMethodCall.objectName}.${codeName}`;
        }
        return codeName;
    },

    /**
     * Checks to see if a method or function should be called
     * If objectMatches isn't present or blank array the code should not be checked
     * If we do have object filters and the call is a function then it should not be checked
     *
     * Checks if there are objectMatches we need to apply
     * @param {Object} node Call expression node
     * @param {Object} objectMatches Strings that are checked as regex to
     * match an object name
     * @returns {Boolean} Returns whether to run checks expression
     */
    shouldCheckMethodCall(node, objectMatches) {
        const normalizedMethodCall = this.normalizeMethodCall(node.callee);
        let matched = false;

        // Allow methods named "import":
        if (normalizedMethodCall.methodName == "import"
            && node.callee && node.callee.type == "MemberExpression") {
            return false;
        }

        // If objectMatches isn't present we should match all
        if (!objectMatches) {
            return true;
        }

        // if blank array the code should not be checked, this is a quick way to disable rules
        // TODO should we make this match all instead and let the $ruleCheck be false instead?
        if (objectMatches.length === 0) {
            return false;
        }

        // If we do have object filters and the call is a function then it should not be checked
        if ("objectName" in normalizedMethodCall && normalizedMethodCall.objectName) {
            for (const objectMatch of objectMatches) {
                const match = new RegExp(objectMatch, "gi");
                if (normalizedMethodCall.objectName.match(match)) {
                    matched = true;
                    break;
                }
            }
        }

        // if we don't have a objectName return false as bare function call
        // if we didn't match also return false
        return matched;
    },

    /**
     * Algorithm used to decide on merging ruleChecks with this.context
     * @param {Object} defaultRuleChecks Object containing default rules
     * @returns {Object} The merged ruleChecks
     */
    combineRuleChecks(defaultRuleChecks) {
        const parentRuleChecks = this.context.options[0] || {};
        let childRuleChecks = Object.assign({}, this.context.options[1]);
        const ruleCheckOutput = {};

        if (!("defaultDisable" in parentRuleChecks)
            || !parentRuleChecks.defaultDisable) {
            childRuleChecks = Object.assign({}, defaultRuleChecks, childRuleChecks);
        }

        // If we have defined child rules lets ignore default rules
        Object.keys(childRuleChecks).forEach((ruleCheckKey) => {
            // However if they have missing keys merge with default
            const ruleCheck = Object.assign(
                "defaultDisable" in parentRuleChecks ? {} :
                    {
                        escape: {
                            taggedTemplates: ["Sanitizer.escapeHTML", "escapeHTML"],
                            methods: ["Sanitizer.unwrapSafeHTML", "unwrapSafeHTML"]
                        }
                    },
                defaultRuleChecks[ruleCheckKey],
                parentRuleChecks,
                childRuleChecks[ruleCheckKey]);
            ruleCheckOutput[ruleCheckKey] = ruleCheck;
        });

        return ruleCheckOutput;
    },

    /**
     * Runs the checks against a CallExpression
     * @param {Object} node Call expression node
     * @returns {undefined} Does not return
     */
    checkMethod(node) {
        const normalizeMethodCall = this.normalizeMethodCall(node.callee);
        const methodName = normalizeMethodCall.methodName;

        if (Object.prototype.hasOwnProperty.call(this.ruleChecks, methodName)) {
            const ruleCheck = this.ruleChecks[methodName];
            if (!Array.isArray(ruleCheck.properties)) {
                this.context.report(node, `Method check requires properties array in eslint rule ${methodName}`);
                return;
            }
            ruleCheck.properties.forEach((propertyId) => {
                const argument = node.arguments[propertyId];
                if (this.shouldCheckMethodCall(node, ruleCheck.objectMatches)
                    && !this.allowedExpression(argument, ruleCheck.escape)) {
                    this.context.report(node, `Unsafe call to ${this.getCodeName(node.callee)} for argument ${propertyId}`);
                }
            });
        }
    },

    /**
     * Runs the checks against an assignment expression
     * @param {Object} node Assignment expression node
     * @returns {undefined} Does not return
     */
    checkProperty(node) {
        if (Object.prototype.hasOwnProperty.call(this.ruleChecks, node.left.property.name)) {
            const ruleCheck = this.ruleChecks[node.left.property.name];
            if (!this.allowedExpression(node.right, ruleCheck.escape)) {
                this.context.report(node, `Unsafe assignment to ${node.left.property.name}`);
            }
        }
    },

    reportUnsupported(node, reason, errorTitle) {
        const bugPath = `https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/new?title=${encodeURIComponent(errorTitle)}`;
        this.context.report(node, `Error in no-unsanitized: ${reason}. Please report a minimal code snippet to the developers at ${bugPath}`);
    }

};

module.exports = RuleHelper;
