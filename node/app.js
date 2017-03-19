
 var http = require('http'), 
	 fs    = require('fs'),
	 url   = require('url'),
	 c=console,
	 socket=require('socket.io'),
   crypto=require('crypto'),
	 querystring = require('querystring'),
	 staticModule = require('./static_module'),
	 BaseMongodb = require('./base_mongodb'), 
     baseMongodb = new BaseMongodb(),
     formidable = require("formidable"),
     util=require("util"),
     globalres,
     globalreq,
	 BASE_DIR = __dirname.substring(0,__dirname.length-5);




var server=http.createServer(function(req, res) {
  globalres=res;globalreq=req;
	var pathname = url.parse(req.url).pathname;
	switch(pathname){
		case '/favicon.ico':res.end();break; 
		case '/':gotarget(res,req,'loginindex.html','index.html');break;
    case '/loginindex.html':gologinhtml(res,req,'loginindex.html');break;
    case '/loginindex':login(res,req,'index.html','common');break;     
    case '/index.html':gotarget(res,req,'loginindex.html','index.html');break;
    case '/upload':upload(res,req);break;
    case '/changeperson':changeperson(res,req);break;
    case '/up':up(res,req);break;
    case '/loginmanage.html':gologinhtml(res,req,'loginmanage.html');break;
    case '/loginmanage':login(res,req,'managementdata.html','manage');break;
		case '/managementdata.html':gotarget(res,req,'loginmanage.html','managementdata.html');break;
		default: staticModule.getStaticFile(pathname, res, req);break;
	}
})
server.listen(1337);
console.log('Server running at http://localhost:1337/');



var io = socket(server),
	nickname='',
	commonperson=[],//用户名单
	users={};//用户socket

baseMongodb.find('common', {},function(ret){
  for(var i=0,len=ret.length;i<len;i++){
     delete ret[i].password
  }
	commonperson=ret;
});

io.sockets.on('connection', function (socket) {

    socket.on('new user',function(data){
        nickname = data;
        users[nickname]= socket;     
  	});

    socket.on("getgrowperson",function(data){
      socket.emit('receivepersondata',commonperson)
    })

  	socket.on('getmydata',function(data){  		
  		getandemit('common','commonperson',socket);
  		if(!nickname)return;
    	getandemit(nickname,'personneldata',socket);
  	})

  	socket.on('getgrowdata',function(data){  		
  		getandemit('grow','receivegrowdata',socket);
  	}) 

    socket.on('getfocusdata',function(data){
        getandemit('common','focusperson',socket);  
        getandemit('grow','receivefocusdata',socket);
    })

    socket.on('getinformdata',function(data){  
        getandemit('inform','receiveinformdata',socket);
    })

    socket.on('getrecommenddata',function(data){  
        getandemit('recommend','receiverecommenddata',socket);
    })  

    //监听每个用户发送过来的消息,写入消息接收者数据库，并把接收到的消息发布到消息接收者客户端
    if(!commonperson.length)return;

	for(var i=0,length=commonperson.length;i<length;i++){
    if(commonperson[i].englishname=="public"){
      //处理群聊消息
      socket.on("public",function(data){
        //向在线人员除了消息发布者发布消息
          data.data.addclasson=false;
          for(key in users){
            if(key!=data.name){
              users[key].emit("publicclient",data);
            }
          }
          
          //把消息存入所有人的数据库
          for(var k=0;k<commonperson.length;k++){
              baseMongodb.find(commonperson[k].englishname, {'englishname':"public"}, (function (k) {
                var j=k;//利用闭包访问到对应的数字
                return function(ret){
                if(data.data.addclasson){data.data.addclasson=false;}
                if(commonperson[j].englishname==data.data.whosepicture){
                  data.data.addclasson=true;
                };
                if(!ret[0])return;
                ret[0].chat.push(data.data);
                baseMongodb.modify(commonperson[j].englishname,{'englishname':"public"},ret[0],function(result){
                  
                });
               }
              })(k)
             );
          }

      })
    }else {
		socket.on(commonperson[i].englishname, (function (i) {
			var j=i;//利用闭包访问到对应的数字
			return function(data){//socket的回调函数
				//把接收到的消息发布到消息接收者客户端
				data.data.addclasson=false;
				if(users[data.targetname]){
					users[data.targetname].emit(data.targetname+'client',data);
				}				
				
				//把消息存入消息发布者数据库
				baseMongodb.find(data.name, {'englishname':data.targetname},function(ret){
					if(!data.data.addclasson){data.data.addclasson=true;}
					if(!ret[0].chat)return;
					ret[0].chat.push(data.data);
					baseMongodb.modify(data.name,{'englishname':data.targetname},ret[0],function(result){
						
					});
				});
				
				//把消息存入接受者数据库
				baseMongodb.find(data.targetname, {'englishname':data.name},function(ret){
					if(data.data.addclasson){data.data.addclasson=false;}
					if(!ret[0].chat)return;
					ret[0].chat.push(data.data);
					baseMongodb.modify(data.targetname,{'englishname':data.name},ret[0],function(result){						
					});
				});		

			   }
	    	})(i)
	    );
    }
	} 
    
    management(socket);

    socket.on("localStorage",function(data){
      baseMongodb.find('common', {'name':data.name},function(ret){
        socket.emit("returnlocalStorage",ret[0])
      })
    })
});

