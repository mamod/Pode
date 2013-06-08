var t2 = require('./Test/Test.pm');
var t = require('./Test.pm');

var assert = require('test').assert;

setTimeout(function(){
   //throw new Error(false);

},10);

var num = t.test(9);
var num2 = t2.test(9);

log(num);
log(num2);

assert.equal(num,10);
assert.equal(num2,8);
