

exports.fork = function(file){   
    var id = process.send({"method":"exec",args : file});
    var child = {};
    process.TickCycle = [];
    child.see = function(args){
	//child.emit('message',args);
	var idd = process.send({
	    method : "emit",
	    args : {
		pid : id,
		data : args
	    }
	});
    }
    
    child.__proto__ = Object.create(process, {
	constructor: {
	    value: child.constructor
	}
    });
    
    child.parent = id;
    
    return child;
}


//    var content = read(file);
//    var script = [
//        '(function(global){',
//	    content,
//	'})(this);'
//    ].join('\n');
//    eval(script);