
const { nd2str } = require('./graph');

function nodePred(nd) {
  return nd.type !== 'UnknownVertex';
}
function reachability(graph) {
  let enum_nodes = new Array();

  let nodes = graph.getNodes();

  let n = nodes.length;

  const str2rid = {};

  for (let i = 0; i < n; i++) {
    enum_nodes[i] = nodes[i];
    str2rid[nd2str(nodes[i])] = i;
  }

  let visited = new Array(n).fill(0),
    visited2 = new Array(n).fill(0),
    popped = new Array(n).fill(0),
    globol = new Set(),
    m = [], // 用于表示从节点 i 可以直接到达的节点的集合
  
    t = [];   /**
    * 表示从节点 i 可以通过多次边到达的节点的集合。
    * 每个 t[i] 是一个集合（使用 Set 数据结构），其中存储了从节点 i 出发经过多次边的可达节点的索引
    */

  for (let i = 0; i < n; i++) {
    m.push(new Set());
    t.push(new Set());
  }
  // 第一次深度优先搜索
  function visit1(i) {
    visited[i] = 1;  // 标记起始节点 srcId 为已访问

    if (!nodePred || nodePred(enum_nodes[i])) { // 过滤掉未知节点
      let succ = graph.succ(enum_nodes[i])
      // 对于每个后继节点 succ[j]，检查其在 str2rid 对象中的索引（index），以确定其在 m 和 t 集合中的位置
      for (let j = 0; j < succ.length; j++) {
        let index = str2rid[nd2str(succ[j])];
        if (nodePred && !nodePred(succ[j]))
          continue;
        if (m[i].has(index) || t[i].has(index))
          continue;

        if (visited[index] == 0)
          visit1(index);
        //如果后继节点 succ[j] 在第二次深度优先搜索之前已被弹出 (popped[index] == 1)，则更新 m[i] 和 t[i] 集合
        if (popped[index] == 1) {
          /** m[i] 更新为 m[i] 和 m[index] 的并集 */
          m[i] = new Set(m[i])
          for (let elem of m[index].values()) {
            m[i].add(elem);
          }
          m[i].add(index);
          // 将 t[i] 更新为 t[i] 和 t[index] 的并集
          t[i] = new Set(t[i])
          for (let elem of t[index].values())
            t[i].add(elem);
           // 将 m[i] 中的元素从 t[i] 中删除
          for (let elem of m[i].values())
            t[i].delete(elem);
        } else {
          //将后继节点 succ[j] 添加到 t[i] 集合中
          t[i] = new Set(t[i].add(index));
        }
      }
    }

    if (t[i].has(i)) {
      if (t[i].size === 1) {
        m[i].add(i);
        t[i] = new Set();
        globol = new Set(m[i]);
        visit2(i);
      } else {
        t[i].delete(i);
        m[i].add(i);
      }
    }

    popped[i] = 1;
  }
  /*
  第二次深度优先搜索
  它用于处理节点 i，并将全局可达节点集合 globol 复制到节点 i 的 m 集合中
  */
  function visit2(i) {
    visited2[i] = 1; // 将节点 i 标记为已访问

    if (!nodePred || nodePred(enum_nodes[i])) { // 在存储结构中
      let succ = graph.succ(enum_nodes[i])

      for (let j = 0; j < succ.length; j++) {
        // 对于每个后继节点 succ[j]，检查其在 str2rid 对象中的索引（index）
        let index = str2rid[nd2str(succ[j])];
        // 果提供了节点预测函数并且后继节点 succ[j] 不满足预测函数
        if (nodePred && !nodePred(succ[j]))
          return;
        // 如果后继节点 succ[j] 尚未被访问 (visited2[index] == 0),并且后继节点 t[index]集合的大小不为零
        if (visited2[index] == 0 && t[index].size !== 0)
          visit2(index);
      }
    }
    // 将全局可达节点集合 globol 复制到节点 i 的 m 集合中
    m[i] = new Set(globol);
    //  清空节点 i 的 t 集合
    t[i] = new Set();
  }
  return {
    getReachable: function (src) {
      const nodeStr = nd2str(src);
      if (!(nodeStr in str2rid)) {
        // 检查 nodeStr 是否在 str2rid 对象中存在。如果不存在，表示起始节点是新节点，需要进行初始化操作
        enum_nodes.push(src);
        visited.push(0);
        visited2.push(0);
        popped.push(0);
        m.push(new Set());
        t.push(new Set());
        str2rid[nodeStr] = enum_nodes.length - 1;
      }
      const src_id = str2rid[nodeStr]; //更新起始节点的索引 srcId 为新节点的索引值

      if (visited[src_id] == 0) // 检查起始节点是否已经被访问过
        visit1(src_id);

      var tc = new Set(m[src_id]);
      for (let elem of t[src_id].values())
        tc.add(elem);

      let ret = new Array();
      for (let elem of tc.values()) {
        ret.push(enum_nodes[elem]);
      }

      return ret;
    },
    iterReachable: function (src, cb) {
      const nodeStr = nd2str(src);
      if (!(nodeStr in str2rid)) {
        enum_nodes.push(src);
        visited.push(0);
        visited2.push(0);
        popped.push(0);
        m.push(new Set());
        t.push(new Set());
        str2rid[nodeStr] = enum_nodes.length - 1;
      }
      const src_id = str2rid[nodeStr];

      if (visited[src_id] == 0)
        visit1(src_id);

      var tc = new Set(m[src_id]);
      for (let elem of t[src_id].values())
        tc.add(elem);

      for (let elem of tc.values())
        cb(enum_nodes[elem]);
    },
    reaches: function (src, dest) {
      const src_id = str2rid[nd2str(src)];
      const dest_id = str2rid[nd2str(dest)];

      if (visited[src_id] == 0)
        visit1(src_id);

      var tc = new Set(m[src_id]);
      for (let elem of t[src_id].values())
        tc.add(elem);

      return tc.has(dest_id);
    }
  };
};
module.exports.reachability = reachability
