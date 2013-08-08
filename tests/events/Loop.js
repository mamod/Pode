//testing EV interface
var path = require('path'),
assert = require('test').assert,
binding = require('./EV.pm');

var file1 = path.resolve(__dirname + '/../files/test1.txt');
var file2 = path.resolve(__dirname + '/../files/test2.txt');
var file3 = path.resolve(__dirname + '/../files/big.txt');

var got,got2,fd1,fd2,
end2 = false,
end1 = false;

//=============================================================================
// First Event
//=============================================================================
var ev1 = process.wrap(binding.readFile, file1, function(err,fd){
    fd1 = fd;
});

ev1.onData = function(data){
    got = data;
};

ev1.onExit = function(){
    end1 = true;
};

//=============================================================================
// Second Event
//=============================================================================
var ev2 = process.wrap(binding.readFile, file2, function(err,fd){
    fd2 = fd;
});

ev2.onData = function(data){
    got2 = data;
    end2 = false;
};

ev2.onExit = function(data){
    end2 = true;
};

//=============================================================================
// Third Event - read big file and return bytes read
//=============================================================================
var ev3 = process.wrap(binding.readBigFile, file3),
bytesRead = 0,
finalizeBytes = 0;
ev3.onData = function(data){
    bytesRead += data.bytes;
    //end must be last thing to be called
    //reset to make sure it's called last
    finalizeBytes = 0;
};

ev3.onExit = function(){
    finalizeBytes = bytesRead;
};

//=============================================================================
// Error Event
//=============================================================================
var ev4 = process.wrap(binding.testError, file2, function(err,fd){
});

var gotError;
ev4.onError = function(err){
    gotError = new Error(err);
};

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
    
    //errors
    assert(gotError instanceof Error);
    assert.equal(gotError.message,'Something Wrong');
    
});

