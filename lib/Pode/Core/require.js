var exports = [];
(function(global) {

    var require = global.require = function(id) {
        if (typeof arguments[0] !== 'string') throw 'USAGE: require(moduleId)';
	require.moduleUri = undefined;
	
        var moduleContent = '',
        moduleUri;
	
        moduleContent = require.getmoduleContent(id);
        moduleUri = require.moduleUri;
	
        if (moduleContent) {
	    //print('xxxxx '+require.moduleUri);
	    if (typeof moduleContent === 'object'){
		//throw('perl module');
		exports = moduleContent;
		//return moduleContent;
		
	    } else {
		try {
		    var f = new Function('require', 'exports', 'module', moduleContent),
		    exports = require.cache[moduleUri] || {},
		    module = { id: id, uri: moduleUri, exports: exports };
		    require._root.unshift(moduleUri);
		    f.call({}, require, exports, module);
		    require._root.shift();
		}
		
		catch(e) {
		    throw 'Unable to require source code from "' + moduleUri + '": ' + e.toSource();
		}
		
		exports = module.exports || exports;
		
	    }
	    
            require.cache[id] = exports;
        }
        
        else {
            throw 'The requested module cannot be returned: no content for id: "' + id + '" in paths: ' + require.paths.join(', ');
        }
	//global._filename = moduleUri;
        return exports;
    }
    require._root = [_appPATH];
    require.paths = [];
    require.cache = {}; // cache module exports. Like: {id: exported}
    
    var SLASH = '/';
    
    require.getmoduleContent = function(id) {
	//is it native?? export immediately
	if (process.NativeModules[id]){
	    var model = process.NativeModules[id];
	    require.moduleUri = _podePATH + SLASH + 'Core';
	    if (/\.js$/.test(model)){
		return read(_podePATH + SLASH + model);
	    } else {
		return process.require(process.NativeModules[id]);
	    }
	}
	
        var parts = id.split(SLASH),
	_name_ext = parts.pop().split('.'),
	name = _name_ext[0],
	ext = _name_ext[1],
	isRelative = false,
        isAbsolute = false,
	isBase = false,
	isNative = false,
	basename = name,
	extensions = ext ? ['.'+ext] : ['','.js','.pm','/settings.json','/index.js'];
	
	if (parts[0] === ''){
	    isAbsolute = true;
	    parts.shift();
	} else if (parts[0] === '.' || parts[0] === '..'){
	    isRelative = true;
	    if (parts[0] === '.'){parts.shift()}
	} else {
	    isBase = true;
	}
	
	//if base or absolute and already cached => return cached
	if (isBase === true && require.cache[id]){
	    return require.cache[id];
	}
	
	
	var pType = isBase ? 'Base' : isRelative ? 'Relative' : 'Absolute',
	searchPaths = constructPATHS(pType),
	joined = parts.join(SLASH),
	joined = (joined ? SLASH + joined : '');
	
	for(var i=0;i<searchPaths.length;i++){
	    var path = searchPaths[i];
	    for (var x = 0; x<extensions.length;x++){
		var ex = extensions[x],
		basePath  = path + joined,
		fullFile = basePath + SLASH + basename + ex,
		content;
		//print(fullFile);
		try {
		    content = read(fullFile);
		}catch(e){
		    continue;
		}
		
		if(!ext && x > 2 ){
		    require.moduleUri = basePath + SLASH + basename;
		} else {
		    require.moduleUri = basePath;
		}
		
		global._filename = basePath + SLASH + basename;
		//this is a native module
		if (i == 0 && isBase){ isNative = true; }
		
		//XXX : to do parse content if it comes from json and load again
		
		//send perl modules to native loader
		if (ex === '.pm'){
		    return process.require(isNative ? 'Modules::'+basename : fullFile);
		}
		
		return content;
	    }
	}
	
	return content;
    }
    
    function constructPATHS(type) {
	var searchPaths = [];
	if (type === 'Base'){
	    //searchPaths.push(_podePATH);
	    searchPaths.push(_podePATH+'/Modules');
	    var parts = require._root[0].split('/');
	    for (var i=0;i<parts.length;i++){
		var p = parts.slice(0,parts.length - i).join(SLASH) + '/Modules';
		searchPaths.push(p);
	    }
	    
	} else if (type === 'Relative'){
	    searchPaths.push(require._root[0]);
	} else {
	    searchPaths.push('');
	}
	
	return searchPaths;
    }
    
})(this);
