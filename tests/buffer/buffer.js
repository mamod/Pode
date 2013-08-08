var test = require('test');
var assert = test.assert;

var writeTest = new Buffer('abcdes');
writeTest.write('p', 'ascii');
writeTest.write('o', 'ascii', '1');
writeTest.write('d', '2', 'ascii');
writeTest.write('e', 3, 'ascii');
writeTest.write('j', 'ascii', 4);
assert.equal(writeTest.toString(), 'podejs');


// Bug regression test
var testValue = '\u00F6\u65E5\u672C\u8A9E'; // ö日本語
var buffer = new Buffer(32);
var size = buffer.write(testValue, 0, 'utf8');
//console.log('bytes written to buffer: ' + size);
var slice = buffer.toString('utf8', 0, size);
assert.equal(slice, testValue);


var e = new Buffer('über');
var e2 = new Buffer([195, 188, 98, 101, 114]);
assert.deepEqual(e, e2);
assert.strictEqual(e.toString(),e2.toString());

// Test triple  slice
var a = new Buffer(8);
for (var i = 0; i < 8; i++) a.set(i,i);

var b = a.slice(4, 8);
assert.equal(4, b.get(0));
assert.equal(5, b.get(1));
assert.equal(6, b.get(2));
assert.equal(7, b.get(3));
var c = b.slice(2, 4);
assert.equal(6, c.get(0));
assert.equal(7, c.get(1));

//copy example test
var buf1 = new Buffer(26);
var buf2 = new Buffer(26);

for (var i = 0 ; i < 26 ; i++) {
  buf1.set(i,i + 97); // 97 is ASCII a
  buf2.set(i, 33); // ASCII !
}

buf1.copy(buf2, 8, 16, 20);
assert.equal(buf2.toString('ascii', 0, 25),'!!!!!!!!qrst!!!!!!!!!!!!!');



var d = new Buffer([23, 42, 255]);
assert.equal(d.length, 3);
assert.equal(d.get(0), 23);
assert.equal(d.get(1), 42);
assert.equal(d.get(2), 255);
assert.deepEqual(d, new Buffer(d));

//arrayish
var arrayIsh = {0: 0, 1: 1, 2: 2, 3: 3, length: 4};
var g = new Buffer(arrayIsh);
assert.deepEqual(g, new Buffer([0, 1, 2, 3]));
var strArrayIsh = {0: '0', 1: '1', 2: '2', 3: '3', length: 4};
g = new Buffer(strArrayIsh);
assert.deepEqual(g, new Buffer([0, 1, 2, 3]));


// Single argument slice
b = new Buffer('abcde');
assert.equal('bcde', b.slice(1).toString());

// slice(0,0).length === 0
assert.equal(0, Buffer('hello').slice(0, 0).length);


//This should not segfault the program.
//assert.throws(function() {
//  new Buffer('"pong"', 0, 6, 8031, '127.0.0.1');
//});


//fixme
var buf = new Buffer('\0');
assert.equal(buf.length, 1);
buf = new Buffer('\0\0');
assert.equal(buf.length, 2);
//unlike node buffer, buffers here if character has 3 bytes 2 will be added
buf = new Buffer(2);
var written = buf.write(''); // 0byte
assert.equal(written, 0);
written = buf.write('\0'); // 1byte (v8 adds null terminator)
assert.equal(written, 1);
written = buf.write('a\0'); // 1byte * 2
assert.equal(written, 2);
written = buf.write('あ'); // 3bytes
assert.equal(written, 2);
written = buf.write('\0あ'); // 1byte + 3bytes
assert.equal(written, 2);
written = buf.write('\0\0あ'); // 1byte * 2 + 3bytes
assert.equal(written, 2);


buf = new Buffer(10);
written = buf.write('あいう'); // 3bytes * 3 (v8 adds null terminator)
assert.equal(written, 9);
written = buf.write('あいう\0'); // 3bytes * 3 + 1byte
assert.equal(written, 10);


