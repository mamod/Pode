function Buffer(str,encoding){
	switch(typeof str){				
		case "string":
			return Uint8Array.fromString(str,encoding);
		case "number":
			return new Uint8Array(str);
		case "object":
			var b = new Uint8Array(str.length);
			for(var i = 0; i < b.length; i++){
				b[i] = str[i];
			}
			return b;
	}
}

Uint8Array.__base64table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
Uint8Array.fromString = function(str,encoding){
	var b;
	if(encoding == "hex"){
		b = new Uint8Array(str.length/2);
		for(var i = 0; i < str.length; i+=2){
			b[i/2] = parseInt(str.substr(i,2),16);
		}
	}
    if(encoding == "base64"){	
        str = atob(str);
        encoding = "binary";
	}
    if(encoding == "utf8" || !encoding){
		var tmp = [];
		for (var n = 0; n < str.length; n++) {			 
			var c = str.charCodeAt(n);			 
			if (c < 128) {
				tmp.push(c);
			}else if((c > 127) && (c < 2048)) {
                                tmp.push((c >> 6) | 192);
				tmp.push((c & 63) | 128);
			}else {
				tmp.push((c >> 12) | 224);
				tmp.push(((c >> 6) & 63) | 128);
				tmp.push((c & 63) | 128);
			}			 
		}
		b = new Uint8Array(tmp.length);
		for(var i = 0; i < tmp.length; i++){
			b[i] = tmp[i];
		}					
	}
    if(encoding == "ascii" || encoding == "binary"){
		b = new Uint8Array(str.length);
		for(var i = 0; i < str.length; i++){
			b[i] = str.charCodeAt(i)%(encoding == "ascii"?128:256);
		}
	}
    if(encoding == "ucs2"){
		b = new Uint8Array(str.length*2);
		for(var i = 0; i < b.length; i+=2){
			var x = str.charCodeAt(i/2);
			var a = x%256;
			x -= a;
			x /= 256;
			b[i] = x;
			b[i+1] = a;
		}
	}
	return b;
}
Uint8Array.prototype.toString = function(encoding,start,end){			
	start = start||0;
	end = end||this.length-1;
	
	var s = "";

	if(encoding == "hex"){
		for(var i = start; i <= end; i++){
			s += (this[i]<16?"0":"")+this[i].toString(16);
		}
	}else if(encoding == "base64"){
        var bytes = new Array(this.length);
        for(var i = 0; i < this.length; i++){
            bytes[i] = this[i];
        }
        s = btoa(String.fromCharCode.apply(null,bytes));
	}else if(encoding == "utf8" || !encoding){
		var i = 0;
		var c = c1 = c2 = 0;			 
		while ( i < this.length ) {			 
			c = this[i];			 
			if (c < 128) {
				s += String.fromCharCode(c);
				i++;
			}else if((c > 191) && (c < 224)) {
				c2 = this[i+1];
				s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}else {
				c2 = this[i+1];
				c3 = this[i+2];
				s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}			 
		}
	}else if(encoding == "ascii" || encoding == "binary"){
        var codes = new Array(this.length/2);        
		for(var i = 0; i < this.length; i++){
			codes[i] = this[i];
		}
        s = String.fromCharCode.apply(null,codes);
	}else if(encoding == "ucs2"){       
        var codes = new Array(this.length/2);
        for(var i = 0; i < this.length;){
            codes[i] = this[i++]*256+this[i++];
        }
        s = String.fromCharCode.apply(null,codes);
	}
	return s;
}
Uint8Array.prototype.copy = function(targetBuffer,targetStart,sourceStart,sourceEnd){
    targetStart = targetStart||0;
    sourceStart = sourceStart||0;
    sourceEnd = sourceEnd ||this.length-1;
    
    var length = sourceEnd-sourceStart+1;
    if(targetStart+length >= targetBuffer.length){
        length = targetBuffer.length-targetStart+1;
    }
        
    for(var i = 0; i < length; i++){
        targetBuffer[targetStart+i] = this[sourceStart+i];
    }
}
Uint8Array.prototype.slice = function(start,end){
    start = start||0;
    end = end||this.length-1;                
    
    var b = new Uint8Array(end-start+1);  
    for(var i = 0; i < b.length; i++){
        b[i] = this[i+start];
    }
    return b;
}
Uint8Array.prototype.fill = function(value,offset,end){
    offset = offset||0;
    end = end|| this.length-1;
    for(;offset<=end;offset++){
        this[offset] = value;
    }
}
Uint8Array.prototype.readUInt8 = function(offset,noAssert){
    return this[offset];
}
Uint8Array.prototype.readUInt16LE = function(offset,noAssert){
    return this[offset]*256+this[offset];
}
Uint8Array.prototype.readUInt16BE = function(offset,noAssert){
    return this[offset]+this[offset]*256;
}
Uint8Array.prototype.readUInt32LE = function(offset,noAssert){
    return this.readUInt16LE(offset)*256*256+this.readUInt16LE(offset+2);
}
Uint8Array.prototype.readUInt32BE = function(offset,noAssert){
    return this.readUInt16LE(offset)+this.readUInt16LE(offset+2)*256*256;
}
Uint8Array.prototype.readInt8 = function(offset,noAssert){
    return this.readUInt8(offset)-128;
}
Uint8Array.prototype.readInt16LE = function(offset,noAssert){
    return this.readUInt16LE(offset)-128*256;
}
Uint8Array.prototype.readInt16BE = function(offset,noAssert){
    return this.readUInt16BE(offset)-128*256;
}
Uint8Array.prototype.readInt32LE = function(offset,noAssert){
    return this.readUInt32LE(offset)-128*256*256*256;
}
Uint8Array.prototype.readInt32BE = function(offset,noAssert){
    return this.readUInt32BE(offset)-128*256*256*256;
}