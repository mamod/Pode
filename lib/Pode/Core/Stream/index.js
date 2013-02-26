
var events = require('events');
var util = require('util');
var bindings = process.bindings('Stream');


var _cachedStream = {
Write : {},
Read : {}
};

var _handles = [];

util.inherits(Stream, events.EventEmitter);
function Stream () {
    this.readable = false;
    this.writable = false;
    events.EventEmitter.call(this);
}

//================================[ Readable Stream ]==========================
Stream.prototype.Readable = function (fd,options) {
    this.readable = true;
    return new readableStreamm (fd,options);
};

util.inherits(readableStreamm, events.EventEmitter);
function readableStreamm (fd,options) {
    events.EventEmitter.call(this);
    options = options || {};
    var self = this;
    self.fd = fd;
    self.bufferSize = options.bufferSize || 16 * 1024;
    self.lowwaterMark = options.lowwaterMark;
    
    _handles.push(fd);
    _cachedStream.Read[fd] = self;
    
    bindings.readableStream({
        fd : self.fd,
        buffer : self.buff
    });
    
    
    return self;
}

readableStreamm.prototype.write = function (buf,callback) {
    bindings.write(buf);
}

readableStreamm.prototype.read = function (buf,callback) {
    var fd = this.fd;
    var data = bindings._read({
        "fd" : fd,
        buffSize : buf
    },callback);
    
    return data;
    
}

readableStreamm.prototype.emitReadable = function (data) {
    this.emit('readable',data);
}

readableStreamm.prototype.resume = function () {
    this.emitData = true;
}

readableStreamm.prototype.pause = function () {
    this.emitData = false;
}



//================================[ Writable Stream ]==========================

_globalEmit = function (opt) {
    
    var fd = opt.fd,
    data = opt.data,
    type = opt.type;
    
    var cached = _cachedStream[fd][type];
    
    for (var i = 0; i < cached.length; i++){
        cached[i](data);
    }
}

setInterval(function(){
    
    var read = bindings.can_read(_handles);
    
    for (var i = 0; i < read.length;i++){
        var s = read[i],
        fd = s.fd,
        type = s.type,
        call = s.call,
        args = s.args,
        obj = _cachedStream[type][fd];
        
        if (obj.emitData == true && call === 'emitReadable'){
            //emit data
            obj.read(2,function(data){
                obj.emit('data',data);
            });
        } else {
            obj[call](args);
        }
        
    }
    
},10);


module.exports = new Stream();

