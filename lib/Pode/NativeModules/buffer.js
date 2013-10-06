var binding = process.binding('Buffer');
var assert = require('assert');

exports.Buffer = Buffer;
Buffer.poolSize = 8 * 1024;

function SlowBuffer (length){
    if (!(this instanceof SlowBuffer)) {
        return new SlowBuffer(length);
    }
    
    var t = process.wrap(binding.SlowBuffer,length);
    this.wrapper = t.pointer;
    this.__proto__ = t;
    
    Object.defineProperty(this.__proto__, 'length', {
        get: function() {
            return this._length();
        }
    });
    
    Object.defineProperty(this.__proto__, 'byteLength', {
        get: function() {
            return this._bytelength();
        }
    });
    
    this.write = function(string, offset, length, encoding){
        var ret;
        if (encoding == 'ascii'){
            string = asciiToBytes(string);
        } else if (encoding == 'binary'){
            string = asciiToBytes(string);
        }
        
        if (string.length > Buffer.poolSize){
            process.sendBuffer(string);
            ret = this._writeBigBuffer(offset, length, encoding);
        } else {
            ret = this._write(string, offset, length, encoding);
        }
        
        return ret;
    };
    
    this.toString = function(start, end, encoding){
        return this._toString(start, end, encoding);
    };
    
    return this;
}

function asciiToBytes(str) {
    var string = '';
    for (var i = 0; i < str.length; i++ ){
        var code = str.charCodeAt(i);
        string += String.fromCharCode(code & 0xFF);
    }
    return string;
}

function Buffer(subject, encoding, offset) {
    if (!(this instanceof Buffer)) {
        return new Buffer(subject, encoding, offset);
    }
    
    this.offset = 0;
    var type;
    // Are we slicing?
    if (typeof offset === 'number') {
        if (!Buffer.isBuffer(subject)) {
            throw new TypeError('First argument must be a Buffer when slicing');
        }
        
        this.length = +encoding > 0 ? Math.ceil(encoding) : 0;
        this.parent = subject.parent ? subject.parent : subject;
        this.offset = offset;
        
    } else {
        // Find the length
        switch (type = typeof subject) {
            case 'number':
                this.length = +subject > 0 ? Math.ceil(subject) : 0;
                break;
                
            case 'string':
                //this.length = Buffer.byteLength(subject, encoding);
                break;
            
            case 'object': // Assume object is array-ish
                this.length = +subject.length > 0 ? Math.ceil(subject.length) : 0;
                break;
                
            default:
            throw new TypeError('First argument needs to be a number, ' + 'array or string.');
        }
        
        this.parent = new SlowBuffer(this.length);
        this.offset = 0;
        
        // optimize by branching logic for new allocations
        if (typeof subject !== 'number') {
            if (type === 'string') {
                // We are a string
                this.length = this.write(subject, 0, encoding);
                //this.parent.setLength();
                // if subject is buffer then use built-in copy method
            } else if (Buffer.isBuffer(subject)) {
                if (subject.parent) {
                    subject.parent.copy(
                        this.parent,
                        this.offset,
                        subject.offset,
                        this.length + subject.offset
                    );
                } else {
                    subject.copy(this.parent, this.offset, 0, this.length);
                }
            } else if (isArrayIsh(subject)) {
                //for (var i = 0; i < subject.length; i++) {
                //    this.set(i + this.offset,subject[i]);
                //}
                
                this.parent.setArray(subject);
                
            }
        }
    }
    this.wrapper = this.parent.pointer;
    return this;
}

function isArrayIsh(subject) {
    return Array.isArray(subject) ||
        subject && typeof subject === 'object' &&
        typeof subject.length === 'number';
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
    return b instanceof Buffer;
};

Buffer.prototype.write = function(string, offset, length, encoding) {
    // Support both (string, offset, length, encoding)
    // and the legacy (string, encoding, offset, length)
    if (isFinite(offset)) {
        if (!isFinite(length)) {
            encoding = length;
            length = undefined;
        }
    } else {  // legacy
        var swap = encoding;
        encoding = offset;
        offset = length;
        length = swap;
    }
    
    offset = +offset || 0;
    var remaining = this.length - offset;
    if (!length) {
        length = remaining;
    } else {
        length = +length;
        if (length > remaining) {
            length = remaining;
        }
    }
    
    encoding = String(encoding || 'utf8').toLowerCase();
    
    switch (encoding) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
          return this.parent.write(string, this.offset + offset, length, encoding);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return this.parent.write(string, this.offset + offset, length, 'ucs2');
        
        default:
          throw new TypeError('Unknown encoding: ' + encoding);
    }
};

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
    encoding = String(encoding || 'utf8').toLowerCase();
    
    if (typeof start !== 'number' || start < 0) {
        start = 0;
    } else if (start > this.length) {
        start = this.length;
    }
    
    if (typeof end !== 'number' || end > this.length) {
        end = this.length;
    } else if (end < 0) {
        end = 0;
    }
    
    start = start + this.offset;
    end = end + this.offset;
    
    switch (encoding) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
            return this.parent.toString(start, end, encoding);
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
            return this.parent.toString(start, end, 'ucs2');
        default:
            throw new TypeError('Unknown encoding: ' + encoding);
    }
};

