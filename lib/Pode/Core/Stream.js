var events = require('events');
var util = require('util');
var bindings = process.bindings('Stream');

util.inherits(Stream, events.EventEmitter);
function Stream () {
    var self = this;
    events.EventEmitter.call(this);
    
    if (self.readable){
        function loop (){
            if (self.readable === false || !self.fd){
                process.nextTick(loop);
                return;
            }
            
            if (self.fd && !self.built){
                self.built = true;
                //make and stor filehandle for this fd
                bindings.readableStream({
                    fd : self.fd
                });
            }
            
            var ret = bindings.check_state(self.fd);
            var state = ret.state,
            pos = ret.pos;
            
            if (ret.error){
                self.emit('error',ret.error);
                close();
            } else {
                if (self.fd === 9){
                    self.emit('readable');
                    //var d = self.read(1);
                }else if (state > pos){
                    self.emit('readable');
                }
                
                process.nextTick(loop);
            }
        }
        process.nextTick(loop);
    }
    
    return self;
    
}

//================================[ Readable Stream ]==========================
Stream.prototype.Readable = Readable;
util.inherits(Readable, Stream);

function Readable (options) {
    
    if (!(this instanceof Readable))
    return new Readable(options);
    
    options = options || {};
    var self = this;
    self.fd = self.fd || options.fd;
    self.bufferSize = options.bufferSize || 16 * 1024;
    self.lowwaterMark = options.lowwaterMark;
    
    
    
    this.readable = true;
    Stream.call(this);
    
    function close (){
        //close file handle
        //remove listners
    }
    
    
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
    self.bufferSize = options.bufferSize || 16 * 1024;
    self.lowwaterMark = options.lowwaterMark;
    
    //_handles.push(fd);
    _cachedStream.Write[fd] = self;
    
    bindings.writableStream({
        fd : self.fd,
        buffer : self.buff
    });
    
    return self;
}

writableStream.prototype.write = function (data,callback) {
    var ret = bindings.write({
    fd : this.fd,
    data : data
    },callback);
    
    return ret;
}

//================================[ Pipe Stream ]==========================
Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    print('GOT THIS');
    if (dest.writable) {
        print('GOT THIS');
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('readable', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events. Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

module.exports = new Stream();

