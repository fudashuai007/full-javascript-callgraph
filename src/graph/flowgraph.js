

var astutil = require('./astVisitor'),
    graph = require('./graph'),
    symtab = require('../utils/symtab');

// 根据抽象语法树的不同节点类型，在控制流图中添加相应的边
function addIntraproceduralFlowGraphEdges(ast, flow_graph) {
    flow_graph = flow_graph || new graph.FlowGraph();
    astutil.visit(ast, function (nd) {
        switch (nd.type) {
            // 遍历数组表达式中的每个元素，如果元素存在，则在流图中添加从元素顶点到属性顶点（对应数组索引）的边
            case 'ArrayExpression':
                for (var i = 0; i < nd.elements.length; ++i)
                    if (nd.elements[i])
                        flow_graph.addEdge(vertexFor(nd.elements[i]), propVertex({
                            type: 'Literal',
                            value: i
                        }));
                break;

            // R1
            case 'AssignmentExpression':
                if (nd.operator === '=')
                    // 添加从右侧表达式顶点到左侧表达式顶点和整个赋值表达式顶点的边
                    flow_graph.addEdges(vertexFor(nd.right), [vertexFor(nd.left), vertexFor(nd)]);
                break;

            // R9
            case 'CallExpression':
                // 添加从成员表达式的对象顶点到第一个参数顶点的边。
                if (nd.callee.type === 'MemberExpression')
                    flow_graph.addEdge(vertexFor(nd.callee.object), argVertex(nd, 0));
                // if (nd.callee.type === 'ParenthesizedExpression' || nd.callee.type === 'FunctionExpression')
                //     flow_graph.addEdge(vertexFor(nd.attr.callee), calleeVertex(nd))
            // R8 FALL THROUGH
            case 'NewExpression':
                // 添加从构造函数（callee）顶点到调用者顶点的边
                flow_graph.addEdge(vertexFor(nd.callee), calleeVertex(nd));
                // console.log(nd);
                //遍历调用表达式的参数，并在流图中添加从每个参数顶点到对应的参数顶点（按顺序递增 1）的边
                for (var i = 0; i < nd.arguments.length; ++i)
                    flow_graph.addEdge(vertexFor(nd.arguments[i]), argVertex(nd, i));
                // 添加从调用结果顶点到调用表达式顶点的边
                flow_graph.addEdge(resVertex(nd), vertexFor(nd));
                break;

            case 'CatchClause':
                if (!nd.param) {
                    break
                }
                // 添加从未知顶点到参数顶点的边
                flow_graph.addEdge(unknownVertex(), varVertex(nd.param));
                break;

            // 添加从 consequent 表达式顶点到条件表达式顶点的边，以及从 alternate 表达式顶点到条件表达式顶点的边
            case 'ConditionalExpression':
                flow_graph.addEdge(vertexFor(nd.consequent), vertexFor(nd));
                flow_graph.addEdge(vertexFor(nd.alternate), vertexFor(nd));
                break;

            // R7
            case 'ClassDeclaration':
            case 'ClassExpression':
                var body = nd.body.body;
                if (nd.id)
                    for (let i = 0; i < body.length; ++i) // 遍历类体
                        if (body[i].kind === 'constructor')
                            // 添加从函数值顶点到函数标识符顶点的边
                            flow_graph.addEdge(funcVertex(body[i].value), vertexFor(nd.id));
                break;

            case 'FunctionDeclaration':
                console.log(nd);
                if (nd.id) {
                    // 添加从函数值顶点到函数标识符顶点的边
                    // for (let i = 0; i < nd.params.length; i++) {
                    //     flow_graph.addEdge(vertexFor(nd.params[i]), funcVertex(nd))
                    // }
                    flow_graph.addEdge(funcVertex(nd), vertexFor(nd.id));
                }


                break;

            // R6 添加从函数值顶点到表达式顶点的边
            case 'FunctionExpression':
            case 'ArrowFunctionExpression':
                flow_graph.addEdge(funcVertex(nd), exprVertex(nd));
                for (let i = 0; i < nd.params.length; i++) {
                    flow_graph.addEdge(vertexFor(nd.id), vertexFor(nd.params[i]))
                    flow_graph.addEdge(vertexFor(nd.id), vertexFor(nd.params[i+1]))
                }
                if (nd.attr.parent.type === 'ParenthesizedExpression') {
                    flow_graph.addEdge(funcVertex(nd), vertexFor(nd.id));
                } else {
                    // flow_graph.addEdge(funcVertex(nd), exprVertex(nd));

                    if (nd.id) {
                        console.log(nd);

                        // if(nd.keyName==='arguments'){
                        //     let path = nd.attr.path.split(' ')
                        //     let index = path.indexOf(nd.id.name)
                        //     let parentName = path[index-1]
                        //    console.log(parentName);
                        //     flow_graph.addEdge({
                        //         type: 'GlobalVertex',
                        //         name: parentName,
                        //         attr: {
                        //             pp: function () { return 'Glob(' + parentName + ')'; }
                        //         }
                        //     },varVertex(nd.id))
                        // }
                        flow_graph.addEdge(funcVertex(nd), varVertex(nd.id)); // 添加从函数值顶点到函数标识符顶点的边F
                        
                    } // 如果有标识符


                    // flow_graph.addEdge(varVertex(nd.id),exprVertex(nd))
                }

                break;

            // R2, R4
            case 'LogicalExpression':
                if (nd.operator === '||')
                    flow_graph.addEdge(vertexFor(nd.left), vertexFor(nd)); // 添加从左侧表达式顶点到逻辑表达式顶点的边
                flow_graph.addEdge(vertexFor(nd.right), vertexFor(nd));
                break;

            // R5 遍历对象的属性，对于每个属性（init 类型），在流图中添加从属性值顶点到属性键顶点的边
            case 'ObjectExpression':
                nd.properties.forEach(function (prop) {
                    if (prop.kind === 'init') {
                        // Temporary fix for computed property names
                        if (prop.key.type === 'Identifier' || prop.key.type == 'Literal')
                            flow_graph.addEdge(vertexFor(prop.value), propVertex(prop.key));
                    }
                });
                break;

            // R10 添加从返回语句参数顶点到所在函数的返回顶点的边
            case 'ReturnStatement':
                if (nd.argument)
                    flow_graph.addEdge(vertexFor(nd.argument), retVertex(nd.attr.enclosingFunction));
                break;
            // 加从最后一个表达式顶点到序列表达式顶点的边
            case 'SequenceExpression':
                flow_graph.addEdge(vertexFor(nd.expressions[nd.expressions.length - 1]), vertexFor(nd));
                break;

            case 'ThrowStatement':
                flow_graph.addEdge(vertexFor(nd.argument), unknownVertex());
                break;
            // 添加从初始化表达式顶点到变量标识符顶点的边
            case 'VariableDeclarator':
                // Only handle the case that nd.id is an Identifer
                // ObjectPattern and ArrayPattern are handled separately
                if (nd.id.type === 'Identifier' && nd.init) // 
                    flow_graph.addEdge(vertexFor(nd.init), vertexFor(nd.id));
                break;
            // 对象模式（ES6中的解构赋值）
            // ES6 rule, similar to object expression
            // Currently don't support rest and default params
            case 'ObjectPattern':
                for (let prop of nd.properties) {
                    if (!prop.key || !prop.value) {
                        continue
                    }
                    // 遍历对象模式的属性，假设属性的键和值都是标识符类型，然后在流图中添加从属性键顶点到属性值顶点的边
                    // Assuming prop.key and prop.value are Identifers
                    flow_graph.addEdge(propVertex(prop.key), vertexFor(prop.value));
                }

                break;

            // ES6 rule, similar to array expression
            // Currently don't support rest and default params
            case 'ArrayPattern':
                for (let i = 0; i < nd.elements.length; i++) {
                    // 遍历数组模式的元素，如果元素存在，则在流图中添加从字面量顶点（对应数组索引）到元素值顶点的边
                    // Array destructuring can ignore some values, so check null first
                    if (nd.elements[i])
                        flow_graph.addEdge(
                            propVertex({ type: 'Literal', value: i }),
                            vertexFor(nd.elements[i])
                        );
                }
                break;
            // 处理类的方法定义。如果方法的键是标识符或私有名称（PrivateName），则在流图中添加从方法值顶点到方法键顶点的边
            case 'MethodDefinition':
                if (nd.key.type === 'Identifier' || nd.key.type === 'PrivateName')
                    flow_graph.addEdge(funcVertex(nd.value), propVertex(nd.key))
                break;

            // case 'BinaryExpression':

            //     flow_graph.addEdge(vertexFor(nd.left), vertexFor(nd));
            //     flow_graph.addEdge(vertexFor(nd.right), vertexFor(nd));
            //     break
        }
    });


    return flow_graph;


}

