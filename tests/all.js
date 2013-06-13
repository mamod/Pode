var test = require('test');


//test perl modules call
require('./require/a.js');
require('./module-cache/a.js');
require('./pm-modules/a.js');

//timers
require('./timers.js');
require('./test-timers-linked-list.js');
require('./test-timers-ordering.js');
require('./test-timers.js');
require('./order.js');

//errors
require('./errors');

//events
require('./events/Loop.js');

test.done();
