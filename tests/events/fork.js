//testing EV interface
//same as Loop.js but using forking methods

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
var ev1 = EV.run(binding.readFile2, file1, function(err,fd){
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
var icounter = 0;
var interval = setInterval(function(){
    icounter++;
},100);

var ev2 = EV.run(binding.readFile2, file2, function(err,fd){
    fd2 = fd;
});

ev2.on('data',function(data){
    got2 = data;
    end2 = false;
    clearInterval(interval);
});

ev2.on('end',function(data){
    end2 = true;
});

//=============================================================================
// Third Event - read big file and return bytes read
//=============================================================================
var ev3 = EV.run(binding.readBigFile2, file3),
bytesRead = 0,
finalizeBytes = 0;
ev3.on('data',function(data){
    bytesRead += data.bytes;
    //end must be last thing to be called
    //reset to make sure it's called last
    finalizeBytes = 0;
});

ev3.on('end',function(data){
    finalizeBytes = bytesRead;
});
//=============================================================================
// Error Event
//=============================================================================
var ev4 = EV.run(binding.testError2, function(err,fd){
    
});


var gotError;
ev4.on('error',function(err){
    gotError = new Error(err);
});

ev4.on('data',function(data){
});

//=============================================================================
// Process Exit
//=============================================================================
process.on('exit',function(){
    global.Error = Error;
    assert(typeof fd1 === 'number','fd1 is a number');
    assert(typeof fd2 === 'number','fd2 is a number');
    assert(typeof fd1 !== fd2,'fd1 !== fd2');
    assert.strictEqual(got,'Hi There From Test1');
    assert.equal(got2,'Hi There From Test2');
    assert(end1,'Event End Call Received');
    assert(end2,'Event2 End Call Received');
    
    assert.strictEqual(finalizeBytes,binding.size());
    
    //we expect setinterval to run even though readFile2
    //is blocking for 1 second
    //this is because readFile2 function is
    //running through a forking sub
    assert.ok(icounter >= 9,'Non blocking setInterval got ' + icounter);
    
    //errors
    assert(gotError instanceof Error);
    assert.equal(gotError.message,'Something Wrong');
});

