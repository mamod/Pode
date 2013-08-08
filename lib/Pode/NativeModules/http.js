var binding = process.binding('HTTP')
  , BUtils = process.binding('Utils')
  , EE = require('events').EventEmitter
  , util = require('util')
  , path = require('path')
  , mime = require('mime');

var responseCodeText = {
    100: 'Continue',
    101: 'Switching Protocols',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    307: 'Temporary Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required', // note RFC says reserved for future use
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Request Entity Too Large',
    414: 'Request-URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Request Range Not Satisfiable',
    417: 'Expectation Failed',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not SUpported'
};


var defaultOptions = {
    port : 80,
    host : '127.0.0.1'
};

function noob (){}

exports.run = function(options,callback){
    //check callback and fall to noob if it doesn't exists
    if (!callback && typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    util.extend(options,defaultOptions);
    
    var cb;
    if (typeof callback === 'function'){
        cb = callback;
    } else {
        cd = noob;
    }
    
    //create server object
    var server = new Server();
    //start server
    
    binding.start(options);
    process.setEvent(function(){
        var fd = binding.loop();
        
        //we got a ready socket
        if (fd){
            //construct Response & Request objects
            var request = new Request(server);
            var response = new Response(fd,server,request);
            
            server.request = request;
            server.response = response;
            
            //unblocing chunk reading
            var sock = process.setEvent(function(){
                var content = binding.read(fd, 4 * 1024);
                //reading done
                if (!content || content === -1){
                    request.parse();
                    cb(request,response);
                    //don't watch anymore
                    clearEvent(sock);
                } else {
                    request.addChunck(content);
                }
            });
            
            //if no timeout already set
            if (!server._timeout){
                response._timeout = setTimeout(function(){
                    clearEvent(sock);
                    response.close();
                    //response.end('too long');
                },5000);
            } else {
                response._timeout = setTimeout(server._timeout.cb,server._timeout.ms);
            }
        }
    });
    return server;
};

//============================[ Server Object ]================================
util.inherits(Server, EE);
function Server () {
    EE.call(this);
}

Server.prototype.setTimeout = function (fn,ms){
    this._timeout = {
        ms : ms,
        cb : fn
    }
}

//============================[ Request Object ]================================
util.inherits(Request, EE);
function Request (server){
    EE.call(this);
    this.content = '';
    this.cookies = {};
    this._server = server;
}

Request.prototype.addChunck = function(chunk){
    this.content += chunk;
    this._server.emit('request',chunk);
}

//HTTP parser
function HTTParser (content) {
    var split = content.split('\r\n\r\n',2)
      , headers = split[0]
      , body = split[1]
      , parsedHeaders = {}
      , hdrs = headers.split('\r\n')
      , status = hdrs.shift();
    
    var firstline = status.split(' ')
      , method = firstline[0] || 'GET'
      , uri = firstline[1] || ''
      , proto = firstline[2] || '';
    
    for (var i = 0; i < hdrs.length; i++){
        var hr = hdrs[i]
          , kv = hr.split(': ',2)
          , key = kv[0]
          , value = kv[1];
        
        parsedHeaders[key.toLowerCase()] = value;
    }
    
    var uriParts = uri.split('?'),
    path = uriParts[0],
    queryString = uriParts[1] || '';
    
    return {
        proto : proto,
        uri : uri,
        path : path,
        queryString : queryString,
        method : method,
        headers : parsedHeaders,
        body : body
    };
}

Request.prototype.parse = function(){
    var req = this,
    parse = HTTParser(this.content),
    headers = this.headers = parse.headers;
    
    this.method = parse.method;
    this.uri = parse.uri;
    this.path = parse.path;
    var query = this.queryString = parse.queryString;
    this.proto = parse.proto;
    
    this.keepAlive = this.headers['connection'] === 'keep-alive';
    this.httpVersion = parse.proto.split('/')[1];
    this.post = {};
    var data = {};
    if (headers['cookie']) {
        try {
            headers['cookie'].split(/;\s*/).each(function(key,cookie) {
                var cookieParts = cookie.split('=');
                req.cookies[cookieParts[0]] = data[cookieParts[0]] = decodeURIComponent(cookieParts[1].replace(/\+/g, ' '));
            });
        } catch (e) {/*nothing*/}
    }
    
    req.queryParams = {};
    if (query) {
        query.split('&').each(function(key,part) {
            part = part.split('=');
            try {
                req.queryParams[part[0]] = data[part[0]] = decodeURIComponent(part[1].replace(/\+/g, ' '));
            } catch (e) {/*nothing*/}
        });
    }
    
    var host = this.headers.host;
    if (host){
        var hostParts = host.split(':');
        this.host = hostParts[0];
        this.port = hostParts[1] || 80;
    }
    
    if (parse.body){
        this.hasBody = true;
        this.body = parse.body;
    } else {
        this.hasBody = false;
    }
    
    //parse post data
    var contentLength = headers['content-length'];
    if (contentLength){
        var contentType = headers['content-type'];
        var post = req.body || '';
        if (contentType && contentType.toLowerCase().indexOf('multipart/form-data') != -1) {
            
        } else if (contentType && contentType.match(/^application\/x-www-form-urlencoded/i)){
            post.split('&').each(function(key,part) {
                part = part.split('=');
                var part1 = part[1] || '';
                req.post[part[0]] = data[part[0]] = (function(){
                    try {
                        return decodeURIComponent(part1.replace(/\+/gm, ' '));
                    } catch (e){
                        var t = decodeURIComponent(escape(part1.replace(/\+/gm, ' ')));
                        return unescape(t);
                    }
                })();
            });
        }
    }
    
    req.data = data;
    //no more needed
    delete this.content;
    this._server.emit('request-complete',this);
}

Request.prototype.getCookie = function(str){
    return this.cookies[str];
};

Request.prototype.param = function(str) {
    if (!this.queryParams) return null;
    return this.queryParams[str] || this.post[str];
}

Request.prototype.postParam = function(str) {
    if (!this.post) return null;
    return this.post[str];
}

Request.prototype.header = function(str) {
    if (!this.headers) return null;
    return this.headers[str];
}

//============================[ Response Object ]===============================
function Response (fd,server,request) {
    this._server = server;
    this.headersSent = false;
    this.request = request;
    util.extend(this,{
        sock: fd,
        status: 200,
        contentLength: 0,
        contentType: 'text/html',
        cookies: {},
        headers: {
            Server: 'Perl-js Server'
        },
        data: ''
    });
}

Response.prototype.write = function (data){
    this.data += data;
};

//chunck encoding
Response.prototype.writeChunk = function (data){
    
};

Response.prototype.flush = function(){
    var data = this.data
      , sock = this.sock
      , req = this.request;
    
    if (!this.headersSent){
        this.contentLength = data.length;
        this.sendHeaders();
    }
    binding.write(sock, data, data.length);
};

Response.prototype.end = function (content){
    //is it already closed
    if (this._closed) return;
    clearTimeout(this._timeout);
    this._closed = true;
    if (content){
        this.data = content;
    }
    this.flush();
    binding.end(this.sock);
};

Response.prototype.close = function (){
    if (this._closed) return;
    clearTimeout(this._timeout);
    this._closed = true;
    binding.end(this.sock);
};

Response.prototype.timeout = function (callback,ms){
    clearTimeout(this._timeout);
    this._timeout = setTimeout(callback,ms);
    return this._timeout;
};

Response.prototype.setCookie = function(key, value, expires, path, domain) {
    
    var cookie = {
        value: value
    };
    
    if (expires) {
        expires = Util.isDate(expires) ? expires.toGMTString() : expires;
        cookie.expires = expires;
    }
    
    if (path) {
        cookie.path = path;
    }
    
    if (domain) {
        cookie.domain = domain;
    }
    
    this.cookies[key] = cookie;
};

Response.prototype.setHeader = function (key,value) {
    this.headers[key] = value;
};


Response.prototype.sendFile = function(f){
    //is this file exists?
    var file = path.resolve(f);
    if (BUtils.isFile(file)){
        this.status = 200;
        this.contentType = mime.mimeType(file);
        this.contentLength = BUtils.fileSize(file);
        this.sendHeaders();
        binding.sendFile(this.sock,file);
        this.close();
    } else {
        this.status = 404;
        this.write('Not Found');
        this.end();
    }
};

Response.prototype.redirect = function(uri){
    this.status = 302;
    var req = this.request;
    var base = 'http://' + req.host;
    if (req.port != 80) {
        base += ':' + req.port;
    }
    
    this.setHeader('Location', base + uri);
    this.end();
};

Response.prototype.sendHeaders = function() {
    
    var res = this
      , req = this.request;
    
    if (!this.headersSent) {
        this.headersSent = true;
        var out = '';
        out += req.proto + ' ' + res.status + ' ' + responseCodeText[res.status] + '\r\n';
        out += 'Date: ' + new Date().toGMTString() + '\r\n';
        res.headers.each(function(key, value) {
            out += key +': ' + value + '\r\n';
        });
        
        res.cookies = res.cookies || {};
        res.cookies.each(function(key,cookie) {
            out += 'Set-Cookie: ' + key + '=' +encodeURIComponent(cookie.value);
            if (cookie.expires) {
                out += '; Expires='+cookie.expires;
            }
            if (cookie.path) {
                out += '; Path='+cookie.path;
            }
            if (cookie.domain) {
                out += '; Domain='+encodeURIComponent(cookie.domain);
            }
            out += '\r\n';
        });
        
        out += 'Content-Type: ' + res.contentType + '\r\n';
        out += 'Content-Length: ' + res.contentLength + '\r\n\r\n';
        binding.write(res.sock, out, out.length);
    }
};
