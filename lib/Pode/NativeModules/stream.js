var events = require('events');
var util = require('util');
var bindings = process.binding('Stream');

function noob (){}

util.inherits(Stream, events.EventEmitter);
function Stream () {
    var self = this;
    events.EventEmitter.call(this);
    return self;
}

//================================[ Readable Stream ]==========================
Stream.prototype.Readable = Readable;
util.inherits(Readable, Stream);

function Readable (fd,options) {
    
    if (!(this instanceof Readable))
    return new Readable(fd,options);
    
    options = options || {};
    var self = this;
    self.fd = fd || options.fd;
    self.bufferSize = options.bufferSize || 16 * 1024;
    
    this.readable = true;
    Stream.call(this);
    
    bindings.readableStream(self.fd);
    return self;
}


Readable.prototype.read = function (buf,cb) {
    var self = this,
    fd = self.fd;
    
    var data = bindings._read({
        fd : fd,
        buffSize : buf
    });
    
    if (cb && typeof cb === 'function'){
        cb(data);
    }
    //this.reading = false;
    return data;
}

//================================[ Writable Stream ]==========================
Stream.prototype.Writable = function (fd,options) {
    this.writable = true;
    return new writableStream (fd,options);
};

util.inherits(writableStream, events.EventEmitter);
function writableStream (fd,options) {
    events.EventEmitter.call(this);
    options = options || {};
    var self = this;
    self.fd = fd;
    self.writable = true;
    self.bufferSize = options.bufferSize || 16 * 1024;
    bindings.writableStream(self.fd);
    return self;
}

writableStream.prototype.write = function (data,callback) {
    
    if (callback && typeof callback !== 'function') {
        throw('callback must be a function');
    }
    
    var offset = 0;
    var self = this;
    var buffer = self.bufferSize;
    
    if (typeof data == 'number'){
        data += '';
    }
    
    var len = data.length;
    if (len === 0){
        return this;
    }
    
    function write (){
        var str = data.substr(offset,buffer);
        var written = bindings.wr({
            string : str,
            fd : self.fd,
            offset : offset,
            buffer : buffer
        });
        offset += written;
        return offset;
    }
    
    if (callback){
        setInterval(function(){
            offset = write();
            if (offset >= len){
                callback(null);
                clearInterval(this);
            }
        });
    } else {
        while (offset < len){
            offset = write();
        }
    }
    
    return this;
}

module.exports = new Stream();
