
var test = require('test');

test.run('./order.js');
test.run('./require/a.js');
test.run('./module-cache/a.js');
test.run('./pm-modules/a.js');
//
test.run('./timers.js');
test.run('./errors');

test.done();

//require('./order.js');
//require('./require/a.js');
//require('./module-cache/a.js');
//require('./pm-modules/a.js');
//
//require('./timers.js');
//require('./errors');
