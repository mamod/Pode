var assert = require('test').assert;


var i = 0;



setTimeout(function(){
    i++;
    assert.equal(i,2);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,3);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,1);
},10);

setTimeout(function(){
    i++;
    assert.equal(i,4);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,5);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,6);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,7);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,8);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,9);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,10);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,11);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,12);
},100);

setTimeout(function(){
    i++;
    assert.equal(i,13);
    
    setTimeout(function(){
        i++;
        assert.equal(i,14);
    },100);
    
},100);

process.on('exit',function(){
   // throw('f');
    assert.equal(i,14);
});

