var EventEmitter = require('events').EventEmitter;
var Stream = require('stream');
var Readable = Stream.Readable;
var Writable = Stream.Writable;
var binding = process.binding('IO');
var constants = binding.constants;

var util = require('util');
var pathModule = require('path');

var fs = exports;

fs.ReadStream = ReadStream;

fs.createReadStream = function(path, options) {
  return new ReadStream(path, options);
};

util.inherits(ReadStream, Readable);
function ReadStream(path, options) {
  if (!(this instanceof ReadStream))
    return new ReadStream(path, options);
    
    options = util._extend({
    bufferSize: 64 * 1024,
    highWaterMark: 64 * 1024
    }, options || {});
    
    Readable.call(this, options);
    this.path = path;
    this.fd = options.hasOwnProperty('fd') ? options.fd : null;
    this.flags = options.hasOwnProperty('flags') ? options.flags : 'r';
    this.mode = options.hasOwnProperty('mode') ? options.mode : 438; /*=0666*/
  
    this.start = options.hasOwnProperty('start') ? options.start : undefined;
    this.end = options.hasOwnProperty('end') ? options.end : undefined;
    this.autoClose = options.hasOwnProperty('autoClose') ? options.autoClose : true;
    this.pos = undefined;
    
    if (this.start !== undefined) {
        if ('number' !== typeof this.start) {
            throw TypeError('start must be a Number');
        }
        if (this.end === undefined) {
            this.end = Infinity;
        } else if ('number' !== typeof this.end) {
            throw TypeError('end must be a Number');
        }
        
        if (this.start > this.end) {
            throw new Error('start must be <= end');
        }
        this.pos = this.start;
    }
    
    if (typeof this.fd !== 'number')
    this.open();

    this.on('end', function() {
        if (this.autoClose) {
            this.destroy();
        }
    });
    
    //this.emit('dddd');
    return this;
    
}


ReadStream.prototype.open = function() {
    var self = this;
    fs.open(this.path, this.flags, this.mode, function(er,fd) {
        if (er) {
            //throw new Error(er);
            if (this.autoClose) {
                self.destroy();
            }
            self.emit('error', new Error(er));
            return;
        }
        
        self.fd = fd;
        self.emit('open', fd);
        // start the flow of data.
        //self.read();
        
    });
};

fs.open = function(path, flags, mode, callback) {
    //callback = makeCallback(arguments[arguments.length - 1]);
    mode = modeNum(mode, 438 /*=0666*/);
    if (!nullCheck(path, callback)) return;
    binding.open({
        path : pathModule._makeLong(path),
        flag :       stringToFlags(flags),
        mode :       mode
    },callback);
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

function stringToFlags(flag) {
    //throw new Error('Unknown file open flag: ' + flag);
    return flag;
}


fs.stat = function(path, callback) {
    if (!nullCheck(path, callback)) return;
    path = pathModule._makeLong(path);
    var cb;
    if (callback && typeof callback === 'function'){
        cb = function(err,data){
            var newObj = new fs.Stats(path,data);
            callback(err,newObj);
        }
    }
    
    binding.stat(path, cb);
};


fs.Stats = function (path,obj){
    
    this.path = path;
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
    
}

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

fs.existsSync = function(path){
    try {
        nullCheck(path);
        binding.stat(pathModule._makeLong(path));
        return true;
    } catch (e) {
        return false;
    }
};



