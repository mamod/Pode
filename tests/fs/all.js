var test = require('test');

require('./test-fs-exists.js');
require('./test-fs-stat.js');
require('./read-buffer.js');
require('./test-write.js');
require('./test-fs-open.js');
require('./test-fs-read-file-sync.js');

//sice we manipulate fs.stat
//make sure to run it last
process.nextTick(function(){
    require('./test-fs-readfile-zero-byte-liar.js');
});


test.done();
