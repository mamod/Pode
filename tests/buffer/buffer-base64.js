var test = require('test');
var assert = test.assert;

// big example
var quote = 'Man is distinguished, not only by his reason, but by this ' +
            'singular passion from other animals, which is a lust ' +
            'of the mind, that by a perseverance of delight in the continued ' +
            'and indefatigable generation of knowledge, exceeds the short ' +
            'vehemence of any carnal pleasure.';
var expected = 'TWFuIGlzIGRpc3Rpbmd1aXNoZWQsIG5vdCBvbmx5IGJ5IGhpcyByZWFzb24s' +
               'IGJ1dCBieSB0aGlzIHNpbmd1bGFyIHBhc3Npb24gZnJvbSBvdGhlciBhbmltY' +
               'WxzLCB3aGljaCBpcyBhIGx1c3Qgb2YgdGhlIG1pbmQsIHRoYXQgYnkgYSBwZX' +
               'JzZXZlcmFuY2Ugb2YgZGVsaWdodCBpbiB0aGUgY29udGludWVkIGFuZCBpbmR' +
               'lZmF0aWdhYmxlIGdlbmVyYXRpb24gb2Yga25vd2xlZGdlLCBleGNlZWRzIHRo' +
               'ZSBzaG9ydCB2ZWhlbWVuY2Ugb2YgYW55IGNhcm5hbCBwbGVhc3VyZS4=';


assert.equal(expected, (new Buffer(quote)).toString('base64'));

b = new Buffer(1024);
var bytesWritten = b.write(expected, 0, 'base64');




assert.equal(quote.length, bytesWritten);
assert.equal(quote, b.toString('ascii', 0, quote.length));

// check that the base64 decoder ignores whitespace
var expectedWhite = expected.slice(0, 60) + ' \n' +
                    expected.slice(60, 120) + ' \n' +
                    expected.slice(120, 180) + ' \n' +
                    expected.slice(180, 240) + ' \n' +
                    expected.slice(240, 300) + '\n' +
                    expected.slice(300, 360) + '\n';
b = new Buffer(1024);
bytesWritten = b.write(expectedWhite, 0, 'base64');
assert.equal(quote.length, bytesWritten);
assert.equal(quote, b.toString('ascii', 0, quote.length));

// check that the base64 decoder on the constructor works
// even in the presence of whitespace.
b = new Buffer(expectedWhite, 'base64');
assert.equal(quote.length, b.length);
assert.equal(quote, b.toString('ascii', 0, quote.length));

// check that the base64 decoder ignores illegal chars
var expectedIllegal = expected.slice(0, 60) + ' \x80' +
                      expected.slice(60, 120) + ' \xff' +
                      expected.slice(120, 180) + ' \xf0' +
                      expected.slice(180, 240) + ' \x98' +
                      expected.slice(240, 300) + '\x03' +
                      expected.slice(300, 360);
b = new Buffer(expectedIllegal, 'base64');
assert.equal(quote.length, b.length);
assert.equal(quote, b.toString('ascii', 0, quote.length));

assert.equal(new Buffer('', 'base64').toString(), '');
assert.equal(new Buffer('K', 'base64').toString(), '');

// multiple-of-4 with padding
assert.equal(new Buffer('Kg==', 'base64').toString(), '*');
assert.equal(new Buffer('Kio=', 'base64').toString(), '**');
assert.equal(new Buffer('Kioq', 'base64').toString(), '***');
assert.equal(new Buffer('KioqKg==', 'base64').toString(), '****');
assert.equal(new Buffer('KioqKio=', 'base64').toString(), '*****');
assert.equal(new Buffer('KioqKioq', 'base64').toString(), '******');
assert.equal(new Buffer('KioqKioqKg==', 'base64').toString(), '*******');
assert.equal(new Buffer('KioqKioqKio=', 'base64').toString(), '********');
assert.equal(new Buffer('KioqKioqKioq', 'base64').toString(), '*********');
assert.equal(new Buffer('KioqKioqKioqKg==', 'base64').toString(),
             '**********');
assert.equal(new Buffer('KioqKioqKioqKio=', 'base64').toString(),
             '***********');
assert.equal(new Buffer('KioqKioqKioqKioq', 'base64').toString(),
             '************');
assert.equal(new Buffer('KioqKioqKioqKioqKg==', 'base64').toString(),
             '*************');
assert.equal(new Buffer('KioqKioqKioqKioqKio=', 'base64').toString(),
             '**************');
assert.equal(new Buffer('KioqKioqKioqKioqKioq', 'base64').toString(),
             '***************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKg==', 'base64').toString(),
             '****************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKio=', 'base64').toString(),
             '*****************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKioq', 'base64').toString(),
             '******************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKioqKg==', 'base64').toString(),
             '*******************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKioqKio=', 'base64').toString(),
             '********************');

// no padding, not a multiple of 4
assert.equal(new Buffer('Kg', 'base64').toString(), '*');
assert.equal(new Buffer('Kio', 'base64').toString(), '**');
assert.equal(new Buffer('KioqKg', 'base64').toString(), '****');
assert.equal(new Buffer('KioqKio', 'base64').toString(), '*****');
assert.equal(new Buffer('KioqKioqKg', 'base64').toString(), '*******');
assert.equal(new Buffer('KioqKioqKio', 'base64').toString(), '********');
assert.equal(new Buffer('KioqKioqKioqKg', 'base64').toString(), '**********');
assert.equal(new Buffer('KioqKioqKioqKio', 'base64').toString(), '***********');
assert.equal(new Buffer('KioqKioqKioqKioqKg', 'base64').toString(),
             '*************');
assert.equal(new Buffer('KioqKioqKioqKioqKio', 'base64').toString(),
             '**************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKg', 'base64').toString(),
             '****************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKio', 'base64').toString(),
             '*****************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKioqKg', 'base64').toString(),
             '*******************');
assert.equal(new Buffer('KioqKioqKioqKioqKioqKioqKio', 'base64').toString(),
             '********************');

// handle padding graciously, multiple-of-4 or not
assert.equal(new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw==',
                        'base64').length, 32);
assert.equal(new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw=',
                        'base64').length, 32);
assert.equal(new Buffer('72INjkR5fchcxk9+VgdGPFJDxUBFR5/rMFsghgxADiw',
                        'base64').length, 32);
assert.equal(new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg==',
                        'base64').length, 31);
assert.equal(new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg=',
                        'base64').length, 31);
assert.equal(new Buffer('w69jACy6BgZmaFvv96HG6MYksWytuZu3T1FvGnulPg',
                        'base64').length, 31);



// This string encodes single '.' character in UTF-16
var dot = new Buffer('//4uAA==', 'base64');

assert.equal(dot.get(0), 0xff);
assert.equal(dot.get(1), 0xfe);
assert.equal(dot.get(2), 0x2e);
assert.equal(dot.get(3), 0x00);
assert.equal(dot.toString('base64'), '//4uAA==');


// Creating buffers larger than pool size.
var l = Buffer.poolSize + 5;
var s = '';
for (i = 0; i < l; i++) {
  s += 'h';
}

var b = new Buffer(s);

for (i = 0; i < l; i++) {
  assert.equal('h'.charCodeAt(0), b.get(i));
}

var sb = b.toString();
assert.equal(sb.length, s.length);
assert.equal(sb, s);


test.plan(56);
