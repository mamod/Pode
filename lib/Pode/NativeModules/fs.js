var util = require('util');
var pathModule = require('path');

var binding = process.binding('fs');
<<<<<<< HEAD
var constants = binding.constants();
=======
var constants = binding.constants;
>>>>>>> readme
var fs = exports;

var O_APPEND = constants.O_APPEND || 0;
var O_CREAT = constants.O_CREAT || 0;
var O_DIRECTORY = constants.O_DIRECTORY || 0;
var O_EXCL = constants.O_EXCL || 0;
var O_NOCTTY = constants.O_NOCTTY || 0;
var O_NOFOLLOW = constants.O_NOFOLLOW || 0;
var O_RDONLY = constants.O_RDONLY || 0;
var O_RDWR = constants.O_RDWR || 0;
var O_SYMLINK = constants.O_SYMLINK || 0;
var O_SYNC = constants.O_SYNC || 0;
var O_TRUNC = constants.O_TRUNC || 0;
var O_WRONLY = constants.O_WRONLY || 0;

var isWindows = process.platform === 'win32';

var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);


function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

// Ensure that callbacks run in the global context. Only use this function
// for callbacks that are passed to the binding layer, callbacks that are
// invoked from JS already run in the proper scope.
function makeCallback(cb) {
  if (typeof cb !== 'function') {
    return rethrow();
  }

  return function() {
    return cb.apply(null, arguments);
  };
}

