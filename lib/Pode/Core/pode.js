
(function (global) {
    
    global.process = function () {};
    process.moduleCache = {};
    process.counter = 1;
    process._countTicks = 0;
    
    process.NativeModules = JSON.parse(read(_podePATH + '/Core/NativeModules.json'));
    
    process.callCache = {};
    process.TickCycle = [];
    function ipc (obj,callback) {
        var ipc = this;
        ipc.rec = 0;
        ipc.args = obj;
        ipc.id = obj.id;
        ipc.callback = callback;
	
        ipc.send = function () {
	    ipc.sent = true;
	    obj.sync = ipc.sync;
	    var str = JSON.stringify(obj, null, null);
            print("to_perl[" + str + "]end_perl");
        };
        
        ipc.processData = function (data) {
	    delete process.callCache[ipc.id];
            if (typeof ipc.callback === 'function') {
                ipc.callback.apply(null,[data.args]);
            }
        };
	
        return ipc;
    }
    
    
    process.send = function (opt,callback) {
	
        var id = process.counter++;
        opt.id = id;
        var request = new ipc(opt,callback);
	process.callCache[id] = request;
	
	//Async
	//any request with callack function is considered as Async
	if (callback && typeof callback === 'function') {
	    process.callCache[id].sync = false;
	    process.nextTick(id);
	} else {
	    //Sync
	    process.callCache[id].sync = true;
	    process.callCache[id].send();
	    return process.wait(id);
	}
	
	return opt;
    };
    
    process.pid = function () {
	return process.send({method:"pid"});
    };
    
    process.sleep = function (ms) {
	ms = ms/1000;
	process.send({method:"sleep", args : ms});
    };
    
    //====================================[ EXIT ]==============================
    // Exit & destroy
    //==========================================================================
    process.exit = function (status) {
	process.emit('exit',status);
	quit(status);
    };
    
    
    process.handleERROR = function(e){
	try {
	    print(_filename);
	    if (e && e.stack){
		print(JSON.stringify(process.lastCall) + JSON.stringify(e.stack.replace(/(?:\n@:0)?\s+$/m, '').replace(/^[\(@]/gm, '{anonymous}()@').split('\n')));
		print('KKKK1 ' + e);
	    } else {
		print('\nKKKK '+ e );
	    }
	} catch(e){
	    print(e);
	}
	
	quit(0);
    };
    
    //Blocking wait
    //wait response from perl
    process.wait = function (origID) {
	
	var obj = process.callCache[origID];
	
	if (!obj || obj.sent !== true) {
	    return false;
	}
	
	if (obj._args) {
	    var ret = obj._args;
	    delete process.callCache[origID];
	    return ret;
	}
	
	var data = readline();
	
	if (data === 'process._tock();') {
	    //do not tock if we are waiting for a blocking system call
	    return process.wait(origID);
	}
	
	if ((/^process\.test/).test(data)) {
	    eval(data);
	    return process.wait(origID);
	}
	
	try {
	    eval(data);
	} catch (e) {
	   process.handleERROR('DDDDDDDDDDDDDDDDDDDDDD');
	}
	
	if (process.callCache[origID]) {
	    if (process.callCache[origID]._args) {
		var ret2 = process.callCache[origID]._args;
		delete process.callCache[origID];
		return ret2;
	    } else {
		if (process.callCache[origID].sent === true) {
		    return process.wait(origID);
		} else {
		    return undefined;
		}
	    }
	} else {
	    return process.wait(origID);
	}
	
	throw('EXEPTION');
    };
    process.lastCall = undefined;
    process.evalObj = function (obj) {
	//print('SHELL RECEIVED '+JSON.stringify(obj));
	process.lastCall = obj;
	if (typeof obj === 'object') {
	    if (obj.sync === true) {
		if (process.callCache[obj.id]) {
		    process.callCache[obj.id]._args = obj.args || 1;
		}
		return undefined;
	    } else if (obj.id) {
		var fn = process.callCache[obj.id];
		delete process.callCache[obj.id];
		process._tickSoFar--;
		if (fn && typeof fn.callback === 'function') {
		    try{
			//fn.callback.apply(null,[obj.throwERROR,obj.args]);
			fn.callback(obj.throwERROR,obj.args);
		    } catch(e){
			//throw(e);
			process.handleERROR(e);
		    }
		}
		return undefined;
	    } else {
		return obj.args;
	    }
	} else {
	    //return eval(obj);
	}
	
	return true;
    };
    
    //native modules require
    process.bindings = process.binding = process.require = function (clss,options) {
        if (process.moduleCache[clss]) {
            return process.moduleCache[clss];
        }
        
        var ret = process.send({
            "method" : "load",
            "args" : {
                "class" : clss,
                "options" : options
            }
        });
        
        //again??! is it already loaded by perl?
        if (ret && ret.uri && process.moduleCache[ret.uri]) {
            return process.moduleCache[ret.uri];
        }
        
        //bless returned object
        var blessed = bless(clss,ret);
        process.moduleCache[clss] = blessed;
        return blessed;
    };
    
    var EventEmitter = require('events').EventEmitter;
    process.__proto__ = Object.create(EventEmitter.prototype, {
	constructor: {
	    value: process.constructor
	}
    });
    
    //===========================[ process bindings ]===========================
    // 
    //==========================================================================
    
    var _process = process.send({method:"os"});
    process.parent = process.pid();
    process.env = _process.env;
    process.os = _process.os;
    process.isMaster = function () {
	return process.pid() === process.parent ? true : false;
    };
    
    process.cwd = function(){
	return _podePATH;
    }
    
    //===================================[ nextTick ]===========================
    // implementation of nexttick
    // workers = how many workers to fork
    //parrallel = how many ticks to process in parallel : default =0
    //==========================================================================
    process.pids = [];
    process._tickSoFar = 0;
    
    process.workers = 0;
    process.parallel = 1;
    process._tickExit = (process.workers);
    process._maxticks = (process.workers - process.parallel);
    
    process._ticks = function () {
	process.nextTick(function () { loopTimers(); });
	process.send({method:"tock"});
	process.prefork();
	//print(process.pids);
	return undefined;
    };
    
    process.prefork = function () {
	var pid;
	while (process.workers > 0) {
	    pid = process.send({method:"prefork","args":process.workers});
	    process.workers--;
	    process.pids.push(pid);
	}
	return pid;
    };
    
    process._tock = function () {
	//
	var func = process.TickCycle[0];
	if (typeof func === 'number') {
	    func = process.callCache[func];
	    if (process._tickSoFar < process.parallel ) {
		process._tickSoFar++;
		process.TickCycle.splice(0,1);
		func.send();
	    }
	}
	process._rotate();
    };
    
    process._rotate = function () {
	for(var i=0;i<process.TickCycle.length;i++) {
	    var func = process.TickCycle[i];
	    if (typeof func === 'function') {
		func();
		process.TickCycle.splice(i,1);
	    }
	}
    };
    
    process.nextTick = function (fn) {
	process.TickCycle.push(fn);
    };
    
    
    process.getObject = function(){
	return 'wwwww';
    }
    
    //=====================================[ bless ]============================
    // register custom functions from perl modules
    //==========================================================================
    process._classSend= function (cl,m,a,c) {
        var ret = process.send({
            "class" : cl,
            "method" : m,
            "args" : a
        },c);
        
        return ret;
    };
    
    function bless(clss,opt) {
        var _blessed = this;
        _blessed.stringify = function (opt) {
            var str = '';
            var exported = opt.exports;
            for (var i=0;i<exported.length;i++) {
                var fun = exported[i];
		
                if (fun) {
		    
		    if (typeof fun === 'object'){
		        continue;
		    }
		    
                    str += 'this.'+fun+' = function (a,c) {'
                        +'var fun ="'+fun+'";'
                        +'var ret = process._classSend("'+opt['class']+'",fun,a,c);'
                        +'return ret;'
                        +'};';
                }
            }
            return str;
        }
        
        var fn;
        //if we have exported functions from perl, add them
        if (opt && typeof opt === 'object' && typeof opt.exports === 'object') {
            var className = 'BLESS';
            fn = [
                'function '+className+'() {',
		    'this.constants = opt.constants;',
                    _blessed.stringify(opt),
                '}',
                'new '+className+'();'
            ].join("\n");
        }
        
        return eval(fn);
    }
    
    //====================================[ Timers ]============================
    var _timersCache = [];
    function Timer (fn,ms,type) {
	this.interval = type;
	this.callback = fn;
	this.start = Date.now();
	this.ms = ms;
	return this;
    }
    

    global.setInterval = function (fn,ms) {
	return addTimer(fn,ms,true);
    };
    
    global.setTimeout = function (fn,ms) {
	return addTimer(fn,ms,false);
    };
    
    global.clearInterval = function (fn) {
	clearTimers(fn);
    };
    
    global.clearTimeout = function (fn) {
	clearTimers(fn);
    };
    
    function clearTimers(fn) {
	
	if (!fn) {
	    return;
	}else if (fn instanceof Timer) {
	    fn.callback = function () {}
	    fn.interval = false;
	}
    }

    function addTimer (fn,ms,type) {
	var obj = new Timer(fn,ms,type);
	_timersCache.push(obj);
	return obj;
    }
    
    
    global.loopTimers = function () {
	var $timer = _timersCache,
	now = Date.now();
	for (var i =0;i< $timer.length;i++) {
	    var $this = $timer[i];
	    if (($this.start + $this.ms) - 5 <= now) {
	        $this.callback();
	        $this.start = now;
		if ($this.interval === false) {
		    $timer.splice(i,1);
		}
	    }
	}
	//do we have more timers? add to next loop
	if ($timer.length > 0) {
	    process.nextTick(loopTimers);
	}
    };
    
    //================================[ STODIO ]================================
    // 
    //==========================================================================
    function stdout() {
	this.fd = 1;
	this.write = print;
	return this;
    }
    
    function stdin() {
	this.fd = 0;
	this.write = print;
	return this;
    }
    
    function stderr() {
	this.fd = 2;
	this.write = print;
	return this;
    }
    
    process.stdout = new stdout();
    process.stdin = new stdin();
    process.stderr = new stderr();
    
    process.stdin.__proto__ = Object.create(EventEmitter.prototype, {
	constructor: {
	    value: process.stdin.constructor
	}
    });
    
    process.stdin.on('data',function (data) {
	print(data);
    });
    
    process.test = function (type,dd) {
	process.stdin.emit(type,dd);
    };
    
    //====================================[ Console ]===========================
    global.console = require('console');
    
    
    
    
})(this);
