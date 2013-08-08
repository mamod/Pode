var EE = require('events').EventEmitter,
path = require('path'),
Stream = require('stream'),
binding = process.binding('IP'),
util = require('util');

exports.spawn = function(file,args,options){
    return new ChildProcess(file,args,options);
};


var defaultOptions = {
    detach : false,
    env : process.env
    
};

function ChildProcess (file,args,options){
    
    var self = this;
    
    var ev = process.wrap(binding.fork,file,args);
    var interval;
    self.write = function(data,fn){
        var len = data.length;
        var offset = 0;
        var buf =  8 * 1024;
        interval = setInterval(function(){
            var str = data.substr(offset,buf);
            var written = ev.send(str);
            offset += written;
            if (offset >= len){
                clearInterval(this);
                if (fn && typeof fn === 'function') {
                    fn();
                }
            }
        });
    };
    
    var ee = 0;
    
    if (options && options.timeout > 0){
        setTimeout(function(){
            clearAll();
        },options.timeout);
    }
    
    
    ev.onData = function(data){
        if (data.data) console.log('stdout : ' + data.data.length);
        if (data.error)  console.log('stdout : ' + data.error);
        console.log('xx ' + ee++);
    };
    
    ev.onError = function(data){
        console.log(data);
    };
    
    ev.onExit = function(data){
        console.log('Exit Code ==== ' + data);
    };
    
    function clearAll(){
        if (interval) clearInterval(interval);
        ev.close();
    }
    
    return this;
    
}