//Simple server example

var http = require('http');
var options = {
    port : 8080,
    host : 'localhost'
};

var server = http.run(options,function(request,response){
    response.write('Hi From Pode Server');
    response.end();
});

console.log('Server Running on Port 8080');

