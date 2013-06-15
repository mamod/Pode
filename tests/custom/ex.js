var stream = require('stream');


var fd = stream.Writable(1);
fd.write('uu',function(){
    fd.write('Doneeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');
});

//fd.write(read('test.txt'));


//var buf = require('Buffer');
//
//var t = new require('Buffer').Buffer(read('large.txt'), "utf8").toString("hex");

//log(t);

//var fs = require('./fs');
//
//var file = path.resolve(__dirname + '/../files/large.txt');
//
//
//fs.readFile(file,function(err,data){
//    log(data);
//});
//
//
//setInterval(function(){
//print('hi');
//},100);

//
//fs.open(file,'r',function(err,fd){
//if (err) throw new Error(err);
//log(fd);
//});
//
//
//fs.fstat(4,function(e,r){
//    log(r.isDirectory());
//});
