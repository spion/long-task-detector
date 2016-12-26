var {createDetector} = require('../lib/index')

var cancelDetector = createDetector(function(report) {
    console.warn(report.toString())
}, 50)

// cancelDetector() // to stop

setInterval(function() {
  var rand = Math.random() * 60, t = Date.now()
  f1(rand, t)
}, 350)

function f1(r, t) {
  f3(r/2, t)
  f2(r, t)
}

function f2(r, t) {
  while (Date.now() - t < r);
}

function f3(r, t) {
  while (Date.now() - t < r);
}