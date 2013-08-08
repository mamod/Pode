var test = require('test');

process.setMaxListeners(1000);
//test perl modules call
require('./require/a.js');
require('./module-cache/a.js');
require('./pm-modules/a.js');

//timers
require('./timers/all.js');

//errors
require('./errors');

//events
//require('./events/all.js');

//ipc
//require('./ipc/all.js');

//moved to a seperate thread
//buffer
//require('./buffer/all.js');
//file system
//require('./fs/all.js');


test.plan(190);
test.done();