Buffer.prototype.inspect = function() {
    return this.parent.inspect();
};

Buffer.prototype.set = function(index,value) {
    if (index > this.length){
        throw new RangeError('index value out of range');
    }
    
    if (typeof value !== 'number'){
        value = 0;
    }
    
    //this is how node do it??
    var hexString = value.toString(16);
    if (hexString.length > 2){
        value = parseInt(hexString.substring(hexString.length - 2),16);
    }
    
    value = String.fromCharCode(value);
    this.parent.set(index,value);
    
};

Buffer.prototype.get = function get(offset) {
    if (offset < 0 || offset >= this.length)
        throw new RangeError('offset is out of bounds');
    return this.parent.get(this.offset + offset);
};

function clamp(index, len, defaultValue) {
    if (typeof index !== 'number') return defaultValue;
    index = ~~index;  // Coerce to integer.
    if (index >= len) return len;
    if (index >= 0) return index;
    index += len;
    if (index >= 0) return index;
    return 0;
}

// slice(start, end)
Buffer.prototype.slice2 = function(start, end) {
    var len = this.length;
    start = clamp(start, len, 0);
    end = clamp(end, len, len);
    //console.log(this.parent);
    return new Buffer(this, end - start, start + this.offset);
};

Buffer.prototype.slice = function(start, end) {
    var len = this.length;
    start = clamp(start, len, 0);
    end = clamp(end, len, len);
    //console.log(this.parent);
    var buf = new Buffer(end - start);
    //buf.copy(this,end,end,end);
    this.copy(buf, 0, start, end);
    return buf;
};


Buffer.prototype.toArray = function() {
    return this.parent.toArray();
};

Buffer.prototype.destroy = function() {
    this.parent.destroy();
    //setTimeout(function(){
    //    gc();
    //});
};

Buffer.isEncoding = function(encoding) {
    switch (encoding && encoding.toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
        case 'raw':
            return true;
        default:
            return false;
    }
};

Buffer.concat = function(list, length) {
    if (!Array.isArray(list)) {
        throw new TypeError('Usage: Buffer.concat(list, [length])');
    }

    if (list.length === 0) {
        return new Buffer(0);
    } else if (list.length === 1) {
        return list[0];
    }
    
    if (typeof length !== 'number') {
        length = 0;
        for (var i = 0; i < list.length; i++) {
            var buf = list[i];
            length += buf.length;
        }
    }
    
    var buffer = new Buffer(length);
    var pos = 0;
    for (var i = 0; i < list.length; i++) {
        var buf = list[i];
        buf.copy(buffer, pos);
        pos += buf.length;
    }
    return buffer;
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
    // set undefined/NaN or out of bounds values equal to their default
    if (!(target_start >= 0)) target_start = 0;
    if (!(start >= 0)) start = 0;
    if (!(end < this.length)) end = this.length;
    
    // Copy 0 bytes; we're done
    if (end === start ||
    target.length === 0 ||
    this.length === 0 ||
    start > this.length) return 0;
    
    if (end < start)
        throw new RangeError('sourceEnd < sourceStart');

    if (target_start >= target.length)
        throw new RangeError('targetStart out of bounds');

    if (target.length - target_start < end - start)
        end = target.length - target_start + start;

    return this.parent.copy(target.parent || target,
        target_start + (target.offset || 0),
        start + this.offset,
        end + this.offset);
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
    value || (value = 0);
    start || (start = 0);
    end || (end = this.length);

    if (typeof value === 'string') {
        value = value.charCodeAt(0);
    }
  
    if (typeof value !== 'number' || isNaN(value)) {
        throw new TypeError('value is not a number');
    }

    if (end < start) throw new RangeError('end < start');
    
    // Fill 0 bytes; we're done
    if (end === start) return 0;
    if (this.length == 0) return 0;
    
    if (start < 0 || start >= this.length) {
        throw new RangeError('start out of bounds');
    }

    if (end < 0 || end > this.length) {
        throw new RangeError('end out of bounds');
    }

    return this.parent.fill(value,
        start + this.offset,
        end + this.offset);
};