function assertEncoding(encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

function nullCheck(path, callback) {
  if (('' + path).indexOf('\u0000') !== -1) {
    var er = new Error('Path must be a string without null bytes.');
    if (!callback)
      throw er;
    process.nextTick(function() {
      callback(er);
    });
    return false;
  }
  return true;
}

<<<<<<< HEAD



=======
>>>>>>> readme
fs.Stats = function (obj){
    this.dev= obj[0];
    this.ino= obj[1];
    this.mode = obj[2];
    this.nlink= obj[3];
    this.uid= obj[4];
    this.gid= obj[5];
    this.rdev= obj[6];
    this.size= obj[7];
    this.blksize= obj[11];
    this.blocks= obj[12];
    this.atime= new Date(obj[8]);
    this.mtime= new Date(obj[9]);
    this.ctime= new Date(obj[10]);
    return this;
};

fs.Stats.prototype._checkModeProperty = function(property) {
  return ((this.mode & constants.S_IFMT) === property);
};

fs.Stats.prototype.isDirectory = function() {
  return this._checkModeProperty(constants.S_IFDIR);
};

fs.Stats.prototype.isFile = function() {
  return this._checkModeProperty(constants.S_IFREG);
};

fs.Stats.prototype.isBlockDevice = function() {
  return this._checkModeProperty(constants.S_IFBLK);
};

fs.Stats.prototype.isCharacterDevice = function() {
  return this._checkModeProperty(constants.S_IFCHR);
};

fs.Stats.prototype.isSymbolicLink = function() {
    return this._checkModeProperty(constants.S_IFLNK);
};

fs.Stats.prototype.isFIFO = function() {
    return this._checkModeProperty(constants.S_IFIFO);
};

fs.Stats.prototype.isSocket = function() {
    return this._checkModeProperty(constants.S_IFSOCK);
};

fs.exists = function(path, callback) {
    if (!nullCheck(path, cb)) return;
    binding.stat(pathModule._makeLong(path), cb);
    function cb(err, stats) {
        if (callback) callback(err ? false : true);
    }
};

fs.existsSync = function(path) {
    try {
        nullCheck(path);
        binding.stat(pathModule._makeLong(path));
        return true;
    } catch (e) {
        return false;
    }
};

fs.readFile = function(path, options, callback_) {
  var callback = maybeCallback(arguments[arguments.length - 1]);

  if (typeof options === 'function' || !options) {
    options = { encoding: null, flag: 'r' };
  } else if (typeof options === 'string') {
    options = { encoding: options, flag: 'r' };
  } else if (!options) {
    options = { encoding: null, flag: 'r' };
  } else if (typeof options !== 'object') {
    throw new TypeError('Bad arguments');
  }

  var encoding = options.encoding;
  assertEncoding(encoding);

  // first, stat the file, so we know the size.
  var size;
  var buffer; // single buffer with file data
  var buffers; // list for when size is unknown
  var pos = 0;
  var fd;

  var flag = options.flag || 'r';
  fs.open(path, flag, 438 /*=0666*/, function(er, fd_) {
    if (er) return callback(er);
    fd = fd_;

    fs.fstat(fd, function(er, st) {
      if (er) return callback(er);
      size = st.size;
      
      if (size === 0) {
        // the kernel lies about many files.
        // Go ahead and try to read some bytes.
        buffers = [];
        return read();
      }

      buffer = new Buffer(size);
      read();
    });
  });

  function read() {
    if (size === 0) {
      buffer = new Buffer(8192);
      fs.read(fd, buffer, 0, 8192, -1, afterRead);
    } else {
      fs.read(fd, buffer, pos, size - pos, -1, afterRead);
    }
  }

  function afterRead(er, bytesRead) {
    if (er) {
      return fs.close(fd, function(er2) {
        return callback(er);
      });
    }

    if (bytesRead === 0) {
      return close();
    }

    pos += bytesRead;
    if (size !== 0) {
      if (pos === size) close();
      else read();
    } else {
      // unknown size, just read until we don't get bytes.
      buffers.push(buffer.slice(0, bytesRead));
      read();
    }
  }

  function close() {
    fs.close(fd, function(er) {
      if (size === 0) {
        // collected the data into the buffers list.
        buffer = Buffer.concat(buffers, pos);
      } else if (pos < size) {
        buffer = buffer.slice(0, pos);
      }

      if (encoding) buffer = buffer.toString(encoding);
      return callback(er, buffer);
    });
  }
};

//fs.readFileSync = read;
fs.readFileSync = function(path, options) {
  if (!options) {
    options = { encoding: null, flag: 'r' };
  } else if (typeof options === 'string') {
    options = { encoding: options, flag: 'r' };
  } else if (typeof options !== 'object') {
    throw new TypeError('Bad arguments');
  }

  var encoding = options.encoding;
  assertEncoding(encoding);

  var flag = options.flag || 'r';
  var fd = fs.openSync(path, flag, 438 /*=0666*/);

  var size;
  var threw = true;
  try {
    size = fs.fstatSync(fd).size;
    threw = false;
  } finally {
    if (threw) fs.closeSync(fd);
  }

  var pos = 0;
  var buffer; // single buffer with file data
  var buffers; // list for when size is unknown

  if (size === 0) {
    buffers = [];
  } else {
    buffer = new Buffer(size);
  }

  var done = false;
  while (!done) {
    var threw = true;
    try {
      if (size !== 0) {
        var bytesRead = fs.readSync(fd, buffer, pos, size - pos);
      } else {
        // the kernel lies about many files.
        // Go ahead and try to read some bytes.
        buffer = new Buffer(8192);
        var bytesRead = fs.readSync(fd, buffer, 0, 8192);
        if (bytesRead) {
          buffers.push(buffer.slice(0, bytesRead));
        }
      }
      threw = false;
    } finally {
      if (threw) fs.closeSync(fd);
    }

    pos += bytesRead;
    done = (bytesRead === 0) || (size !== 0 && pos >= size);
  }

  fs.closeSync(fd);

  if (size === 0) {
    // data was collected into the buffers list.
    buffer = Buffer.concat(buffers, pos);
  } else if (pos < size) {
    buffer = buffer.slice(0, pos);
  }

  if (encoding) buffer = buffer.toString(encoding);
  return buffer;
};


// Used by binding.open and friends
function stringToFlags(flag) {
    // Only mess with strings
    if (typeof flag !== 'string') {
        return flag;
    }
    
    // O_EXCL is mandated by POSIX, Windows supports it too.
    // Let's add a check anyway, just in case.
    if (!O_EXCL && ~flag.indexOf('x')) {
        throw errnoException('ENOSYS', 'fs.open(O_EXCL)');
    }
    switch (flag) {
        case 'r' : return O_RDONLY;
        case 'rs' : return O_RDONLY | O_SYNC;
        case 'r+' : return O_RDWR;
        case 'rs+' : return O_RDWR | O_SYNC;
        case 'w' : return O_TRUNC | O_CREAT | O_WRONLY;
        case 'wx' : // fall through
        case 'xw' : return O_TRUNC | O_CREAT | O_WRONLY | O_EXCL;
        case 'w+' : return O_TRUNC | O_CREAT | O_RDWR;
        case 'wx+': // fall through
        case 'xw+': return O_TRUNC | O_CREAT | O_RDWR | O_EXCL;
        case 'a' : return O_APPEND | O_CREAT | O_WRONLY;
        case 'ax' : // fall through
        case 'xa' : return O_APPEND | O_CREAT | O_WRONLY | O_EXCL;
        case 'a+' : return O_APPEND | O_CREAT | O_RDWR;
        case 'ax+': // fall through
        case 'xa+': return O_APPEND | O_CREAT | O_RDWR | O_EXCL;
    }

    throw new Error('Unknown file open flag: ' + flag);
}

// Yes, the follow could be easily DRYed up but I provide the explicit
// list to make the arguments clear.

fs.close = function(fd, callback) {
  binding.close(fd, makeCallback(callback));
};

fs.closeSync = function(fd) {
  return binding.close(fd);
};

function modeNum(m, def) {
  switch (typeof m) {
    case 'number': return m;
    case 'string': return parseInt(m, 8);
    default:
      if (def) {
        return modeNum(def);
      } else {
        return undefined;
      }
  }
}

fs.open = function(path, flags, mode, callback) {
  callback = makeCallback(arguments[arguments.length - 1]);
  mode = modeNum(mode, 438 /*=0666*/);

  if (!nullCheck(path, callback)) return;
  binding.open(pathModule._makeLong(path),
               stringToFlags(flags),
               mode,
               callback);
};

fs.openSync = function(path, flags, mode) {
    mode = modeNum(mode, 438 /*=0666*/);
    nullCheck(path);
    return binding.open(pathModule._makeLong(path), stringToFlags(flags), mode);
};



fs.mkdir = function(path, mode, callback) {
  if (typeof mode === 'function') callback = mode;
  callback = makeCallback(callback);
  if (!nullCheck(path, callback)) return;
  binding.mkdir(pathModule._makeLong(path),
                modeNum(mode, 511 /*=0777*/),
                callback);
};

fs.mkdirSync = function(path, mode) {
  nullCheck(path);
  return binding.mkdir(pathModule._makeLong(path),
                       modeNum(mode, 511 /*=0777*/));
};

fs.readdir = function(path, callback) {
  callback = makeCallback(callback);
  if (!nullCheck(path, callback)) return;
  binding.readdir(pathModule._makeLong(path), callback);
};

fs.readdirSync = function(path) {
  nullCheck(path);
  return binding.readdir(pathModule._makeLong(path));
};

fs.fstat = function(fd, callback) {
    callback = makeCallback(callback);
    var cb = function(err,data){
        if (err) return callback(err);
        return callback(err,new fs.Stats(data));
    }
    
    binding.fstat(fd, cb);
};

fs.lstat = function(path, callback) {
  callback = makeCallback(callback);
  if (!nullCheck(path, callback)) return;
  var cb = function(err,data){
    if (err) return callback(err);
    return callback(err,new fs.Stats(data));
    }
  binding.lstat(pathModule._makeLong(path), cb);
};

fs.stat = function(path, callback) {
  callback = makeCallback(callback);
  if (!nullCheck(path, callback)) return;
  var cb = function(err,data){
        if (err) return callback(err);
        return callback(err,new fs.Stats(data));
    }
  binding.stat(pathModule._makeLong(path), cb);
};

fs.fstatSync = function(fd) {
  return new fs.Stats(binding.fstat(fd));
};

fs.lstatSync = function(path) {
  nullCheck(path);
  return new fs.Stats(binding.lstat(pathModule._makeLong(path)));
};

fs.statSync = function(path) {
  nullCheck(path);
  return new fs.Stats(binding.stat(pathModule._makeLong(path)));
};

fs.readlink = function(path, callback) {
  callback = makeCallback(callback);
  if (!nullCheck(path, callback)) return;
  binding.readlink(pathModule._makeLong(path), callback);
};

fs.readlinkSync = function(path) {
  nullCheck(path);
  return binding.readlink(pathModule._makeLong(path));
};


// Realpath
// Not using realpath(2) because it's bad.
// See: http://insanecoding.blogspot.com/2007/11/pathmax-simply-isnt.html

var normalize = pathModule.normalize;

// Regexp that finds the next partion of a (partial) path
// result is [base_with_slash, base], e.g. ['somedir/', 'somedir']
if (isWindows) {
  var nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
} else {
  var nextPartRe = /(.*?)(?:[\/]+|$)/g;
}

// Regex to find the device root, including trailing slash. E.g. 'c:\\'.
if (isWindows) {
  var splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
} else {
  var splitRootRe = /^[\/]*/;
}

fs.realpathSync = function realpathSync(p, cache) {
  // make p is absolute
  p = pathModule.resolve(p);

  if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
    return cache[p];
  }

  var original = p,
      seenLinks = {},
      knownHard = {};

  // current character position in p
  var pos;
  // the partial path so far, including a trailing slash if any
  var current;
  // the partial path without a trailing slash (except when pointing at a root)
  var base;
  // the partial path scanned in the previous round, with slash
  var previous;

  start();

  function start() {
    // Skip over roots
    var m = splitRootRe.exec(p);
    pos = m[0].length;
    current = m[0];
    base = m[0];
    previous = '';

    // On windows, check that the root exists. On unix there is no need.
    if (isWindows && !knownHard[base]) {
      fs.lstatSync(base);
      knownHard[base] = true;
    }
  }

  // walk down the path, swapping out linked pathparts for their real
  // values
  // NB: p.length changes.
  while (pos < p.length) {
    // find the next part
    nextPartRe.lastIndex = pos;
    var result = nextPartRe.exec(p);
    previous = current;
    current += result[0];
    base = previous + result[1];
    pos = nextPartRe.lastIndex;

    // continue if not a symlink
    if (knownHard[base] || (cache && cache[base] === base)) {
      continue;
    }

    var resolvedLink;
    if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
      // some known symbolic link. no need to stat again.
      resolvedLink = cache[base];
    } else {
      var stat = fs.lstatSync(base);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache) cache[base] = base;
        continue;
      }

      // read the link if it wasn't read before
      // dev/ino always return 0 on windows, so skip the check.
      var linkTarget = null;
      if (!isWindows) {
        var id = stat.dev.toString(32) + ':' + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          linkTarget = seenLinks[id];
        }
      }
      if (linkTarget === null) {
        fs.statSync(base);
        linkTarget = fs.readlinkSync(base);
      }
      resolvedLink = pathModule.resolve(previous, linkTarget);
      // track this, if given a cache.
      if (cache) cache[base] = resolvedLink;
      if (!isWindows) seenLinks[id] = linkTarget;
    }

    // resolve the link, then start over
    p = pathModule.resolve(resolvedLink, p.slice(pos));
    start();
  }

  if (cache) cache[original] = p;

  return p;
};


