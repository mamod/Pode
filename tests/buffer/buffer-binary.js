var test = require('test'),
assert = test.assert;

// Binary encoding should write only one byte per character.
var b = Buffer([0xde, 0xad, 0xbe, 0xef]);
var s = String.fromCharCode(0xffff);
b.write(s, 0, 'binary');
console.log(b);

assert.equal(0xff, b.get(0));
assert.equal(0xad, b.get(1));
assert.equal(0xbe, b.get(2));
assert.equal(0xef, b.get(3));
s = String.fromCharCode(0xaaee);
b.write(s, 0, 'binary');
assert.equal(0xee, b.get(0));
assert.equal(0xad, b.get(1));
assert.equal(0xbe, b.get(2));
assert.equal(0xef, b.get(3));

test.plan(8);
