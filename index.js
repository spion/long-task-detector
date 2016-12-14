var asyncHook = require('async-hook')
var profiler = require('v8-profiler')



function createDetector(notifyMe, maxDelta) {
  var t = Date.now();
  var lastStart = null;
  var n = 0;
  function init() {

  }
  function pre() {
    t = Date.now()

  }
  function post() {
    var now = Date.now()
    var delta = now - t;
    if (delta > maxDelta) {
      var warning = `WARNING: Task took ${delta}ms`
      var stuck = profiler.stopProfiling()
      warning += '\n' + analyse(stuck, t, now)
      profiler.startProfiling()
      console.warn(warning)
    }
  }
  function destroy() {

  }
  asyncHook.addHooks({init:init, pre:pre, post:post, destroy:destroy})
  asyncHook.enable()
  var currentProfile = null
  function reProfile() {
    if (lastStart) profiler.stopProfiling()
    profiler.deleteAllProfiles()
    lastStart = Date.now()
    profiler.startProfiling()
    setTimeout(reProfile, 2000)
  }
  reProfile()

  function analyse(profile, start, end) {
    var nodeDictionary = Object.create(null)
    function traverse(node, parent) {
      nodeDictionary[node.id] = {parent: parent && parent.id, count: 0, node: node}
      for (var k = 0; k < node.children.length; ++k) {
        traverse(node.children[k], node)
      }
    }
    traverse(profile.head);

    var totalCount = 0;

    var profileOffset = profile.timestamps[0]
    for (var k = 0; k < profile.timestamps.length; ++k) {
      var ts = lastStart + ((profile.timestamps[k] - profileOffset) / 1000.0);
      if (start < ts && ts < end) {
        var nodeId = profile.samples[k]
        nodeDictionary[nodeId].count += 1;
        totalCount += 1;
      }
    }
    var keys = Object.keys(nodeDictionary), list = []
    for (var k = 0; k < keys.length; ++k) {
      var node = nodeDictionary[keys[k]];
      if (node.count > 0) list.push(node)
    }
    var top5 = list.sort((v1, v2) => v2.count - v1.count).slice(0, 5)
    return top5.map(node => {
      var report = `${(100 * node.count / totalCount).toFixed(1)}% CPU`
      while (node != null) {
        var item = node.node
        report += '\n  ' +  `at ${item.functionName || '?'} (${item.url}:${item.lineNumber})`
        node = nodeDictionary[node.parent];
      }
      return report
    }).join("\n")
  }
}



module.exports = createDetector

createDetector(null, 50)

setInterval(function() {
  var rand = Math.random() * 65, t = Date.now()
  f1(rand, t)
}, 700)

function f1(r, t) {
  f2(r, t);
}

function f2(r, t) {
  while (Date.now() - t < r);
}