// #243 Test write() with maxLength
var buf = new Buffer(4);
buf.fill(0xFF);
var written = buf.write('abcd', 1, 2, 'utf8');
console.log(buf);
assert.equal(written, 2);
assert.equal(buf.get(0), 0xFF);
assert.equal(buf.get(1), 0x61);
assert.equal(buf.get(2), 0x62);
assert.equal(buf.get(3), 0xFF);

buf.fill(0xFF);
written = buf.write('abcd', 'utf8', 1, 2);  // legacy style
console.log(buf);
assert.equal(written, 2);
assert.equal(buf.get(0), 0xFF);
assert.equal(buf.get(1), 0x61);
assert.equal(buf.get(2), 0x62);
assert.equal(buf.get(3), 0xFF);


buf.fill(0xFF);
written = buf.write('abcdef', 1, 2, 'hex');
console.log(buf);
assert.equal(written, 2);
assert.equal(buf.get(0), 0xFF);
assert.equal(buf.get(1), 0xAB);
assert.equal(buf.get(2), 0xCD);
assert.equal(buf.get(3), 0xFF);



//20
var buf = new Buffer(4);
['ucs2', 'ucs-2', 'utf16le', 'utf-16le'].forEach(function(encoding) {
  buf.fill(0xFF);
  written = buf.write('abcd', 0, 2, encoding);
  console.log(buf);
  assert.equal(written, 2);
  assert.equal(buf.get(0), 0x61);
  assert.equal(buf.get(1), 0x00);
  assert.equal(buf.get(2), 0xFF);
  assert.equal(buf.get(3), 0xFF);
});


// test for buffer overrun
buf = new Buffer([0, 0, 0, 0, 0]); // length: 5
var sub = buf.slice(0, 4);         // length: 4
written = sub.write('12345', 'binary');
assert.equal(written, 4);
assert.equal(buf.get(4), 0);


// Check for fractional length args, junk length args, etc.
// https://github.com/joyent/node/issues/1758
Buffer(3.3).toString(); // throws bad argument error in commit 43cb4ec
assert.equal(Buffer(-1).length, 0);
assert.equal(Buffer(NaN).length, 0);
assert.equal(Buffer(3.3).length, 4);
assert.equal(Buffer({length: 3.3}).length, 4);
assert.equal(Buffer({length: 'BAM'}).length, 0);


// Make sure that strings are not coerced to numbers.
assert.equal(Buffer('99').length, 2);
assert.equal(Buffer('13.37').length, 5);

// Ensure that the length argument is respected.
'ascii utf8 hex base64 binary'.split(' ').forEach(function(enc) {
  assert.equal(Buffer(1).write('aaaaaa', 0, 1, enc), 1);
});

// Regression test, guard against buffer overrun in the base64 decoder.
var a = Buffer(3);
var b = Buffer('xxx');
a.write('aaaaaaaa', 'base64');
assert.equal(b.toString(), 'xxx');


// issue GH-3416
Buffer(Buffer(0), 0, 0);

[ 'hex',
  'utf8',
  'utf-8',
  'ascii',
  'binary',
  'base64',
  'ucs2',
  'ucs-2',
  'utf16le',
  'utf-16le' ].forEach(function(enc) {
    assert.equal(Buffer.isEncoding(enc), true);
  });

[ 'utf9',
  'utf-7',
  'Unicode-FTW',
  'new gnu gun'  ].forEach(function(enc) {
    assert.equal(Buffer.isEncoding(enc), false);
  });


// GH-3905
//assert.equal(JSON.stringify(Buffer('test')), '[116,101,115,116]');

(function() {
  var buf = new Buffer('0123456789');
  assert.equal(buf.slice(-10, 10), '0123456789');
  assert.equal(buf.slice(-20, 10), '0123456789');
  assert.equal(buf.slice(-20, -10), '');
  assert.equal(buf.slice(0, -1), '012345678');
  assert.equal(buf.slice(2, -2), '234567');
  assert.equal(buf.slice(0, 65536), '0123456789');
  assert.equal(buf.slice(65536, 0), '');
  for (var i = 0, s = buf.toString(); i < buf.length; ++i) {
    assert.equal(buf.slice(-i), s.slice(-i));
    assert.equal(buf.slice(0, -i), s.slice(0, -i));
  }
})();


test.plan(121);


