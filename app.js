let { Worker, isMainThread } = require('worker_threads');
let http  = require('http')
let fs = require('fs')
let conifg = require('./proxy-conf');
const urlread=require("url");
const querystring=require('querystring');


//url处理方法
//const url=urlread.parse(request.url).query
//console.log("姓名："+querystring.parse(url).stat);

// 以异步回调方式进行调用 




//new Worker("./show.js");//这样就创建了一个新thread但是好像没必要因为node本身自带强大的异步I/O


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


//主服务器
let app=http.createServer(function(request,response){
	if(typeof(banned[getClientIp(request)])=="undefined"){//判断当前ip是否已经被屏蔽
		if(request.url!='/favicon.ico'){
			var this_query=querystring.parse(urlread.parse(request.url).query);//获取当前url中的参数
			if(typeof(this_query.stat)=="undefined"){//处理第一次连接的情况
				var this_key = generateIPkey(ipkeys,getClientIp(request));//生成临时key
				response.writeHead(302,{"Location":"?stat=0&key="+this_key+"&url="+request.url})//进行重定向
				response.end()
			}
			else if (this_query.stat==0){//处理第二次连接的情况
				if(this_query.key==ipkeys[getClientIp(request)]){//返回的数字是否是刚才生成的随机key
					delete ipkeys[getClientIp(request)];//销毁随key
					allowacess(request,response,this_query);//向服务器获取请求的内容并返回
				}
				else{
					banned[getClientIp(request)]=1;//屏蔽这个ip
					console.log("sb. got banned........")
				}
			}
		}
	}
	else{//被屏蔽ip的处理
		console.log("sb. that got banned tried to enter.....")
		response.end("you are banned");
	}
})
app.listen(8080);






//以下为代理转发需要使用的函数：
function allowacess(request,response,this_query){
    let url = this_query.url
	console.log(url)
    if(request.url!=='/favicon.ico'){//清除第二次访问
        //请求的数据是否存在代理
        for ( var key in conifg){
            if( url.indexOf(key) >-1 ){
                let info = conifg[key].target.split(':')
                let opt = {
                    protocol: info[0]+':',
                    host:    info[1].slice(2),
                    port:    info[2] || 80,//端口无特殊设置默认80
                    method:  request.method,//这里是发送的方法
                    path:    url,     //这里是访问的路径
                    json: true,
                    headers: request.headers
                }
                proxy( opt, response,request )//代理方法
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
    var proxyRequest = http.request(opt, function(proxyResponse) { //代理请求获取的数据再返回给本地res
        proxyResponse.on('data', function(chunk) {
            console.log( chunk.toString('utf-8') )//打印真实服务器发送过来的数据-就是控制台里的乱码..
			res.write(chunk, 'binary');
			res.write("<h1>hi!!</h1>");//url还原
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

setInterval(()=>{//每隔1s讲当前屏蔽列表写入磁盘
	fs.writeFile('./banned_list.json',JSON.stringify(banned),ress=>{console.log('yeee')})
},1000)
