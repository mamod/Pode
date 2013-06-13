//testing EV interface
var path = require('path'),
assert = require('test').assert,
binding = require('./EV.pm');

var file1 = path.resolve(__dirname + '/files/test1.txt');
var file2 = path.resolve(__dirname + '/files/test2.txt');
var file3 = path.resolve(__dirname + '/files/big.txt');

var got,got2,fd1,fd2,
end2 = false,
end1 = false;


//=============================================================================
// First Event
//=============================================================================
var ev1 = EV.run(binding.readFile, file1, function(err,fd){
    fd1 = fd;
});

ev1.on('data',function(data){
    got = data;
});

ev1.on('end',function(data){
    end1 = true;
});

//=============================================================================
// Second Event
//=============================================================================
var ev2 = EV.run(binding.readFile, file2, function(err,fd){
    fd2 = fd;
});

ev2.on('data',function(data){
    got2 = data;
    end2 = false;
});

ev2.on('end',function(data){
    end2 = true;
});

//=============================================================================
// Third Event - read big file and return bytes read
//=============================================================================
var ev3 = EV.run(binding.readBigFile, file3),
bytesRead = 0,
finalizeBytes = 0;
ev3.on('data',function(data){
    bytesRead += data.bytes;
    //end must be last thing to be called
    //reset to make sure it's called last
    finalizeBytes = 0;
});

ev3.on('end',function(){
    finalizeBytes = bytesRead;
});

//=============================================================================
// Process Exit
//=============================================================================
process.on('exit',function(){
    assert(typeof fd1 === 'number','fd1 is a number');
    assert(typeof fd2 === 'number','fd2 is a number');
    assert(typeof fd1 !== fd2,'fd1 !== fd2');
    assert.equal(got,'Hi There From Test1');
    assert.equal(got2,'Hi There From Test2');
    assert(end1,'Event End Call Received');
    assert(end2,'Event2 End Call Received');
    
    assert.equal(finalizeBytes,binding.size());
    
});

