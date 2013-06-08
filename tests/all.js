
var test = require('test');

test.run('./order.js');
test.run('./require/a.js');
test.run('./module-cache/a.js');
test.run('./pm-modules/a.js');
//
test.run('./timers.js');
test.run('./errors');

test.done();
