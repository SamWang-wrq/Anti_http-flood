//let { Worker, isMainThread } = require('worker_threads');
let http  = require('http')
let fs = require('fs')
let conifg = require('./proxy-conf');
const urlread=require("url");
const querystring=require('querystring');


//url处理方法
//const url=urlread.parse(request.url).query
//console.log("姓名："+querystring.parse(url).stat);




//new Worker("./server.js");=>这样就创建了一个新thread但是好像没必要因为node本身自带强大的异步I/O


//前期函数
function readpara(request){
	var url = request.url;
	url=url.split('?');
	if (url.length==2){
		url=url[1];
		url=url.split('&');
		var query={};
		for(let i=0;i<url.length;i++){
			var this_query=url[i].split('=');
			query[this_query[0]]=this_query[1];
		}
	}
	else{
		var query={};
	}
	return query;
}
	//debug完成，处理参数的函数
function getstat(request){
	var url = request.url;
	if (url.split('stat').length==1){
		return false
	}
	else{
		return true
	}
}



	
function getClientIp(req) {
	    var ipAddress;
	    var forwardedIpsStr = req.headers['X-Forwarded-For'];//判断是否有反向代理头信息
	    if (forwardedIpsStr) {//如果有，则将头信息中第一个地址拿出，该地址就是真实的客户端IP；
	        var forwardedIps = forwardedIpsStr.split(',');
	        ipAddress = forwardedIps[0];
	    }
	    if (!ipAddress) {//如果没有直接获取IP；
	        ipAddress = req.connection.remoteAddress;
	    }
	    return ipAddress;
	};
	//ip处理完成
function generateIPkey(ipkeys,ip){
	var currentkey=String(Math.trunc(1000*Math.random()));
	ipkeys[ip]=currentkey;
	return currentkey
}
//生成随机key函数完成


//变量声明
var ipkeys={};
var banned={};
var opts={};


//主服务器
let app=http.createServer(function(request,response){

	if(typeof(banned[getClientIp(request)])=="undefined"){
		if(request.url!='/favicon.ico'){
			console.log(request);
			//var this_query=readpara(request);
			var this_query=querystring.parse(urlread.parse(request.url).query);
			if(typeof(this_query.stat)=="undefined"){//处理第一次连接的情况
				var this_key = generateIPkey(ipkeys,getClientIp(request));


				var url=request.url
				for ( var key in conifg){
					if( url.indexOf(key) >-1 ){
						let info = conifg[key].target.split(':')
						opts[getClientIp(request)]={
							protocol: info[0]+':',
							host:    info[1].slice(2),
							port:    info[2] || 80,
							method:  request.method,//这里是发送的方法
							path:    url,    //这里是访问的路径
							json: true,
							headers: request.headers
						}
					}
		
				}
				
				response.writeHead(302,{"Location":"?stat=0&key="+this_key+"&headers="+request.headers+"&method="+request.method+"&url="+request.url});
				//response.end("<script>location.href='http://127.0.0.1:8080/?stat=0&key="+this_key+"&url="+request.url+"'</script>");
				response.end();
				
				console.log("there's a first time");
			}
			
			else if (this_query.stat==0){
				//处理第二次连接：1.判断数字是否正确，2.不正确屏蔽
				if(this_query.key==ipkeys[getClientIp(request)]){//判断key是否相同
					console.log("good boy");
					delete ipkeys[getClientIp(request)];
					//console.log(request_cach)
					//allowacess(request_cach[getClientIp(request)],response,this_query);--想
					allowacess(request,response,this_query,opts[getClientIp(request)]);
					console.log("delivered-finished");
				}
				else{
					//屏蔽这个ip
					banned[getClientIp(request)]=1;
					console.log("sth bad happened........")
				}
			}
		}
	}
	else{
		console.log("sb. that got banned tried to enter.....")
	}
})
app.listen(8080);






//以下为代理转发需要使用的函数：
function allowacess(request,response,this_query,opt){
    let url = request.url
	//console.log(url)
    if(request.url!=='/favicon.ico'){//清除第二次访问
        //请求的数据是否存在代理
        for ( var key in conifg){
            if( url.indexOf(key) >-1 ){
                let info = conifg[key].target.split(':')
                proxy( opt, response,request)//代理方法
                return;
            }

        }
        //正常的读取文件和其他资源加载
        fs.readFile( __dirname + ( url==='/' ? '/index.html':url ), function( err, data ){
            if( err ){
                console.log( 'file-err',err )
				response.end("<h1>404 NOT FOUND!!!</h1>")
            }else{
                console.log(data)
                response.end( data )
            }
        });
    }
}
//代理转发的方法
function proxy( opt,res ,req){
	console.log("proxy starting.....");
	console.log(opt);

    var proxyRequest = http.request(opt, function(proxyResponse) { //代理请求获取的数据再返回给本地res
		console.log("sent the request you required to the server");
        proxyResponse.on('data', function(chunk) {
            //console.log( chunk.toString('utf-8') )//打印真实服务器发送过来的数据-就是控制台里的乱码..
			console.log("yep there's data all right");
			res.write(chunk, 'binary');
        });
        //当代理请求不再收到新的数据，告知本地res数据写入完毕。
        proxyResponse.on('end', function() {
            res.end();
        });
        res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
    }); 
    
    //data只有当请求体数据进来时才会触发
    //尽管没有请求体数据进来，data还是要写，否则不会触发end事件
    req.on('data', function(chunk) {
        console.log('in request length:', chunk.length);
        proxyRequest.write(chunk, 'binary');
    });

    req.on('end', function() {
        //向proxy发送求情，这里end方法必须被调用才能发起代理请求
        //所有的客户端请求都需要通过end来发起
        proxyRequest.end();
    });
    
}

//setInterval(()=>{
//	fs.writeFile('./banned_list.json',JSON.stringify(banned),ress=>{console.log('yeee')})
//},1000)
