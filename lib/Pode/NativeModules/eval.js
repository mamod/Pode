/* keep on the first line */ function evalMachine (context,code){ return context.eval(code); }

var CloneObject = (function(source, target) {
    Object.getOwnPropertyNames(source).forEach(function(key) {
        try {
            var desc = Object.getOwnPropertyDescriptor(source, key);
            if (desc.value === source) desc.value = target;
            Object.defineProperty(target, key, desc);
        } catch (e) {
            throw(e);
            // Catch sealed properties errors\n\
        }
    });
});

//compile code
function Compile (code,file){
    return code;
    return 'try{\n ' + code + '\n }catch(e){ throw new Error("'+ file +'") }';
}

//create new context
function WrappedContext (sandbox) {
    var context = newGlobal();
    //delete globals
    for (var key in context) {
        delete context[key];
    }
    
    if (sandbox) {
        if (typeof sandbox === 'object') {
            CloneObject(sandbox, context);
        } else {
            throw new Error("createContext() accept only object as first argument.");
        }
    }
    
    return context;
}

function isGlobal (obj){
    return Object.prototype.toString.call( obj ) === '[object global]'
}


exports.NodeScript = NodeScript;
function NodeScript (code,file){
    this.code = Compile(code,file);
}

NodeScript.prototype.runInNewContext = function (sandbox){
    
    var code = this.code;    
    var ctx = WrappedContext(sandbox);
    var ret = evalMachine(ctx,code);
    
    //redefine sandbox - shallow copy
    for (var key in ctx) {
        sandbox[key] = ctx[key];
    }
    
    return ret;
};

NodeScript.prototype.runInThisContext = function (){
    var code = this.code;
    return evalMachine(global,code);
};


NodeScript.createContext = function(sandbox){
    return WrappedContext(sandbox);
};

NodeScript.runInContext = function(code,context,file){
    if (!isGlobal(context)){
        throw new Error('runInContext needs a context object as a second argument');
    }
    
    code = Compile(code,file);
    return evalMachine(context,code);
};

NodeScript.runInThisContext = function(code,file){
    var c = Compile(code,file);
    return evalMachine(global,c);
};


NodeScript.runInNewContext = function(code,sandbox,file){
    var c = new NodeScript(code,file);
    return c.runInNewContext(sandbox);
};