//后台管理
function management(socket){
	socket.on("managementlogin",function(data){
        getandemit('common','managementgetpersondata',socket);
	})
	//增加用户
	socket.on('addperson',function(data){
		var  personlist=[],
			 o={
		          name:data.person.name,
		          englishname:data.person.englishname,
		          picture:data.person.picture,
		          password:data.person.password
	          };
	    //为旧用户添加新用户的聊天
	    baseMongodb.find('common', {},function(data){
	    	var obj={
					englishname:o.englishname,
					chat:[{ "time" :new Date().getTime(), "addclasson" : false, "text" : "欢迎和我聊天","whosepicture":o.englishname}]
				}
			for(var i=0,len=data.length;i<len;i++){
		    	baseMongodb.insert(data[i].englishname, obj, function(ret){
		    	});
	        }

            //把新用户添加到总名单，并为新用户创建数据库添加聊天记录
	        baseMongodb.insert('common', o, function(ret){
				baseMongodb.find('common', {},function(data){
					personlist=data;
					for(var i=0,len=personlist.length;i<len;i++){
						var who={
							englishname:personlist[i].englishname,
							chat:[{ "time" : new Date().getTime(), "addclasson" : false, "text" : "欢迎和我聊天","whosepicture":o.englishname }]
						}
						baseMongodb.insert(o.englishname, who, function(ret){
						});
					}
				});
		    });
	    })
       //为成长资料添加人名
        baseMongodb.insert('grow',data.grow, function(ret){
        })
	})
	//删除用户
	socket.on('deleteperson',function(data){
		var personenglishname=data.englishname;
		baseMongodb.find('common', {},function(ret){
      //删除每个人数据库与被删除人的聊天记录
			for(var i=0,len=ret.length;i<len;i++){
		    	baseMongodb.remove(ret[i].englishname, {englishname:personenglishname}, function(data){
		    			    		
		    	});
	        }
      //删除用户的表
			baseMongodb.remove(personenglishname, {}, function(ret){
			});
      //删除在用户名单上的人名
			baseMongodb.remove('common',{englishname:personenglishname}, function(ret){
			});
	    });
      //删除在grow表上用户的数据
      baseMongodb.remove("grow", {englishname:personenglishname}, function(ret){
      });
	})
	//修改用户名字
	socket.on('modifypersonname',function(data){
		var obj={$set:{name:data.name}};		
	    baseMongodb.modify('common', {englishname:data.englishname}, obj,function(data){
		});
	})

    //修改通知的消息
    socket.on('modifyinform',function(data){
        baseMongodb.modify('inform', {sorttime:data.sorttime}, data.data,function(data){
        });
    })
    //增加通知的消息
    socket.on('addinform',function(data){
        baseMongodb.insert('inform', data.data,function(data){
        });
    })
    //删除通知的消息
    socket.on('deleteinform',function(data){
        baseMongodb.remove('inform', {sorttime:data.sorttime},function(data){
        });
    })

    //删除推荐的消息
    socket.on('deleterecommend',function(data){
        baseMongodb.remove('recommend', {sorttime:data.sorttime},function(data){
        });
    })

    //删除点滴的消息
    socket.on('deletefocus',function(data){
        baseMongodb.modify('grow', {englishname:data.englishname},data,function(data){
        });
    })

    //修改密码
    socket.on('changemanagepassword',function(data){
        baseMongodb.modify('manage', {englishname:"teacher"},data,function(data){
         
        });
    })
    
}

