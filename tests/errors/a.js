var assert = require('test').assert;

setTimeout(function(){
    try {
        throw new TypeError('error');
    } catch (e){
        assert.equal(e.lineNumber,5);
        assert.ok(e instanceof TypeError);
        assert.equal(e.fileName,__filename);
    }
},100);

assert.ok(true);
assert.ok(0);
