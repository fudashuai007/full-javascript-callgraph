var graph = require('./graph'),
    dftc = require('./dftc.js'),
    flowgraph = require('./flowgraph');
tool = require('../utils/tool')
function get_fake_root(path) {

    return {
        fake: true,
        type: 'FuncVertex',
        func:
        {
            type: 'FunctionDeclaration',
            id:
            {
                type: 'Fake',
                name: '<entry>'
            },
            attr:
            {
                enclosingFile: path
            },
            loc:
            {
                start:
                {
                    line: 1,
                    column: 0
                },
                end:
                {
                    line: 1,
                    column: 0
                }
            },
            range: [1, 1]
        },
        attr:
        {
            pp: Function,
            node_id: 0
        }
    }
}
// extract a call graph from a flow graph by collecting all function vertices that are inversely reachable from a callee vertex
function extractCG(ast, flow_graph) {

    var edges = new graph.Graph()
    escaping = [], unknown = [];

    var reach = dftc.reachability(flow_graph);

    /* fn is a flow graph node of type 'FuncVertex' */
    function processFuncVertex(fn) {
        var r = reach.getReachable(fn)
        let addEdgeFlag = true, pathPatch = false, nativeCalled = false
        let fnPaths = [], fnIndex, propData, fnProp



        // 非原生函数匹配
        if (fn.type != 'NativeVertex') {
            fnPaths = fn.func.attr.path.split(' ')
            fnIndex = fn.func.attr?.funParamsIndex

            propData = r.find(item => item.type === 'PropertyVertex' && tool.nativeCalls().indexOf(item.name) != -1)
            // 如果函数是有property属性，并且通过property和callee建立起关系的
            if (propData) {
                nativeCalled = true
                const n = r.find(item => item.type === 'NativeArgumentVertex')
                if (n && n.mes) {
                    fnProp = n.mes
                }
            }

            for (let i = 0; i < r.length; i++) {
                if (r[i].type === 'UnknownVertex')
                    escaping[escaping.length] = fn;
                else if (r[i].type === 'CalleeVertex') {
                        let callPath = r[i].call.attr.path.split(' ')
                        addEdgeFlag = true

                        /**
                         * 
                         * 如果函数调用中有paramIndex，
                         * 如果有，表示改函数调用结果来自于参数，进一步查看函数中是否有这个函数声明的索引
                         *      如果没有，则说明这俩匹配不上，直接跳过
                         *      如果有，则需要进一步查看函数声明中的索引和函数调用中的paramIndex是否匹配
                         *          如果相等，则说明改函数与函数调用匹配
                         *          如果不相等，则说明该函数与函数调用不匹配
                         * 
                         * 如果没有，则表示改函数调用并不是来自于函数传参，判断函数中是否有函数声明的索引
                         *  如果有，则不匹配
                         *  如果没有，匹配
                         *  */

                        if (r[i].paramIndex != undefined) {
                            if (fnIndex == undefined) {
                                continue
                            } else {
                                if (fnIndex == r[i].paramIndex) {
                                    if (r[i].call.attr.enclosingFunction === undefined) {
                                        if (r[i].call.type === 'CallExpression')
                                            edges.addEdge(get_fake_root(r[i].call.attr.enclosingFile), fn);
                                        // edges.addEdge(fake_root, fn);
                                    } else {
                                        edges.addEdge(r[i].call.attr.enclosingFunction.attr.func_vertex, fn);
                                        r[i].visited = true
                                    }
                                } else {
                                    continue
                                }
                            }
                        } else {
                            if (fnIndex != undefined) {
                                if (r[i].call.attr.enclosingFunction === undefined) {
                                    if (r[i].call.type === 'CallExpression')
                                        edges.addEdge(get_fake_root(r[i].call.attr.enclosingFile), fn);
                                    // edges.addEdge(fake_root, fn);
                                } else {
                                    if (tool.nativeCalls().indexOf(callPath[callPath.length - 1]) != -1 && fnProp && fnProp === r[i].mes) {
                                        edges.addEdge(nativeCalleeVertex(r[i].call.attr.enclosingFunction.attr.func_vertex), fn);
                                    }
                                }
                                continue
                            } else {
                                // 优先去做路径匹配，路径匹配失效，再去直接匹配字符

                                // let j = callPath.length - 1
                                // for (; j >= 0; j--) {
                                //     if (fnPaths.indexOf(callPath[j]) == -1) break
                                // }
                                // if(j==-1){
                                //     edges.addEdge(r[i], fn);
                                //     r[i].visited = true
                                //     fn.visited = true
                                // }
                                // if(!fn.visited){
                                if (nativeCalled) {
                                    // 
                                    // console.log(fnProp);
                                    // console.log(r[i].mes);
                                    // console.log(fnProp == r[i].mes);
                                    // console.log(fnProp === r[i].mes);
                                    if (r[i].mes && fnProp === r[i].mes) {
                                        if (r[i].call.attr.enclosingFunction === undefined) {
                                            if (r[i].call.type === 'CallExpression')
                                                edges.addEdge(get_fake_root(r[i].call.attr.enclosingFile), fn);
                                            // edges.addEdge(fake_root, fn);
                                        } else {
                                            edges.addEdge(nativeCalleeVertex(r[i].call.attr.enclosingFunction.attr.func_vertex), fn);
                                            continue
                                        }
                                    }

                                } else {
                                    if (r[i].call.attr.enclosingFunction === undefined) {
                                        if (r[i].call.type === 'CallExpression')
                                            edges.addEdge(get_fake_root(r[i].call.attr.enclosingFile), fn);
                                        // edges.addEdge(fake_root, fn);
                                    } else {
                                        edges.addEdge(r[i].call.attr.enclosingFunction.attr.func_vertex, fn);
                                        r[i].visited = true
                                    }
                                }

                                // }

                            }
                        }
    

                }
            }
        }
        // 原生函数匹配 
        else {
            for (let i = 0; i < r.length; i++) {
                if (r[i].type === 'UnknownVertex')
                    escaping[escaping.length] = fn;
                else if (r[i].type === 'CalleeVertex' && !r[i].visited) {
                    // let callPath = r[i].call.attr.path.split(' ')
                    // if (r[i].paramIndex != undefined) {
                        // if (tool.nativeCalls().indexOf(callPath[callPath.length - 1]) != -1) {
                        //     edges.addEdge(nativeCalleeVertex(r[i].call.attr.enclosingFunction.attr.func_vertex), fn);
                        //     r[i].visited = true
                        // }
                    //     continue
                    // } else {
                        edges.addEdge(r[i], fn);
                    // }
                }
            }
        }


    }


    // 原生函数内部执行的函数调用
    function nativeCalleeVertex(nd) {

        let resultVertex = {
            type: 'NativeCalleeVertex',
            call: nd,
            attr: {
                pp: function () {
                    return `Callee(nativeCall)<${nd.func.loc.start.line+','+nd.func.loc.start.column}>`;
                }
            },
            loc:nd.func.loc,
            visited: false
        };

        return resultVertex
    }

    flow_graph.iterNodes(function (nd) {
        if (nd.type === 'FuncVertex') {
            // 处理调用链的访问，如果该函数有在调用链的路径上被声明，
            // 则从调用链上直接取值，并且跳过对原生的函数节点处理
            processFuncVertex(nd);
        }
    });

    // if (addNativeEdgeFlag) {
    flowgraph.getNativeVertices().forEach(processFuncVertex);
    // }


    var unknown_r = reach.getReachable(flowgraph.unknownVertex());
    unknown_r.forEach(function (nd) {
        if (nd.type === 'CalleeVertex')
            unknown[unknown.length] = nd;
    });

    return {
        edges: edges,
        escaping: escaping,
        unknown: unknown,
        fg: flow_graph
    };
}

exports.extractCG = extractCG;

