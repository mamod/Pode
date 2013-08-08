var binding = process.binding('Repl');
var vm = require('vm'),
util = require('util');

var defaults = {
    input : '',
    output : '',
    prompt : '> '
};

exports.start = function(opt){
    opt = opt ? util.extend(opt,defaults) : defaults;
    process.stdout.write(opt.prompt);
    var ev = process.wrap(binding.readline);
    ev.onData = function(code){
        var r;
        try {
            r = vm.runInThisContext(code, 'repl');
        } catch(e){
            r = e;
        }
        
        console.log(r);
        process.stdout.write(opt.prompt);
    };
};
