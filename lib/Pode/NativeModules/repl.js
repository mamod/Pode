var binding = process.binding('Repl');
var vm = require('vm'),
util = require('util');

var defaults = {
    input : '',
    output : '',
    prompt : '> '
};

exports.start = function(opt){
    
    opt ? opt = util.extend(opt,defaults) : opt = defaults;
    
    var input = binding.readline();
    
    binding.put(opt.prompt);
    process.setEvent(function(){
        if (process._repl){
            var code = process._repl;
            delete process._repl;
            var r;
            try {
                r = vm.runInThisContext(code, 'repl');
            } catch(e){
                r = e;
            }
            //console.log('\x1B[32m' + r + '\x1B[39m');
            console.log(r);
            binding.put(opt.prompt);
        }
    });
};

