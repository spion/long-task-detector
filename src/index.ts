import * as asyncHook from 'async-hook'
import * as profiler from 'v8-profiler'

export interface Report {
  taskLength: number,
  items: ReportItem[]
}

export interface ReportItem {
  cpu: number;
  stackTrace: StackItem[]
}

export interface StackItem {
  name: string;
  line: number;
  url: string;
}

export function createDetector(notifyMe: (report:Report) => void, maxDelta: number) {
  var t = Date.now();
  var lastStart:number = null;
  var prof = null;
  var n = 0;
  var stuck;

  var working = true;

  function pre() {
    t = Date.now()
  }
  function post() {
    var now = Date.now()
    var delta = now - t;
    if (delta > maxDelta) {

      stuck = profiler.stopProfiling('long-task-detector')
      var warning = {
        toString: stringifyWarning,
        taskLength: delta,
        items: analyse(stuck, t, now)
      }
      notifyMe(warning)
      stuck.delete()
      lastStart = Date.now()
      profiler.startProfiling('long-task-detector')

    }
  }

  asyncHook.addHooks({pre:pre, post:post})
  asyncHook.enable()
  var currentProfile = null
  function reProfile() {
    if (lastStart) {
      prof = profiler.stopProfiling('long-task-detector')
      prof.delete()
    }
    lastStart = Date.now()
    profiler.startProfiling('long-task-detector')
    if (working) setTimeout(reProfile, 3000)
  }
  reProfile()

  function analyse(profile: any, start: number, end:number): ReportItem[] {
    var nodeDictionary = Object.create(null)
    function traverse(node:any, parent?:any) {
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
    var top10 = list.sort((v1, v2) => v2.count - v1.count).slice(0, 10)
    return top10.map(node => {
      var report = {cpu: node.count / totalCount, stackTrace: [] as StackItem[]}
      while (node != null) {
        var item = node.node
        report.stackTrace.push({name: item.functionName, url: item.url, line: item.lineNumber})
        node = nodeDictionary[node.parent];
      }
      return report
    })
  }

  return function() {
    asyncHook.disable()
    working = false;
  }
}

function stringifyWarning() {
  console.log(this)
  var initial = "WARNING: Task took " + this.taskLength + "ms to run!"
  function stringStack(stackItems: StackItem[]) {
    return stackItems.map(item => `  at ${item.name || '?'} (${item.url}:${item.line})`)
      .join("\n")
  }
  var items = this.items.map((item:ReportItem) =>
    `CPU: ${(100 * item.cpu).toFixed(1)}%\n` + stringStack(item.stackTrace))
  return initial + "\n" + items.join("\n")
}
