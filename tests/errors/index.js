var assert = require('test').assert;

try {
    tt();
} catch (e){
    assert.equal(e.lineNumber,4);
    assert.equal(e.name,'ReferenceError');
}

setEvent(function(){
    try {
        throw new Error('error');
    } catch (e){
        assert.equal(e.lineNumber,12);
        assert(e instanceof Error);
        assert.equal(e.fileName,__filename);
    }
    
    clearEvent(this);
});

setTimeout(function(){
    require('./a.js');
},100);
