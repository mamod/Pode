//Simple server example

var http = require('http');
var options = {
    port : 8080,
    host : 'localhost'
};

var i = 0;
var server = http.run(options,function(request,response){
    console.log(request);
    response.write('Hi From Pode Server ' + i++);
    response.end();
});

console.log('Server Running on Port 8080');

