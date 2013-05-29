(function(global){
    
    function lazyLoad (){
        global.require = require2;
    }
    
    var wrapper = [
        '(function (exports, require, module, __filename, __dirname) { ',
        '\n});'
    ];
    
    function ErrorHandler (code){
        return 'try {\n'
        + code
        + '\n} catch(e){ module.error = e; process.traceError(__filename,e,module) }';
    }
    
    var modulePaths = [],
    cache = {},
    NativeCache = {};
    
    var NativeModules = {
        vm : 'vm.js',
        eval : 'eval.js',
        fs : 'fs.js',
        events : 'events.js',
        path : 'path.js',
        assert : 'assert.js',
        util : 'util.js',
        console : 'console.js',
        assert : 'assert.js',
        child_process : 'child_process.js',
        string_decoder : 'string_decoder.js',
        dgram : 'dgram.js',
        _linklist : '_linklist.js',
        _rbtree : '_rbtree.js',
        _treebase : '_treebase.js',
        timers : 'timers.js',
        timer_wrap : 'timer_wrap.js',
        http : 'http.js',
        mime : 'mime.js',
        request : 'request.js',
        repl : 'repl.js'
    };
    
    function NativeRequire (id){
        if (NativeCache[id]) return NativeCache[id].exports;
        return CompileNative(id);
    }
    
    function CompileNative (id){
        var filename = id + '.js';
        var module = NativeCache[id] = {};
        module.exports = {};
        var source = wrapper[0] + read(process._nativedir + NativeModules[id]) + wrapper[1];
        var fn = Script.runInThisContext(source, filename, true);
        fn(module.exports, require, module, filename,process._nativedir);
        return module.exports;
    }
    
    var require2 = function(id,parent){
        if (NativeModules[id]) return  NativeRequire(id);
        var module = new Module(id,parent);
        return module.load();
    };
    
    function Module (id,parent){
        this.id = id;
        this.exports = {};
        this.parent = parent || null;
        if (parent && parent.children) {
            parent.children.push(this);
        }
        
        this.filename = null;
        this.loaded = false;
        this.children = [];
        this.paths = modulePaths.slice(0);
    }
    
    Module.prototype.resolve = function (){
        
        var self = this;
        var request = this.id;
        path = require('path');
        
        var basename = path.basename(request),
        ext = path.extname(basename);
        
        var start = request.substring(0, 1),
        searchpath,
        searchPaths = [];
        if (start === '.' || start === '/') {
            //relative
            searchPaths = [request];
        } else {
            
            if (this.parent){
                searchPaths = constructPaths(this.parent.dirname,request);
            } else {
                searchPaths = [request];
            }
        }
        
        //will return matched extension
        this.tryFiles(searchPaths,ext);
        
        if (!this.parent){
            this.id = '.';
        }  
    };
    
    Module.prototype._compile = function(content,filename){
        
        //log(_eval);
        var self = this,
        dirname = self.dirname;
        Script = require('eval').NodeScript;
        
        function require (id){
            return require2(id,self);
        }
        
        require.extensions = Module._extensions;
        
        var args = [self.exports, require, self, filename, dirname];
        var wrap = wrapper[0] + ErrorHandler(content) + wrapper[1];
        var fn = Script.runInThisContext(wrap, filename, true);
        fn.apply(self.exports, args);
    };
    
    Module.prototype.load = function(){
        
        var self = this;
        self.resolve();
        
        var filename = self.filename,
        dirname = self.dirname,
        parent = self.parent,
        path = require('path');
        
        if (cache[filename]){
            return cache[filename].exports;
        }
        
        cache[filename] = self;
        
        var extension = path.extname(filename) || '.js';
        if (Module._extensions[extension]) {
            Module._extensions[extension](self,filename);
        }
        
        return self.exports;
    };
    
    function constructPaths (parent,req){
        var path = require('path');
        var x = true,
        sep = path.sep,
        paths = parent.split(sep),
        b = [];
        //log(paths);
        for (var i = paths.length; i > 0; i--){
            var cpath = paths.slice(0,i);
            b.push(cpath.join(sep) + sep + 'modules' + sep + req);
        }
        return b;
    }
    
    Module.prototype.tryFiles = function(paths,ext){
        
        var extinsions = ext ? [''] : ['','.js','.json','/index.js','/index.json'];
        var path = require('path'),
        binding = process.binding('Utils');
        
        for(var x = 0; x < extinsions.length; x++){
            var extend = extinsions[x];
            for (var i = 0; i < paths.length; i++){
                var tryFile = path.resolve(this.parent ? this.parent.dirname : process.cwd(), paths[i] + extend);
                //log(tryFile);
                if (binding.isFile(tryFile)){
                    this.id = this.filename = tryFile;
                    this.dirname = path.dirname(tryFile);
                    return ext ? ext : extend;
                }
            }
        }
        
        throw ('Cant Find Module ' + this.id );
    };
    
    Module._initPaths = function() {
        var isWindows = process.platform === 'win32';
        var path = require('path');
        if (isWindows) {
            var homeDir = process.env.USERPROFILE;
        } else {
            var homeDir = process.env.HOME;
        }
        
        var paths = [path.resolve(process.execPath, '..', '..', 'lib', 'node')];
        
        if (homeDir) {
            paths.unshift(path.resolve(homeDir, '.node_libraries'));
            paths.unshift(path.resolve(homeDir, '.node_modules'));
        }
        
        if (process.env['NODE_PATH']) {
            var splitter = isWindows ? ';' : ':';
            paths = process.env['NODE_PATH'].split(splitter).concat(paths);
        }
        
        modulePaths = paths;
        // clone as a read-only copy, for introspection.
        Module.globalPaths = modulePaths.slice(0);
    };
    
    Module._extensions = {};
    Module._extensions['.js'] = function(module, filename) {
        var content = read(filename);
        module._compile(content,filename);
    };
    
    Module._extensions['.pm'] = function(module, filename) {
        var t = process.binding(filename,1);
        module.exports = t;
    };
    
    lazyLoad();
    Module._initPaths();
    
    
})(this);