/* Return the flow graph vertex corresponding to a given AST node. */
function vertexFor(nd) {
    var decl, body;
    switch (nd.type) {
        case 'Identifier':
            // global variables use a global vertex, local variables a var vertex
            // console.log(nd.attr.scope);
            if (!nd.attr.scope)
                decl = nd.attr.scope.get(nd.name);
            return decl && !decl.attr.scope.global  ? varVertex(decl) : globVertex(nd);
        case 'ThisExpression':
            // 'this' is treated like a variable
            decl = nd.attr.scope.get('this');
            return decl ? varVertex(decl) : exprVertex(nd);
        case 'ClassExpression':
            if (nd.id)
                return vertexFor(nd.id);

            body = nd.body.body;
            for (let i = 0; i < body.length; ++i)
                if (body[i].kind === 'constructor')
                    return funcVertex(body[i].value);
            break;
        case 'MemberExpression':
            // ignore dynamic property accesses
            if (!nd.computed)
                return propVertex(nd.property);
    }
    return exprVertex(nd);
}

// variable vertices are cached at the variable declarations
function varVertex(nd) {
    if (!nd) return

    if (nd && nd.type !== 'Identifier' && nd.type !== 'PrivateName')
        throw new Error("invalid variable vertex");

    return nd.attr.var_vertex
        || (nd.attr.var_vertex = {
            type: 'VarVertex',
            node: nd,
            attr: {
                pp: function () {
                    return 'Var(' + nd.name + ', ' + astutil.ppPos(nd) + ')';
                }
            }
        });


}

