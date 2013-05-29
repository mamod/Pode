var binding = process.binding('File'),
timers = require('timers'),
path = require('path');


exports.readFile33 = function (file,cb){
    
    var fd = binding.openFile(file);
    file = path.resolve(file);
    //return cb(null,read(file));
    
    var self = setInterval(function(){
        var read = binding.readFile(fd,64 * 1024);
        
        if (read){
            this.buffer += read;
        } else {
            var data = this.buffer;
            delete this.buffer;
            clearInterval(this);
            cb(null,data);
        }
        
    },1);
    
    self.buffer = '';
};

exports.readFile = function (file,cb){
    
    file = path.resolve(file);
    var fd = binding.openFile(file);
    
    
    var self = process.setEvent(function(){
        //this.remove();
        //return cb(null,read(file));
        var read = binding.readFile(fd, 64 * 1024);
        
        if (read){
            this.buffer += read;
        } else {
            var data = this.buffer;
            delete this.buffer;
            this.remove();
            cb(null,data);
        }
    });
    
    self.buffer = 0;
};