function gologinhtml(res,req,html){
    var readPath = BASE_DIR + '/' +url.parse(html).pathname;
    var indexPage = fs.readFileSync(readPath);
    res.writeHead(200, { 
      'Content-Type': 'text/html' });
    res.end(indexPage);
}

function login(res,req,target,tablename){
  if(req.method.toLowerCase()!= 'post')return;
  var form=new formidable.IncomingForm();
    form.uploadDir=BASE_DIR;
    form.encoding="utf-8";
    form.parse(req, function(err, fields, files) {
      if(!fields.username)return;
      baseMongodb.find(tablename, {'name':fields.username},function(ret){
        if(!ret[0]){
          res.write('your name or password is wrong');
          res.end();
          return
        };
       
        if(ret[0].password==fields.password){
           res.writeHead(303, {
          'Location': 'http://localhost:1337/'+target,
          "Set-Cookie":'mycookie=lvshanmin666;path=/'+target,
          'Content-Type': 'text/html' });
          res.end();          
        }else{
          res.write('your name or password is wrong');
          res.end();          
        }
      })
    })
}
function gotarget(res,req,login,target){
   if(req.headers.cookie){
     var Cookies = {};
      req.headers.cookie.split(';').forEach(function( Cookie ) {
          var parts = Cookie.split('=');
          Cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
      });
      if(Cookies["mycookie"]!="lvshanmin666"){
        res.writeHead(303, {'Location': 'http://localhost:1337/'+login});
        res.end();
        return
      };
      var readPath = BASE_DIR + '/' +url.parse(target).pathname;
      var indexPage = fs.readFileSync(readPath);
      res.writeHead(200, { 
        'Content-Type': 'text/html' });
      res.end(indexPage);
   }else{
      res.writeHead(303, {'Location': 'http://localhost:1337/'+login});
      res.end();
    }
}    
		
	

function getandemit(tablename,targetname,socket){
	baseMongodb.find(tablename, {},function(ret){
		socket.emit(targetname,ret);
	});
}

function upload(res,req){
  if(req.method.toLowerCase()!= 'post')return;
  var form=new formidable.IncomingForm();
  form.uploadDir=BASE_DIR;
  form.encoding="utf-8";
  form.parse(req, function(err, fields, files) {
      var extName = '';  //后缀名
        switch (files.image.type) {
          case 'image/pjpeg':
            extName = '.jpg';
            break;
          case 'image/jpeg':
            extName = '.jpg';
            break;       
          case 'image/png':
            extName = '.png';
            break;
          case 'image/x-png':
            extName = '.png';
            break;       
        }

        if(extName.length == 0){
            res.write('只支持png和jpg格式图片');
            res.end();
            return;                
        }
      var photo=getletter()+extName;
      var obj={
          "title":fields.title,
          "detail":fields.detail,
          "sorttime":new Date().getTime(),
          "link":fields.link,
          "photo": "image/"+photo
      }
     
      if(fields.type=="修改"){       
        baseMongodb.modify('recommend', {sorttime:parseInt(fields.sorttime)}, obj,function(data){
        });           
      }else if(fields.type=="增加"){
        baseMongodb.insert('recommend', obj,function(data){
        });
      }
      fs.renameSync(files.image.path,BASE_DIR+"/image/"+photo);
      var readPath = BASE_DIR + '/' +url.parse('submit.html').pathname;
      var indexPage = fs.readFileSync(readPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexPage);
    });
}