// global cache of property vertices
var propVertices = new symtab.Symtab();

// retrieve property vertex from cache, or create new one
function propVertex(nd) {
    var p;

    if (nd.type === 'Identifier')
        p = nd.name;
    else if (nd.type === 'Literal')
        // this case handles array, property field: 0, 1, 2...
        p = nd.value + "";
    else if (nd.type === 'PrivateName')
        if (nd.id.type === 'Identifier') {
            p = nd.id.name
        } else if (nd.id.type === 'Literal') {
            p = nd.value + ""
        } else
            throw new Error("invalid property vertex");
    else
        throw new Error("invalid property vertex");

    return propVertices.get(p, {
        type: 'PropertyVertex',
        name: p,
        attr: {
            pp: function () { return 'Prop(' + p + ')'; }
        }
    });
}

// global cache of global vertices
let globVertices = new symtab.Symtab();

// globVertices are propVertices in the global scope
// similar to propVertex, globVertex doesn't have an associated ast node
function globVertex(nd) {
    let gp;
    if (nd.type === 'Identifier')
        gp = nd.name;
    else if (nd.type === 'Literal')
        // this case handles array, property field: 0, 1, 2...
        gp = nd.value + "";
    else
        throw new Error("invalid global vertex");

    return globVertices.get(gp, {
        type: 'GlobalVertex',
        name: gp,
        attr: {
            pp: function () { return 'Glob(' + gp + ')'; }
        }
    });
}

// vertices representing well-known native functions
var nativeVertices = new symtab.Symtab();

function nativeVertex(name) {
    return nativeVertices.get(name, {
        type: 'NativeVertex',
        name: name,
        attr: {
            pp: function () {
                return name;
            }
        }
    });
}

function getNativeVertices() {
    return nativeVertices.values();
}

// special ``unknown'' vertex representing flow that is not explicitly modelled
// var theUnknownVertex = 
// };

function unknownVertex() {
    return {
        type: 'UnknownVertex',
        attr: {
            pp: function () {
                return 'Unknown';
            }
        }
    }
}
// function vertex
function funcVertex(fn) {
    if (!astutil.isFunction(fn))
        throw new Error("invalid function vertex");
    return fn.attr.func_vertex
        || (fn.attr.func_vertex = {
            type: 'FuncVertex',
            func: fn,
            attr: {
                pp: function () {
                    return 'Func(' + astutil.ppPos(fn) + ')';
                },
                // code:fn.originCode || ''
            }
        });
}

