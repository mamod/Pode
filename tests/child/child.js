process.on('message', function(m) {
  console.log('CHILD got message:', m.hello);
});

setInterval(function(){
process.send({ foo: 'bar' });
console.log('DDDDDD');
},100);
