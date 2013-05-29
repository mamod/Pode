var assert = require('assert');

global.__arr = [];

for (var i = 0;i<10;i++){
    var ex = require('./b.js');
}

process.on('exit',function(){
    assert.equal(global.__arr.length,1);
});