function up(res,req){
  if(req.method.toLowerCase()!= 'post')return;
  var form=new formidable.IncomingForm();
  form.uploadDir=BASE_DIR;
  form.encoding="utf-8";
  form.parse(req, function(err, fields, files) {
    var obj;
    fields.data=JSON.parse(fields.data);
    if(files.image.size){
      var extName = '';  
        switch (files.image.type) {
          case 'image/pjpeg':
            extName = '.jpg';
            break;
          case 'image/jpeg':
            extName = '.jpg';
            break;       
          case 'image/png':
            extName = '.png';
            break;
          case 'image/x-png':
            extName = '.png';
            break;       
        }

        if(extName.length == 0){
            res.write('只支持png和jpg格式图片');
            res.end();
            return;                
        }
      var photo=getletter()+extName;
        obj={
              "englishname":fields.data.englishname,
              "photo":"/image/"+photo,
              "grow":fields.data.grow
          }
          fs.renameSync(files.image.path,BASE_DIR+"/image/"+photo);
      }else{
        obj={
          "englishname":fields.data.englishname,
          "photo":fields.data.photo,
          "grow":fields.data.grow
        }
      }
    baseMongodb.modify('grow', {englishname:obj.englishname}, 
      obj,function(data){      
    });     
      
      var readPath = BASE_DIR + '/' +url.parse('submit.html').pathname;
      var indexPage = fs.readFileSync(readPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexPage);
    });
}

function changeperson(res,req){
  if(req.method.toLowerCase()!= 'post')return;
  var form=new formidable.IncomingForm();
  form.uploadDir=BASE_DIR;
  form.encoding="utf-8";
  form.parse(req, function(err, fields, files) {
    var obj;
    fields.data=JSON.parse(fields.data);
    if(files.image.size){
      var extName = '';  
        switch (files.image.type) {
          case 'image/pjpeg':
            extName = '.jpg';
            break;
          case 'image/jpeg':
            extName = '.jpg';
            break;       
          case 'image/png':
            extName = '.png';
            break;
          case 'image/x-png':
            extName = '.png';
            break;       
        }

        if(extName.length == 0){
            res.write('只支持png和jpg格式图片');
            res.end();
            return;                
        }
      var photo=getletter()+extName;
        obj={$set:
              {
              "name":fields.data.name,  
              "picture":"/image/"+photo,
              "password":fields.data.password
              }
          }
        fs.renameSync(files.image.path,BASE_DIR+"/image/"+photo);
      }else{
        obj={$set:
              {
              "name":fields.data.name,
              "password":fields.data.password
              }
          }
      }
    baseMongodb.modify('common', {englishname:fields.data.englishname}, obj,function(data){
       console.log(data)
    });     
      
      var readPath = BASE_DIR + '/' +url.parse('indexsubmit.html').pathname;
      var indexPage = fs.readFileSync(readPath);
      res.writeHead(200, {
        "Set-Cookie":'mycookie=666;path=/index.html', 
        'Content-Type': 'text/html' });
      res.end(indexPage);
    });
}

function getletter(){
    var englishletter="abcdefghijklmnopqrstuvwsyz",addletter='';
    for(var i=0;i<10;i++){
      var index=Math.floor(Math.random()*26);
      addletter+=englishletter[index];
    }
    return addletter;
  }




