# long-task-detector

Library that detects and reports long-running CPU tasks in node.

Comes with minimal (~10% CPU) overhead (asynchook + profiler). Tested for memory leaks.

### example:

Usage:

```js
var {createDetector} = require('../lib/index')

var cancelDetector = createDetector(function(report) {
    console.warn("Task length", report.taskLength)
    console.warn("Top 10 items", report.items)
    console.warn("Cpu and stack of first item", report.items[0].cpu, report.items[0].stackTrace)
    console.warn(report.toString())
    // Or send to your favorite alerting service
}, 50)

// cancelDetector() // to stop
```

### Example output:

```
WARNING: Task took 52ms to run!
CPU: 66.7%
  at f2 (/Users/spion/Documents/long-task-detector/test/index.js:22)
  at f1 (/Users/spion/Documents/long-task-detector/test/index.js:17)
  at ? (/Users/spion/Documents/long-task-detector/test/index.js:12)
  at args.(anonymous function) (/Users/spion/Documents/long-task-detector/node_modules/async-hook/patches/timers.js:50)
  at ontimeout (timers.js:361)
  at tryOnTimeout (timers.js:233)
  at listOnTimeout (timers.js:161)
  at (root) (:0)
CPU: 33.3%
  at f3 (/Users/spion/Documents/long-task-detector/test/index.js:26)
  at f1 (/Users/spion/Documents/long-task-detector/test/index.js:17)
  at ? (/Users/spion/Documents/long-task-detector/test/index.js:12)
  at args.(anonymous function) (/Users/spion/Documents/long-task-detector/node_modules/async-hook/patches/timers.js:50)
  at ontimeout (timers.js:361)
  at tryOnTimeout (timers.js:233)
  at listOnTimeout (timers.js:161)
  at (root) (:0)
```

### API

```typescript

export declare function createDetector(notifyMe: (report: Report) => void, maxDelta: number): () => void;

export interface Report {
    taskLength: number;
    items: ReportItem[];
}
export interface ReportItem {
    cpu: number;
    stackTrace: StackItem[];
}
export interface StackItem {
    name: string;
    line: number;
    url: string;
}
```

### licence

ISC

