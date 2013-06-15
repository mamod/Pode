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


var pl = path.resolve(__dirname + '/test.pl');
var ev = EV.run(binding.fork,'perl',[pl,'First']);
var datas = '';
ev.on('data',function(res){
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
    
});

ev.on('end',function(code){
    assert.strictEqual(2,code);
});

process.on('exit',function(){
    var data = datas.split('\r\n');
    assert.equal(data[data.length - 2],10000);
});

test.plan(5);
//test.done();
