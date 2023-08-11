var graph = require('./graph'),
    dftc = require('./dftc.js'),
    flowgraph = require('./flowgraph');

// extract a call graph from a flow graph by collecting all function vertices that are inversely reachable from a callee vertex
function extractCG(ast, flow_graph) {
    var edges = new graph.Graph()
    escaping = [], unknown = [];

    var reach = dftc.reachability(flow_graph);

    /* fn is a flow graph node of type 'FuncVertex' */
    function processFuncVertex(fn) {
        // if (fn.func.id.name == 'save') {
        //     console.log(fn);
        // }
        // if(fn.attr)
        var r = reach.getReachable(fn)
        let addEdgeFlag = true
        let fnPaths = []
        if (fn.type != 'NativeVertex') {
            fnPaths = fn.func.attr.path.split(' ')
        }
        for (let i = 0; i < r.length; i++) {
            if (r[i].type === 'UnknownVertex')
                escaping[escaping.length] = fn;
            else if (r[i].type === 'CalleeVertex') {
                addEdgeFlag = true
                if (fn.type === 'NativeVertex' && !r[i].visited) {
                    edges.addEdge(r[i], fn);
                } else {
                    let paths = r[i].call.attr.path.split(' ')
                    // 如果路径里有callee中的name，说明在当前文件中有声明该函数，不需要再去进行原生函数的匹配
                    if (r[i].paramIndex != undefined) {
                        for (let j = 1; j < paths.length - 1; j++) {
                            if (fnPaths.indexOf(paths[j]) == -1) {
                                addEdgeFlag = false
                                break
                            }
                        }
                        if (addEdgeFlag && fn.func.id.name.indexOf('anonymous') != -1) {
                            let funIndex = /argumentKey(\d+)/g.exec(fn.func.id.name)[1]
                            //    console.log(funIndex);
                            if (r[i].paramIndex == funIndex) {
                                edges.addEdge(r[i], fn);
                            }
                        }
                    } else {
                        let calleeName = paths[paths.length - 1]
                        if (fnPaths.indexOf(calleeName) == -1) {
                            addEdgeFlag = false
                            continue
                        }else if(paths.length===1){
                            addEdgeFlag = true
                        } 
                        else {
                            let j = paths.length - 2;
                            for (; j >= 0; j--) {
                                if (fnPaths.indexOf(paths[j]) != -1) {
                                    break
                                }
                            }
                            if(j==-1){
                                addEdgeFlag = false
                            }
                        }

                        if (addEdgeFlag && !r[i].visited) {
                            edges.addEdge(r[i], fn);
                            r[i].visited = true
                            break
                        }
                    }

                    // }
                    // if (addEdgeFlag) {

                    // 匹配成功后进行裁边操作，减少后续节点的访问时间
                    // for (let node of flow_graph.graph._pred[r[i].attr.pp()]) {
                    //     flow_graph.graph._succ[node].remove(r[i].attr.pp())
                    //     flow_graph.graph._pred[r[i].attr.pp()].remove(node)
                    // }


                    // }
                }

            }
        }
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

