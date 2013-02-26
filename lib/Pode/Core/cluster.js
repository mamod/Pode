(function(exports){
    
    var _cl = process.bindings('Cluster');
    
    function _cluster() {}
    _cluster.__proto__ = Object.create(_cl, {
	constructor: {
	    value: _cluster.constructor
	}
    });
    
    _cluster.add = function(ff){
        return new cluster(ff);
    }
    
    module.exports = _cluster;
    
    function cluster(ff){
        this.pid = _cluster.create();
    }
    
    cluster.prototype.process = function(func){
        //var pid = this.pid;
        //_cluster.run({
        //    pid : pid
        //});
        //
        ////_cluster.change();
        //    func();
        //    process.switchPid = 0;
        
    }
    
    
    cluster.prototype.start = function(){
        print(this.pid);
        process.clusterid = this.pid;
    }
    
    cluster.prototype.end = function(){
        process.clusterid = null;
    }
    
    
    
})(exports);
