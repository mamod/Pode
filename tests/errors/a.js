var test = require('test');
var assert = test.assert;

setTimeout(function(){
    try {
        throw new TypeError('error');
    } catch (e){
        assert.equal(e.lineNumber,6);
        assert.ok(e instanceof TypeError);
        assert.equal(e.fileName,__filename);
    }
},100);

assert.ok(true);
assert.ok(1);
