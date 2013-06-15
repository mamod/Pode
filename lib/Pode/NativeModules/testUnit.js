var errors = 0;
var testsCounter = 0;
var colors = require('colors');

var start = Date.now();
var plans = 0;
exports.run = function (file){
    require(file);
}



exports.plan = function(num){
    plans += num;
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
        console.error(colors.inverse(colors.red("-> Fail |")) + ' ' + colors.red(message));
        sep('-');
        console.error( colors.red('Caller -> ' + this.fileName + ' @ ' + this.lineNumber) );
    } else {
        console.error(colors.inverse(colors.green("-> OK   |")) + ' ' + message);
    }
    return false;
};

function assert(got,message){
    report(got ? true : false,true, ' == ' ,message);
}

assert.equal = function (got,expected,message){
    report(got,expected,' == ',message);
};

assert.strictEqual = function (got,expected,message){
    var val = got === expected,
    msg = message || got + ' === ' + expected;
    report(val,true,' === ',msg);
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
            console.log(colors.red((errors + ' of '+ testsCounter +' Tests Failed ( ' + now + ' seconds )')));
            process.exit(1);
        } else if (plans > 0 && testsCounter < plans){
            console.log(colors.red( 'You Planed to run ' + plans + ' Tests but we only got ' + testsCounter ));
            process.exit(1);
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
