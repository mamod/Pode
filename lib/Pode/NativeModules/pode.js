/* Keep this as first line */ function __Eval (code) { return eval(code) }
function Script (){}
Script.runInThisContext = function (code,filename) {
    return __Eval('try{ ' + code + '}catch(e){ throw new Error("'+filename+'") }');
};

Object.prototype.each = function(cb){
    var obj = this;
    for (var key in obj){
        if(obj.hasOwnProperty(key))
            cb(key,obj[key]);
    }
    return null;
};


(function(process){
    
    Error.captureStackTrace = function(){
        //todo
    };
    
    load(process._nativedir + 'require.js');
    this.global = this;
    var Eventloop = [];
    function Loop (fn){
        this.fn = fn;
    }
    
    Loop.prototype.remove = function(){
        this.active = false;
    }
    
    process.setEvent = function(fn,checker){
        var loop = new Loop(fn);
        loop.active = true;
        if (checker && typeof checker === 'function'){
            loop.eventChecker = checker;
        }
        Eventloop.push(loop);
        return loop;
    }
    
    process.DEBUG = true;
    
    //copy errors functions
    process.Error = Error;
    process.Stack;
    
    process.throwError = function(e,file,module){
        if (file && e._new) e.fileName = file;
        throw(e);
    };
    
    process.traceError = function(e,file,module){
        if (!file && e.fileName) file = e.fileName;
        if (e instanceof SyntaxError ) {
            file = process.Stack.filename;
        }
        
        var callStack = (function(){
            var parent = module || e.module;
            var stack = [];
            while(parent){
                stack.push(parent.filename);
                parent = parent.parent;
            }
            if (stack.length) return stack.reverse();
            return null;
        })();
        
        print('============( Error )============\n');
        print('>  Msg  : ' + e);
        if (file) print('>  File : ' + file);
        if (e && e.lineNumber){
            print('>  Line : ' + (parseInt(e.lineNumber)));
            if (file){
                var content = read(file);
                var lines = content.split('\n');
                print( '\n   --> ' + lines[ e.lineNumber - 1 ]);
            }
        }
        
        if (callStack){
            print('\n============( Call Stack )============');
            log(callStack);
        }
        
        if (e && e.stack) {
            print('\n============( Stack )============');
            log(e.stack);
        };
        
        process.die({
            file : file || '',
            line : e.lineNumer || '',
            message : e.toString() || ''
        });
    };
    
    function bindingConstruct (f,m){
        return function(){
            var args = Array.slice(arguments,0);
            var cb = args[args.length - 1];
            if (typeof cb === 'function'){
                process.nextTick(function(){
                    var ret = f(m,args);
                    if (ret && typeof ret === 'object' && ret.name === 'Error'){
                        var e = new Error();
                        e.lineNumber = ret.lineNumber;
                        e.fileName = ret.fileName;
                        e.message = ret.message;
                        cb(e);
                    } else {
                        cb(null,ret);
                    }
                });
            } else {
                var ret = f(m,args);
                if (ret && typeof ret === 'object' && ret.name === 'Error'){
                    var e = new Error();
                    e.lineNumber = ret.lineNumber;
                    e.fileName = ret.fileName;
                    e.message = ret.message;
                    throw (e);
                } else {
                    return ret;
                }
            }
            
            return undefined;
        };
    }
    
    process.bindingCache = {};
    process.binding = function (id,opt){
        
        if (process.bindingCache[id]){
            return process.bindingCache[id];
        }
        
        process.bindingCache[id] = {};
        var module = process._binding(id,opt);
        
        if (!module){
            return false;
        }
        
        var obj = [];
        for (var i = 0; i<module.exports.length; i++){
            var method = module.exports[i];
            if (typeof method === 'object'){
                method.each(function(key,val){
                process.bindingCache[id][key] = val;
                });
                continue;
            }
            process.bindingCache[id][method] = new bindingConstruct(process.bindingSend,method);
        }
        
        delete process.bindingSend;
        return process.bindingCache[id];
    };
    
    function startup (){
        
        var stream = require('stream');
        process.stdout = stream.Writable(1);
        process.stderr = stream.Writable(2);
        
        global.console = require('console');
        global.log = function(){
            var util = require('util');
            print(util.format.apply(this, arguments));
        };
        
        
        //console.log = log;
        //console.error = console.log;
        
        //global.Buffer = NativeModule.require('buffer').Buffer;
        
        var EventEmitter = require('events').EventEmitter;
        process.__proto__ = Object.create(EventEmitter.prototype, {
            constructor: {
              value: process.constructor
            }
        });
        
        EventEmitter.call(process);
        
        //startup.globalVariables();
        startup.globalTimeouts();
        //startup.globalConsole();
        //startup.processAssert();
        //startup.processStdio();
        startup.processNextTick();
        startup.EV();
        
        if (process.argv[0]){
            require(process.argv[0]);
            process._tickCallback();
        } else {
            require('repl').start();
        }
        
        var GCounter = 0;
        while (Eventloop.length > 0 ){
            var len = Eventloop.length;
            GCounter++;
            process.check(1);
            sleep(.00001);
            var now = Date.now();
            for(var i = 0; i < Eventloop.length; i++){
                var event = Eventloop[i];
                
                if (event.eventChecker){
                    event.eventChecker(Eventloop);
                }
                
                if (event.active){
                    event.time = now;
                    event.fn();
                } else {
                    Eventloop.splice(i,1);
                }
            }
            
            if (GCounter > 1000){
                GCounter = 0;
                gc();
            }
        }
        
        //on process exit
        process.emit('exit');
        process._exiting = true;
        quit(0);
        
    }
    
    startup.EV = function() {
        
        var EvCounter = 1,
        _EV = {},
        max_childs = 1,
        childCount = 0;
        
        var EventEmitter = require('events').EventEmitter;
        events.prototype.__proto__ = EventEmitter.prototype;
        global.EV = {};
        
        EV.data = function(pointer,data){
            var e = _EV[pointer];
            setTimeout(function(){
                if(e) e.emit('data',data);
            });
        };
        
        EV.end = function(pointer,data){
            var e = _EV[pointer];
            setTimeout(function(){
                e.emit('end',data);
                clearEvent(e._loop);
                delete _EV[pointer];
            });
        };
        
        EV.error = function(pointer,err){
            var e = _EV[pointer];
            setTimeout(function(){
                e.emit('error',err);
                clearEvent(e._loop);
                delete _EV[pointer];
            });
        };
        
        EV.fork = function(fn){
            setEvent(function(){
                if (max_childs < childCount){
                    
                }
            });
        };
        
        EV.run = function(fn){
            var ev = new events();
            var args = Array.slice(arguments,1);
            args.splice(0, 0, ev.pointer);
            setTimeout(function(){
                fn.apply(ev,args);
            });
            
            ev._loop = setEvent(function(){});
            return ev;
        };
        
        function normalizeArgs (pointer,data){
            if (arguments.length === 2) return data;
            var args = Array.slice(arguments,1);
            return args;
        }
        
        function events (){
            EventEmitter.call(this);
            this.pointer = EvCounter++;
            this.setMaxListeners(100);
            _EV[this.pointer] = this;
            return this;
        }
        
    };
    
    startup.processNextTick = function() {
        var _needTickCallback = process._needTickCallback;
        var nextTickQueue = [];
        var needSpinner = true;
        var inTick = false;
        
        // this infobox thing is used so that the C++ code in src/node.cc
        // can have easy accesss to our nextTick state, and avoid unnecessary
        // calls into process._tickCallback.
        // order is [length, index, depth]
        // Never write code like this without very good reason!
        var infoBox = process._tickInfoBox;
        var length = 0;
        var index = 1;
        var depth = 2;
        
        process._tickCallback = _tickCallback;
        process._tickFromSpinner = _tickFromSpinner;
        // needs to be accessible from cc land
        process._tickDomainCallback = _tickDomainCallback;
        process.nextTick = nextTick;
        process._nextDomainTick = _nextDomainTick;
        
        // the maximum number of times it'll process something like
        // nextTick(function f(){nextTick(f)})
        // It's unlikely, but not illegal, to hit this limit. When
        // that happens, it yields to libuv's tick spinner.
        // This is a loop counter, not a stack depth, so we aren't using
        // up lots of memory here. I/O can sneak in before nextTick if this
        // limit is hit, which is not ideal, but not terrible.
        process.maxTickDepth = 1000;
        
        function tickDone(tickDepth_) {
            if (infoBox[length] !== 0) {
                if (infoBox[length] <= infoBox[index]) {
                    nextTickQueue = [];
                    infoBox[length] = 0;
                } else {
                    nextTickQueue.splice(0, infoBox[index]);
                    infoBox[length] = nextTickQueue.length;
                    if (needSpinner) {
                        _needTickCallback();
                        needSpinner = false;
                    }
                }
            }
            inTick = false;
            infoBox[index] = 0;
            infoBox[depth] = tickDepth_;
        }
        
        function maxTickWarn() {
            // XXX Remove all this maxTickDepth stuff in 0.11
            var msg = '(node) warning: Recursive process.nextTick detected. ' +
                'This will break in the next version of node. ' +
                'Please use setImmediate for recursive deferral.';
            if (process.throwDeprecation)
                throw new Error(msg);
            else if (process.traceDeprecation)
                log(msg);
            else
                log(msg);
        }
        
        function _tickFromSpinner() {
            needSpinner = true;
            // coming from spinner, reset!
            if (infoBox[depth] !== 0)
            infoBox[depth] = 0;
            // no callbacks to run
            if (infoBox[length] === 0)
            return infoBox[index] = infoBox[depth] = 0;
            process._tickCallback();
        }
        
        // run callbacks that have no domain
        // using domains will cause this to be overridden
        function _tickCallback() {
            var callback, nextTickLength, threw;
            
            if (inTick) return;
            if (infoBox[length] === 0) {
                infoBox[index] = 0;
                infoBox[depth] = 0;
                return;
            }
            inTick = true;
            
            while (infoBox[depth]++ < process.maxTickDepth) {
                nextTickLength = infoBox[length];
                if (infoBox[index] === nextTickLength)
                return tickDone(0);
                
                while (infoBox[index] < nextTickLength) {
                    callback = nextTickQueue[infoBox[index]++].callback;
                    threw = true;
                    try {
                        callback();
                        threw = false;
                    } finally {
                        if (threw) tickDone(infoBox[depth]);
                    }
                }
            }
            
            tickDone(0);
        }
        
        function _tickDomainCallback() {
            var nextTickLength, tock, callback, threw;
            
            // if you add a nextTick in a domain's error handler, then
            // it's possible to cycle indefinitely. Normally, the tickDone
            // in the finally{} block below will prevent this, however if
            // that error handler ALSO triggers multiple MakeCallbacks, then
            // it'll try to keep clearing the queue, since the finally block
            // fires *before* the error hits the top level and is handled.
            if (infoBox[depth] >= process.maxTickDepth)
            return _needTickCallback();
            
            if (inTick) return;
            inTick = true;
            
            // always do this at least once. otherwise if process.maxTickDepth
            // is set to some negative value, or if there were repeated errors
            // preventing depth from being cleared, we'd never process any
            // of them.
            while (infoBox[depth]++ < process.maxTickDepth) {
                nextTickLength = infoBox[length];
                if (infoBox[index] === nextTickLength)
                return tickDone(0);
                
                while (infoBox[index] < nextTickLength) {
                    tock = nextTickQueue[infoBox[index]++];
                    callback = tock.callback;
                    if (tock.domain) {
                        if (tock.domain._disposed) continue;
                        tock.domain.enter();
                    }
                    threw = true;
                    try {
                        callback();
                        threw = false;
                    } finally {
                        // finally blocks fire before the error hits the top level,
                        // so we can't clear the depth at this point.
                        if (threw) tickDone(infoBox[depth]);
                    }
                    if (tock.domain) {
                        tock.domain.exit();
                    }
                }
            }
            tickDone(0);
        }
        
        function nextTick(callback) {
            // on the way out, don't bother. it won't get fired anyway.
            if (process._exiting)
            return;
            if (infoBox[depth] >= process.maxTickDepth)
            maxTickWarn();
            
            var obj = { callback: callback, domain: null };
            nextTickQueue.push(obj);
            infoBox[length]++;
            
            if (needSpinner) {
                _needTickCallback(infoBox);
                needSpinner = false;
            }
        }
        
        function _nextDomainTick(callback) {
            // on the way out, don't bother. it won't get fired anyway.
            if (process._exiting)
            return;
            if (infoBox[depth] >= process.maxTickDepth)
            maxTickWarn();
            
            var obj = { callback: callback, domain: process.domain };
            
            nextTickQueue.push(obj);
            infoBox[length]++;
            
            if (needSpinner) {
                _needTickCallback();
                needSpinner = false;
            }
        }
    };
    
    startup.globalTimeouts = function() {
        
        var t = require('timers');
        
        global.setTimeout = function() {
            return t.setTimeout.apply(this, arguments);
        };
        
        global.setInterval = function() {
            return t.setInterval.apply(this, arguments);
        };
        
        global.clearTimeout = function() {
            return t.clearTimeout.apply(this, arguments);
        };
        
        global.clearInterval = function() {
            return t.clearInterval.apply(this, arguments);
        };
        
        global.setImmediate = function() {
            return t.setImmediate.apply(this, arguments);
        };
        
        global.clearImmediate = function() {
            return t.clearImmediate.apply(this, arguments);
        };
        
        global.setEvent = process.setEvent;
        
        global.clearEvent = function(ev) {
            ev.remove();
        };
    };
    
    var process_tickCallback;
    process.MakeCallback = function (object,callback,args,module){
        
        callback = object[callback];
        if (!process_tickCallback) {
            var cb = process._tickCallback;
            if (typeof cb !== 'function') {
                throw new Error("process._tickCallback assigned to non-function\n");
            }
            process_tickCallback = cb;
        }
        
        var ret = callback.call(object, args);
        
        if (process._tickInfoBox.length == 0) {
            process._tickInfoBox.index = 0;
            process._tickInfoBox.depth = 0;
            return ret;
        }
        
        try {
            process_tickCallback.call(process, null);
        } catch (e){
            throw new Error(e);
        }
        
        return ret;
    }
    
    try {
        startup();
    } catch(e){
        process.traceError(e);
    }
    
})(process);
