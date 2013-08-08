var binding = process.binding('IPC');
var test = require('test'),
assert = test.assert,
path = require('path');

var intervalCounter = 0;
var interval = setInterval(function(){
    //spawned process sleep for sometime
    //in the mean while this should keep running
    intervalCounter++;
},100);

//=============================================================================
// first event
//=============================================================================
var pl = path.resolve(__dirname + '/test.pl');
var ev = process.wrap(binding.fork,'perl',[pl,'First']);
var datas = '';
ev.onData = function(res){
    var data = res.data;
    var error = res.error;
    
    if (interval){
        interval = clearInterval(interval);
        assert.ok(intervalCounter > 10,'We got interval running');
        
        //so this is the first call to data
        //we have to get 'First' as first data
        var first = data.slice(0,5);
        assert.ok(first,'First');
    }
    
    if (error){
        //we should get one error
        assert.equal(error,"This is An Error");
    } else {
        datas += data;
    }
    
};

ev.onExit = function(code){
    assert.strictEqual(129,code);
};

//=============================================================================
// second Event
//=============================================================================
var pl2 = path.resolve(__dirname + '/test2.pl');
var ev2 = process.wrap(binding.fork,'perl',[pl2]);

ev2.onData = function(res){
    if (res.error){
        assert.ok(1,1,'We recieved an error message');
    } else if (res.data){
        //log(res.data);
        //this event must received before event 1
        assert.ok(datas.length == 0,'IPC event2 received before event1');
        assert.equal(res.data.length,100);
    }
};


ev2.onExit = function(code){
    assert.strictEqual(code,255,'IPC Exit code 255');
};

process.on('exit',function(){
    var data = datas.split('\r\n');
    assert.equal(data[data.length - 2],10000);
});

test.plan(9);
