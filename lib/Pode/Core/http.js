//print(process.NativeModules['Server']);

var serv = process.bindings('Server');

var http = module.exports;

http.portListen = undefined;
http.callBack = undefined;

var response = {
    headers : {
        status : 200
    },
    status : function(code){
        this.headers.status = code;
    },
    content_type : '',
    write : function(data){
        serv.write({
            "header" : response.headers,
            "body" : data
        },function(obj){
            //http.callBack(response,obj);
        });
    }
};



http.Server = function(fun){
    
    http.callBack = fun;
    return http;
}

http.listen = function(port){
    http.portListen = port;
}


http.run = function(){
    //while(1){
        serv.run('mm',function(req){
            http.callBack(req,response);
            http.run();
        });
    //}
}