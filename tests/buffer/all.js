var test = require('test');

require('./buffer.js');
require('./test-buffer-concat.js');
require('./test-buffer-ascii.js');
require('./buffer-base64.js');
require('./buffer-hex.js');
require('./buffer-binary.js');

//common-js binary
require('./binary/bytearray-encodings-tests.js');
require('./binary/bytearray-tests.js');
require('./binary/bytestring-encodings-tests.js');
require('./binary/bytestring-tests.js');

test.done();
