"use strict";
var asyncHook = require("async-hook");
var profiler = require("v8-profiler");
function createDetector(notifyMe, maxDelta) {
    var t = Date.now();
    var lastStart = null;
    var timeout = null;
    var prof = null;
    var n = 0;
    var stuck;
    var working = true;
    function pre() {
        t = Date.now();
    }
    function post() {
        var now = Date.now();
        var delta = now - t;
        if (delta > maxDelta) {
            stuck = profiler.stopProfiling('long-task-detector');
            var warning = {
                toString: stringifyWarning,
                taskLength: delta,
                items: analyse(stuck, t, now)
            };
            notifyMe(warning);
            stuck.delete();
            lastStart = Date.now();
            profiler.startProfiling('long-task-detector');
        }
    }
    asyncHook.addHooks({ pre: pre, post: post });
    asyncHook.enable();
    var currentProfile = null;
    function resetProfiler() {
        if (lastStart) {
            prof = profiler.stopProfiling('long-task-detector');
            prof.delete();
        }
        if (working) {
            profiler.startProfiling('long-task-detector');
            t = lastStart = Date.now();
            timeout = setTimeout(resetProfiler, 5000);
        }
    }
    resetProfiler();
    function analyse(profile, start, end) {
        var nodeDictionary = Object.create(null);
        function traverse(node, parent) {
            nodeDictionary[node.id] = { parent: parent && parent.id, count: 0, node: node };
            for (var k = 0; k < node.children.length; ++k) {
                traverse(node.children[k], node);
            }
        }
        traverse(profile.head);
        var totalCount = 0;
        var profileOffset = profile.timestamps[0];
        for (var k = 0; k < profile.timestamps.length; ++k) {
            var ts = lastStart + ((profile.timestamps[k] - profileOffset) / 1000.0);
            if (start < ts && ts < end) {
                var nodeId = profile.samples[k];
                nodeDictionary[nodeId].count += 1;
                totalCount += 1;
            }
        }
        var keys = Object.keys(nodeDictionary), list = [];
        for (var k = 0; k < keys.length; ++k) {
            var node = nodeDictionary[keys[k]];
            if (node.count > 0)
                list.push(node);
        }
        var top10 = list.sort(function (v1, v2) { return v2.count - v1.count; }).slice(0, 10);
        return top10.map(function (node) {
            var report = { cpu: node.count / totalCount, stackTrace: [] };
            while (node != null) {
                var item = node.node;
                report.stackTrace.push({ name: item.functionName, url: item.url, line: item.lineNumber });
                node = nodeDictionary[node.parent];
            }
            return report;
        });
    }
    return function () {
        asyncHook.disable();
        working = false;
        if (timeout != null)
            clearTimeout(timeout);
        resetProfiler();
    };
}
exports.createDetector = createDetector;
function stringifyWarning() {
    var initial = "WARNING: Task took " + this.taskLength + "ms to run!";
    function stringStack(stackItems) {
        return stackItems.map(function (item) { return "  at " + (item.name || '?') + " (" + item.url + ":" + item.line + ")"; })
            .join("\n");
    }
    var items = this.items.map(function (item) {
        return "CPU: " + (100 * item.cpu).toFixed(1) + "%\n" + stringStack(item.stackTrace);
    });
    return initial + "\n" + items.join("\n");
}
//# sourceMappingURL=index.js.map