/*

var manage={"name":"班主任","password":"e10adc3949ba59abbe56e057f20f883e","englishname":"teacher"};
c.log(manage);
baseMongodb.insert('manage',manage, function(ret){
  c.log(ret)
  });


var obj=[
{"name":"张三","englishname":"dashu","picture":"image/boy.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"李四","englishname":"situ","picture":"image/girl.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"群聊","englishname":"public","picture":"image/haha.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"英语老师","englishname":"english","picture":"image/english.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"数学老师","englishname":"math","picture":"image/math.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"班主任","englishname":"chinese","picture":"image/chinese.png","password":"e10adc3949ba59abbe56e057f20f883e"},
{"name":"吕善敏","englishname":"lvshanmin","picture":"image/head.jpg","password":"e10adc3949ba59abbe56e057f20f883e"}
]
for(var i=0;i<obj.length;i++){
	baseMongodb.insert('common', obj[i], function(ret){
	});
}

var min=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,
        "addclasson":true,
        "whosepicture":"lvshanmin",
        "text":"善敏"
        },{
            "time":1459404110461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"你好靓仔"
        }]
},{
    "englishname":"situ",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434010461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"您好"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"您好"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<min.length;i++){
	baseMongodb.insert('lvshanmin', min[i], function(ret){
	});
}

var pub=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"public",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434110412,
            "whosepicture":"public",
            "addclasson":true,
            "text":"您好"
        }]
},{
    "englishname":"situ",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"public",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434110476,
            "whosepicture":"public",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"public",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434110409,
        "whosepicture":"public",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,
        "whosepicture":"public",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,
            "whosepicture":"public",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"lvshanmin",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"lvshanmin",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"piblic",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"piblic",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"piblic",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"piblic",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<pub.length;i++){
  baseMongodb.insert('public', pub[i], function(ret){
  });
}

var shu=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"dashu",
        "addclasson":true,
        "text":"大叔"
        },{
            "time":1459434110661,        
        "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"situ",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"dashu",
        "addclasson":true,
        "text":"大叔"
        },{
            "time":1459434115561,        
        "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"dashu",
        "addclasson":true,
        "text":"大叔"
        },{
            "time":1459434110471,        
        "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"dashu",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,        
        "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"dashu",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"dashu",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"dashu",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"dashu",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<shu.length;i++){
	baseMongodb.insert('dashu', shu[i], function(ret){
	});
}


var tu=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"situ",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110461,         
        "whosepicture":"situ",
            "addclasson":true,
            "text":"哈哈"
        }]
},{
    "englishname":"situ",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"situ",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110466,        
        "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"situ",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110469,        
        "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"situ",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,        
        "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"situ",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"situ",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"situ",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"situ",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<tu.length;i++){
	baseMongodb.insert('situ', tu[i], function(ret){
	});
}

var english=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"english",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110461,         
        "whosepicture":"english",
            "addclasson":true,
            "text":"哈哈"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"english",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110466,        
        "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"english",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110469,        
        "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"english",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,        
        "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"english",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"english",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"english",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"english",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<english.length;i++){
  baseMongodb.insert('english', english[i], function(ret){
  });
}

var chinese=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"chinese",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110461,         
        "whosepicture":"chinese",
            "addclasson":true,
            "text":"哈哈"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"chinese",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110466,        
        "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"chinese",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110469,        
        "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"chinese",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,        
        "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"chinese",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"chinese",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"chinese",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"chinese",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"chinese",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<chinese.length;i++){
  baseMongodb.insert('chinese', chinese[i], function(ret){
  });
}
var math=[{
    "englishname":"dashu",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"math",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110461,         
        "whosepicture":"math",
            "addclasson":true,
            "text":"哈哈"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"math",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110466,        
        "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"lvshanmin",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"math",
        "addclasson":true,
        "text":"司徒"
        },{
            "time":1459434110469,        
        "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"public",
    "chat":[{
        "time":12333333333333,        
        "whosepicture":"math",
        "addclasson":true,
        "text":"善敏"
        },{
            "time":1459434120461,        
        "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"math",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"english",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"math",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
},{
    "englishname":"math",
    "chat":[{
        "time":12333333333333,
            "whosepicture":"math",
        "addclasson":true,
        "text":"您好"
        },{
            "time":1459434120461,
            "whosepicture":"math",
            "addclasson":true,
            "text":"展示内容"
        }]
}]


for(var i=0;i<math.length;i++){
  baseMongodb.insert('math', math[i], function(ret){
  });
}

var inform=[{
    "list":"【本科教学】专业课和互开课清考报名通知",
    "title":"【本科教学】专业课和互开课清考报名通知",
    "sorttime":new Date().getTime()-2,
    "year":"2016",
    "month":"03",
    "date":"30",
    "call":"各位同学",
    "content":["你们好！针对毕业班，公共课的清考已经安排完成，专业课和互开课的清考正式通知，请各位同学报名（填写附件，回复我邮件）。清考只针对闭卷考试科目，关于考察、实验、实践类型课程请自己联系老师重修。专业课和胡开课清考安排如下："
                ,"（1）15-16（2）学期没有开课的课程具备清考，清考没有平时分。请同学们按照以下课程报名，如果特别情况或者没有的课程在备注中填写。"
                ,"（2）国防生需要清考和重修的科目都安排在4月清考时间考试，请国防生报名，请在名字后面添加括号备注为国防生。"
                ],
    "school":"华南师范大学"
    },
    {
    "list":"关于2015-2016学年度获奖名单公示",
    "title":"关于2015-2016学年度信息光电子科技学院2012级综合测评获奖名单公示",
    "sorttime":new Date().getTime()-5,
    "year":"2016",
    "month":"03",
    "date":"29",
    "call":"各位同学",
    "content":["为激励广大学生勤奋进取、刻苦钻研、奋发成才，根据《华南师范大学全日制本科学生学年评优奖励办法》与《信息光电子科技学院2012级综合测评条例（2016版）》我级决定展开2015-2016年度校优秀学生标兵、校优秀学生、校优秀学生干部以及校各单项积极分子的评优工作。"
                ,"经过评优小组和级委们的辛勤努力，评优工作已经圆满完成，现公示获奖名单(见附件)，公示时间从2016年3月28日到3月30日。对名单有异议者，请致电年学习委员潘思敏反映情况。"                
                ],
    "school":"华南师范大学信息光电子科技学院"
    },{
    "list":"关于做好2015-2016学年度信息光电子科技学院2012级综合测评工作的通知",
    "title":"关于做好2015-2016学年度信息光电子科技学院2012级综合测评工作的通知",
    "sorttime":new Date().getTime()-10,
    "year":"2016",
    "month":"03",
    "date":"22",
    "call":"各位同学",
    "content":[" 为激励广大学生勤奋进取、刻苦钻研、奋发成才，根据《华南师范大学全日制本科学生学年评优奖励办法》与《信息光电子科技学院2012级综合测评条例（2016版）》我级决定展开2015-2016年度校优秀学生标兵、校优秀学生、校优秀学生干部以及校各单项积极分子的评优工作。"
                ," 校优秀学生标兵、校优秀学生、校优秀学生干部以及校各单项积极分子的评选范围、评选条件、评选名额和比例以及评选程序严格按照《信息光电子科技学院2012级综合测评条例（2016版）》的具体规定。"
                ,"各项申报材料的纸质版请务必在3月22日中午12:00前交至各班班长，同时将《光电学院2016学生综合测评表》电子版发至各班班长邮箱，各班班长汇总后请发至邮箱460414416@qq.com，处逾期不再受理。"
                ],
    "school":"华南师范大学"
    }
]


for(var i=0;i<inform.length;i++){
    baseMongodb.insert('inform', inform[i], function(ret){
    });
}

var recommend=[{
    photo:'image/bg1.jpg',
    title:'迎接高考',
    sorttime:new Date().getTime()-10,
    detail:'生命不息，奋斗不止',
    link:"http://gk.canpoint.cn/"
},{
    photo:'image/bg2.jpg',
    title:'教学资源网',
    sorttime:new Date().getTime()-5,
    detail:'获取更多优秀学习资料',
    link:"http://www.jb1000.com/"
},{
    photo:'image/bg3.jpg',
    title:'关注留守儿童',
    sorttime:new Date().getTime()-2,
    detail:'哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈',
    link:"http://localhost:1337/managementdata.html"
}
]
for(var i=0;i<recommend.length;i++){
    baseMongodb.insert('recommend', recommend[i], function(ret){
    });
}

var grow=[{
    "photo":"image/bg1.jpg",
    "englishname":"situ",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
 }, {
    "englishname":"dashu",    
    "photo":"image/bg2.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
 }, {
    "englishname":"lvshanmin",
    "photo":"image/bg3.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
}, {
    "englishname":"public",
    "photo":"image/bg3.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
}, {
    "englishname":"english",
    "photo":"image/bg3.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
}, {
    "englishname":"chinese",
    "photo":"image/bg3.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
}, {
    "englishname":"math",
    "photo":"image/bg3.jpg",
    "grow":[{
            "week":"第一周",
            "exam":"第一周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第二周",
            "exam":"第二周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第三周",
            "exam":"第三周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第四周",
            "exam":"第四周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第五周",
            "exam":"第五周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        },{
            "week":"第六周",
            "exam":"第六周哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "homework":"哈哈哈哈哈哈哈哈哈",
            "behavior":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈和",
            "moral":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "communication":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈",
            "access":"哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈哈"
        }]
}]

for(var i=0;i<grow.length;i++){
    baseMongodb.insert('grow', grow[i], function(ret){
        c.log(ret);
    });
}

*/