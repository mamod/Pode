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
    
    process.stdout.write(opt.prompt);
    
    var ev = EV.run(binding.repl);
    ev.on('data',function(code){
        var r;
        try {
            r = vm.runInThisContext(code, 'repl');
        } catch(e){
            r = e;
        }
        
        console.log(r);
        process.stdout.write(opt.prompt);
    });
    
    //var input = binding.readline();
    //process.setEvent(function(){
    //    if (process._repl){
    //        var code = process._repl;
    //        delete process._repl;
    //        var r;
    //        try {
    //            r = vm.runInThisContext(code, 'repl');
    //        } catch(e){
    //            r = e;
    //        }
    //        //console.log('\x1B[32m' + r + '\x1B[39m');
    //        console.log(r);
    //        process.stdout.write(opt.prompt);
    //        //binding.put(opt.prompt);
    //    }
    //});
};

