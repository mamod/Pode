var assert = require('assert');
var test = assert = require('test').assert;
setTimeout(function(){
    try {
        throw new TypeError('error');
    } catch (e){
        test.equal(e.lineNumber,5);
        assert.ok(e instanceof TypeError);
        test.equal(e.fileName,__filename);
    }
},100);

test.ok(true);
test.ok(1);
