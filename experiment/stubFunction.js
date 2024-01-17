
var fs = require("fs");
var parser = require("@babel/parser");
var generate = require("@babel/generator").default;
var core = require("@babel/core");
var babel = require("@babel/types");
var tar = require("tar");
var path = require("path");
var { getNumLinesSpannedByNode, generateNodeUID, buildEvalCheck } = require("./stubUtils.js");
var MIN_FCT_STUB_LENGTH = 5; // only stub functions that are > 5 lines long


// Remove a function if it is specified in the list of functions to remove.
function shouldRemoveFunction(fctName, removeFuns) {
    return removeFuns.indexOf(fctName) != -1;
}

function shouldTransformBundlerMode(fctNode) {
    if (fctNode.body.type == "BlockStatement") {
        return generate(fctNode.body.body[0]).code == 'eval("STUB_FLAG_STUB_THIS_STUB_FCT");';
    }
    return false;
}

// transform the function if: 
// the list of functions to stub is empty (this defaults to the entire set of top level functions in the file --
//  TODO probably only DEBUG MODE)
// or, if the function name is in the list
// TODO deal with scoping
function shouldTransformFunction(fctName, reachableFuns, uncoveredMode, fctNode) {
    let [path,info]=fctName.split('do_')
    fctName=path+'do_'+info.split('_')[0]+'_'+info.split('_')[2]
    var fctNotInList = reachableFuns.indexOf(fctName) == -1;
    if (fctNode.body.type == "BlockStatement") {
        fctNotInList = fctNotInList &&
            (!generate(fctNode.body.body[0]).code.startsWith('eval("STUBBIFIER_DONT_STUB_ME");'));
    }
    return fctNotInList;
}
/*
  processAST: do it
*/
function processAST(
    ast,
    functionsToStub,
    reachableFuns,
    filename,
    uncoveredMode,
    safeEvalMode = false,
    bundlerMode = false,
    removeFuns) {
    // let funcMap : Map<string, [babel.Identifier[], babel.BlockStatement]> = new Map();
    var supportedFunctionNodes = [
        "FunctionExpression",
        "FunctionDeclaration",
        "ArrowFunctionExpression",
        "ClassMethod",
        "ObjectMethod",
    ];
    var output = core.transformFromAstSync(ast, null, {
        ast: true,
        plugins: [function processAST() {
            return {
                visitor: {
                    Function: function (path) {
                        // 是函数形式且函数行数超过动态插入的数量
                        if (supportedFunctionNodes.indexOf(path.node.type) > -1
                            && getNumLinesSpannedByNode(path.node) > MIN_FCT_STUB_LENGTH) {

                            let functionUIDName = generateNodeUID(path.node, filename, uncoveredMode);
                            // 判断是否需要替换指定函数
                            if (shouldRemoveFunction(functionUIDName, removeFuns)) {
                                // 跳过构造函数的替换
                                if (path.node.kind == "constructor" || path.node.generator || path.node.async) { // TODO broken for generators -- is this true?
                                    path.skip(); // don't transform a constructor or anything in a constructor (stubs dont work with "super" and "this")
                                }
                                else {
                                    // 主体替换
                                    path.node.body = babel.blockStatement([babel.throwStatement(babel.newExpression(babel.identifier("Error"), [babel.stringLiteral('[Stubbifier] Function was removed!')]))]);
                                }
                            }
                            else if ((bundlerMode && shouldTransformBundlerMode(path.node)) ||
                                (shouldTransformFunction(functionUIDName, reachableFuns, uncoveredMode, path.node))) {
                                // console.log("Triggered stubbification.");
                                if (path.node.kind == "constructor" || path.node.generator || path.node.async) {
                                    // TODO broken for generators -- is this true?
                                    path.skip();
                                    // don't transform a constructor or anything in a constructor (stubs dont work with "super" and "this")
                                }
                                else {
                                    var inClassOrObjMethod = path.findParent(function (path) {
                                        if (path.isClassMethod() || path.isObjectMethod())
                                            return path;
                                    });
                                    if (path.node.type == "ClassMethod" ||
                                        path.node.type == "ObjectMethod" ||
                                        inClassOrObjMethod) {
                                        // It's a constructor, getter, or setter.
                                        var afun = babel.arrowFunctionExpression(path.node.params, path.node.body, path.node.async);
                                        functionsToStub.set(functionUIDName, generate(afun).code);
                                        if (path.node.type == "ClassMethod" || path.node.type == "ObjectMethod") {
                                            if (!path.node.key.name) {
                                                path.node.body = generateNewClassMethodNoID(functionUIDName, path.node.key, path.node.type == "ArrowFunctionExpression");
                                            }
                                            else {
                                                path.node.body = generateNewClassMethodWithID(functionUIDName, path.node.key.name, path.node.kind, path.node.type == "ArrowFunctionExpression");
                                            }
                                        }
                                        else { // this is the inClassOrObjMethod
                                            if (path.node.id && path.node.id.name) {
                                                path.node.body = generateNewFunctionWithID(functionUIDName, path.node.id.name, path.node.type == "ArrowFunctionExpression");
                                            }
                                            else {
                                                // can't do the transformation if there's no name. because, there is no way to 
                                                // refer to a function with no name, inside a class method. our normal strategy of using "this" doesn't
                                                // work since inside a class it would refer to the class instance
                                                functionsToStub.delete(functionUIDName); // delete from map -- needed to add first bc path.node.body changes
                                                path.skip();
                                            }
                                        }
                                    }
                                    else {
                                        functionsToStub.set(functionUIDName, generate(path.node).code);
                                        var forbiddenFunctionReassignments = [
                                            "VariableDeclarator",
                                            "CallExpression",
                                            "AssignmentExpression",
                                            "ReturnStatement",
                                            "ObjectProperty"
                                        ];
                                        path.node.body = (path.node.id && path.node.id.name && (forbiddenFunctionReassignments.indexOf(path.parentPath.node.type) == -1)) ?
                                            generateNewFunctionWithID(functionUIDName, path.node.id.name, path.node.type == "ArrowFunctionExpression") :
                                            generateNewFunctionNoID(functionUIDName, path.node.type == "ArrowFunctionExpression");
                                        if (path.node.type == "ArrowFunctionExpression") {
                                            path.node.params = [babel.restElement(babel.identifier("args_uniqID"))];
                                        }
                                    }
                                }
                            }
                        }
                    },
                }
            };
        }]
    });
    return output.ast;
}
// 为具名函数添加动态加载
function generateNewFunctionWithID(scopedFctName, fctID, isArrowFunction = false) {
    scopedFctName=scopedFctName.split(':')[1].replace(/\\/g,'gan')
    let argsName = isArrowFunction ? "args_uniqID" : "arguments";
    let newFunctionBodyString = `let toExec = eval(stubs.getCode("${scopedFctName}"));
                                           toExec = stubs.copyFunctionProperties(${fctID}, toExec);
                                           ${fctID} = toExec;
                                           return toExec.apply(this, ${argsName});`
    return babel.blockStatement(parser.parse(newFunctionBodyString,
        {
            allowReturnOutsideFunction: true, sourceType: "unambiguous",
            plugins: ["classProperties"]
        }).program.body);
}
// 为匿名函数添加动态加载
function generateNewFunctionNoID(scopedFctName, isArrowFunction) {
    // 先从缓存中读取，缓存未命中，则再动态加载
    scopedFctName=scopedFctName.split(':')[1].replace(/\\/g,'gan')
    let argsName = isArrowFunction ? "args_uniqID" : "arguments";
    let newFunctionBodyString = `let fctID = "${scopedFctName}";
                                           let toExecString = stubs.getStub(fctID);
                                           if (! toExecString) {
                                             toExecString = stubs.getCode(fctID);
                                             stubs.setStub(fctID, toExecString);
                                           }
                                           let toExec = eval(toExecString);
                                           toExec = stubs.copyFunctionProperties(this, toExec);
                                           toExec.stubbifierExpandedStub = true;
                                           return toExec.apply(this, ${argsName});`
    return babel.blockStatement(parser.parse(newFunctionBodyString,
        {
            allowReturnOutsideFunction: true, sourceType: "unambiguous",
            plugins: ["classProperties"]
        }).program.body);
}
// for class methods, we can redefine them from inside themselves
// but the format is different from nonclass methods: we need to use this.__proto__.ID
function generateNewClassMethodWithID(scopedFctName, fctID, kind, isArrowFunction) {
    scopedFctName=scopedFctName.split(':')[1].replace(/\\/g,'gan')
    let argsName = isArrowFunction ? "args_uniqID" : "arguments";
    let fctDefString = `this.${fctID} = toExec;`; // default callExpression
    let fctLookupString = `this.${fctID}`;
    switch (kind) {
        case "get":
            fctDefString = `this.__defineGetter__(\"${fctID}\", toExec);`
            fctLookupString = `this.__lookupGetter__(\"${fctID}\")`;
            break;
        case "set":
            fctDefString = `this.__defineSetter__(\"${fctID}\", toExec);`
            fctLookupString = `this.__lookupSetter__(\"${fctID}\")`;
            break;
    }
    let newFunctionBodyString = `let toExec = eval(stubs.getCode("${scopedFctName}"));
                                           toExec = stubs.copyFunctionProperties(${fctLookupString}, toExec);
                                           ${fctDefString}
                                           return toExec.apply(this, ${argsName});`
    return babel.blockStatement(parser.parse(newFunctionBodyString,
        {
            allowReturnOutsideFunction: true, sourceType: "unambiguous",
            plugins: ["classProperties"]
        }).program.body);
}
function generateNewClassMethodNoID(scopedFctName, key, isArrowFunction = false) {
    scopedFctName=scopedFctName.split(':')[1].replace(/\\/g,'gan')
    let argsName = isArrowFunction ? "args_uniqID" : "arguments";
    let newFunctionBodyString = `let fctID = "${scopedFctName}";
                                           let toExecString = stubs.getStub(fctID);
                                           if (! toExecString) {
                                             toExec = stubs.getCode(fctID);
                                             stubs.setStub(fctID, toExecString);
                                           }
                                           let toExec = eval(toExecString);
                                           toExec = stubs.copyFunctionProperties(this[${generate(key).code}], toExec);
                                           return toExec.apply(this, ${argsName});`
    return babel.blockStatement(parser.parse(newFunctionBodyString,
        {
            allowReturnOutsideFunction: true, sourceType: "unambiguous",
            plugins: ["classProperties"]
        }).program.body);
}
function stubFunction(
    filename,
    stubspath,
    functionsToStub,
    reachableFuns,
    removeFuns,
    uncoveredMode,
    safeEvalMode = false,
    testingMode = false,
    zipFiles = false,
    bundleMode = false) {
    // save the old file 
    // this might get removed later, but is useful right now for debugging
    fs.copyFileSync(filename, filename + ".original");
    let code = fs.readFileSync(filename, 'utf-8');
    // let origCodeFileName: string = process.cwd() + "/" + filename + ".BIGG";
    let ast;
    let esmMode = false;
    try {
        ast = parser.parse(code, { sourceType: "unambiguous", plugins: ["classProperties", "typescript"] }).program;
        esmMode = ast.sourceType == "module";
    }
    catch (e) {
        console.error("Yikes... parsing error in " + filename + ":  " + e);
        return;
    }
    // Preprocess the AST, propagating function ID information to FunctionExpressions.
    ast = processAST(
        ast,
        functionsToStub,
        reachableFuns,
        filename,
        uncoveredMode,
        safeEvalMode,
        bundleMode,
        removeFuns);
    var setup_stubs = "let stubs = new (require('" + stubspath + "/stubbifier_cjs.cjs'))('" + filename + "', " + testingMode + ");";
    if (esmMode) {
        setup_stubs = "import {default as stubs_fct} from '" + stubspath + "/stubbifier_es6.mjs'; let stubs = new stubs_fct('" + filename + "', " + testingMode + ");";
    }
    ast = core.transformFromAstSync(ast, null, {
        ast: true,
        plugins: [
            function visitAndAddStubsSetup() {
                return {
                    visitor: {
                        Program: function (path) {
                            path.node.body = (parser.parse(setup_stubs, { sourceType: "unambiguous" }).program.body).concat(path.node.body);
                            path.skip();
                        }
                    }
                };
            }
        ]
    }).ast;
    // console.log(generate(ast).code)
    // write out the stub, overwriting the old file
    fs.writeFileSync(filename, generate(ast).code.split('eval("STUB_FLAG_STUB_THIS_STUB_FCT");').join("\n"));
    // make the directory, so there can be a file added to it for each function processed
    // only create the dir if it doesn't already exist
    if (!fs.existsSync(filename + ".dir")) {
        fs.mkdirSync(filename + ".dir");
    }
    // then, write out all the functions to be stubbified 
    // forEach for a map iterates over: value, key
    functionsToStub.forEach(function (fctBody, fctName, map) {
        fctName=fctName.split(':')[1].replace(/\\/g,'gan')
        if (bundleMode) {
            fctBody = fctBody.split('eval("STUB_FLAG_STUB_THIS_STUB_FCT");').join("\n");
        }
        var stubFileBody = "let " + fctName + " = " + fctBody+ "; \n\n" + fctName + ";";
        // TODO: currently in safeEvalMode we check to see if console.log is eval
        // if (testingMode) {
        //     console.log(`[STUBBIFIER METRICS] function stubbed: ${fctName} --- ${filename}`);
        //     stubFileBody = `console.log("[STUBBIFIER METRICS] EXPANDED STUB HAS BEEN CALLED: ${fctName} --- ${filename}");` + stubFileBody;
        // }

        fs.writeFileSync(filename +".dir/" + fctName +".BIGG", stubFileBody);
        // console.log(fctBody);
    });
    // Now that the directory is written, zip it up (if we want to).
    if (zipFiles) {
        var justFile = path.basename(filename);
        var pathToFile = path.dirname(filename);
        tar.c({
            gzip: true, // this will perform the compression too
            sync: true,
            cwd: process.cwd() + '/' + pathToFile
        }, [justFile + ".dir"]).pipe(fs.createWriteStream(filename + ".dir" + '.tgz'));
        // Once zipped, delete the existing directory.
        fs.rmdirSync(filename + ".dir", { recursive: true });
    }
}
exports.stubFunction = stubFunction;