// parameter vertex
function parmVertex(fn, i) {
    if (!astutil.isFunction(fn))
        throw new Error("invalid function vertex");
    var vertex;
    if (i === 0) {
        vertex = varVertex(fn.attr.scope.get('this'));
    } else {
        // In ES6, fn.params[i - 1] might not be an Identifier
        // vertex = varVertex(fn.params[i - 1]);
        vertex = vertexFor(fn.params[i - 1]);
    }
    return vertex;
}

// vertex representing function return value
function retVertex(fn) {
    if (!astutil.isFunction(fn))
        throw new Error("invalid return vertex");

    return fn.attr.ret_vertex
        || (fn.attr.ret_vertex = {
            type: 'ReturnVertex',
            node: fn,
            attr: {
                pp: function () {
                    return 'Ret(' + astutil.ppPos(fn) + ')';
                }
            }
        });
}

// vertex representing callee at a call site
function calleeVertex(nd) {
    if (nd.type !== 'CallExpression' && nd.type !== 'NewExpression')
        throw new Error("invalid callee vertex");

    return nd.attr.callee_vertex
        || (nd.attr.callee_vertex = {
            type: 'CalleeVertex',
            call: nd,
            attr: {
                pp: function () {
                    return 'Callee(' + astutil.ppPos(nd) + ')';
                }
            }
        });
}

// vertex representing the ith argument at a call site; 0th argument is receiver
function argVertex(nd, i) {
    if (nd.type !== 'CallExpression' && nd.type !== 'NewExpression')
        throw new Error("invalid callee vertex");
    if (i === 0) {
        return nd.attr.receiver_vertex
            || (nd.attr.receiver_vertex = {
                type: 'ArgumentVertex',
                node: nd,
                attr: {
                    pp: function () {
                        return 'Arg(' + astutil.ppPos(nd) + ', 0)';
                    }
                }
            });
    } else {
        return nd.arguments[i - 1].attr.arg_vertex
            || (nd.arguments[i - 1].attr.arg_vertex = {
                type: 'ArgumentVertex',
                node: nd,
                attr: {
                    pp: function () {
                        return 'Arg(' + astutil.ppPos(nd) + ', ' + i + ')';
                    }
                }
            });
    }
}

// function argsVertex(nd){
//     return nd.arguments[i - 1].attr.arg_vertex
//             || (nd.arguments[i - 1].attr.arg_vertex = {
//                 type: 'ArgumentVertex',
//                 node: nd,
//                 attr: {
//                     pp: function () {
//                         return 'Arg(' + astutil.ppPos(nd) + ', ' + i + ')';
//                     }
//                 }
//             });
// }

// vertex representing result of a call
function resVertex(nd) {
    if (nd.type !== 'CallExpression' && nd.type !== 'NewExpression')
        throw new Error("invalid result vertex");
    return nd.attr.res_vertex
        || (nd.attr.res_vertex = {
            type: 'ResVertex',
            node: nd,
            attr: {
                pp: function () {
                    return 'Res(' + astutil.ppPos(nd) + ')';
                }
            }
        });
}

// vertex representing some other expression
function exprVertex(nd) {
    if (!nd.type)
        throw new Error("invalid expression vertex");
    return nd.attr.expr_vertex
        || (nd.attr.expr_vertex = {
            type: 'ExprVertex',
            node: nd,
            attr: {
                pp: function () {
                    return 'Expr(' + astutil.ppPos(nd) + ')';
                }
            }
        });
}

exports.addIntraproceduralFlowGraphEdges = addIntraproceduralFlowGraphEdges;
exports.funcVertex = funcVertex;
exports.unknownVertex = unknownVertex;
exports.globVertex = globVertex;
exports.nativeVertex = nativeVertex;
exports.getNativeVertices = getNativeVertices;
exports.parmVertex = parmVertex;
exports.argVertex = argVertex;
exports.retVertex = retVertex;
exports.resVertex = resVertex;
exports.vertexFor = vertexFor;
exports.propVertex = propVertex;

