var binding = require('./fs.pm');

exports.readFile = function(file,callback){
    var ev
    
    try {
        
        ev = EV.run(binding.readFile,file,'r');
        var buf = '';
        ev.on('data',function(data){
            buf += data;
        });
        
        ev.on('end',function(data){
            callback(null,buf);
            binding.go();
        });
        
        ev.on('error',function(e){
            callback(e);
        });
        
    } catch (e){
        callback(e);
    }
    
};
