var errors = 0;
var testsCounter = 0;

var start = Date.now();

exports.run = function (file){
    require(file);
}

function report (got,expected,operator,message){
    Error.apply(this);
    
    if (!message){
        message = got + operator + expected;
    }
    
    sep('-');
    testsCounter++;
    if (got != expected) {
        errors++;
        console.error("-> Fail | " + message);
        console.error( '-> ' + this.fileName + ' @ ' + this.lineNumber );
    } else {
        console.error("-> OK   | " + message);
    }
    return false;
};

function assert(got,expected,message){
    report(got ? true : false,true, ' == ' ,message);
}

assert.equal = function (got,expected,message){
    report(got,expected,' == ',message);
};

assert.ok = assert;
exports.assert = assert;

exports.done = function(){
    process.on('exit',function(){
        var now = (Date.now() - start)/1000;
        sep('-');
        sep('/');
        sep('-');
        
        if (errors > 0) {
            console.log(errors + ' of '+ testsCounter +' Tests Failed ( ' + now + ' seconds )');
            process.die(1);
        } else {
            console.log(testsCounter + ' Tests Ran Successfully ( ' + now + ' seconds )');
        }
    });
}

function sep (c,max){
    c = c  || '-';
    max =  max || 54;
    console.log(new Array(max + 1).join(c));
}
