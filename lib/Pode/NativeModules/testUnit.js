var errors = 0;
var testsCounter = 0;
var colors = require('colors');

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
        console.error(colors.inverse(colors.red(colors.bold("-> Fail |"))) + ' ' + colors.red(message));
        sep('-');
        console.error( colors.red('Caller -> ' + this.fileName + ' @ ' + this.lineNumber) );
    } else {
        console.error(colors.inverse(colors.green("-> OK   |")) + ' ' + message);
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
            console.log(colors.red((colors.bold(errors + ' of '+ testsCounter +' Tests Failed ( ' + now + ' seconds )'))));
            process.die(1);
        } else {
            console.log(colors.green(testsCounter + ' Tests Ran Successfully ( ' + now + ' seconds )'));
        }
    });
}

function sep (c,max){
    c = c  || '-';
    max =  max || 54;
    console.log(colors.bold(new Array(max + 1).join(c)));
}
