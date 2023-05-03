# 文件说明：
    app.js-----------主服务器
    prxy-fonf.js-----主服务器的配置文件
    banned_list------服务器黑名单
    brouser.html-----测试文件，主要测试mime
    ChristmasAll.jpg-brouser.html依赖文件
    server.js--------修改前的cdn源代码
    master.js--------版本管理用文件
    package-lock.json,yarn.lock,package.json都是npm管理依赖使用的文件
# 部署方式：
    1. 进入此文件夹之后运行
    ```shell
    npm install
    ```
    或者
    ```shell
    yarn install
    ```
    2. 配置proxy-conf.js
    config对象中键应为字符串兴，表示对应api中的标记
    值应为一个对象，键为target，值为对应的url
    3. 运行
    ```shell
    node app.js
    ```
# app.js工作原理：
    工具函数：
    getClientIp(req)：获取来访请求的ip
    getstat(request)：readpara(request)旧版本中对身份确认的处理函数，现已经弃用
    proxy(opt,res,req)：根据opt中的设定向真实服务器发送请求
    allowacess()：完成了对静态文件的处理
    
    特别说明：
    20：由于readpara(request)中的一些bug反复折腾我，于是再0.13版本中直接使用了querystring和urlread库来一劳永逸的解决了url中参数获取的问题，欸嘿。

    107：根据http协议的规定，重定向分为301永久重定向和302临时重定向，感觉这都不太合适因为这是不论怎样都重定向，不管了，反正我相信没有搜索引擎蜘蛛会介意

    目前正在完善服务器对POST请求的代理，由于特殊的验证机制使post请求无法使用原来的cdn方式进行代理，正在尝试使用闭包来解决这个问题（ah，又要和垃圾回收做战斗了

    其他小细节请参考源代码中的注释
