app.controller("innerctrl",["$scope",function ($scope) {
    $scope.username=localStorage["username"];
    $scope.picture=localStorage["picture"];
    $scope.hadbut=false;
    $scope.show={
        chat:{bool:true,text:"联系人"},
        focus:{bool:false,text:"关注孩子点滴"},
        recommend:{bool:false,text:'教师推荐'},
        inform:{bool:false,text:'事务通知'}
    }
    $scope.changeclass=function(target){
          for(i in $scope.show){
            $scope.show[i].bool=false;
          }
          target.bool=true;
    }
    
    socket.emit('new user',$scope.username);
}])

app.controller("chatctrl",["$scope","$filter","getdataservice",function($scope,$filter,getdataservice){
  $scope.now=new Date();
  $scope.chatdata;//聊天消息数据
  $scope.chatingdata;//正在聊天对象的消息数据
  $scope.chinesedata;//排序用的消息数据
  $scope.once=1;//第一个指令
  $scope.ischating=true;
  $scope.ispersonlist=false;
  $scope.temporarychatdata;  
  $scope.chinesenamedata;
  $scope.getdata=function(){

        //接受他人发送过来的数据
        socket.on($scope.username+"client",function(data){
            $scope.chatdata[$filter('getpersonindex')($scope.chatdata,data.name)].chat.push(data.data);
            $scope.$digest();
            setTimeout(function(){
              $('.chat-right-mid').scrollTop(document.getElementById('chat-right-mid').scrollHeight);
            },100);
          })

        socket.on("publicclient",function(data){
            $scope.chatdata[$filter('getpersonindex')($scope.chatdata,"public")].chat.push(data.data);
            $scope.$digest();
            setTimeout(function(){
              $('.chat-right-mid').scrollTop(document.getElementById('chat-right-mid').scrollHeight);
            },100);
          })
     
       //用户名单
      socket.on('commonperson',function(data){
        var i=$filter('getpersonindex')(data,$scope.username);
        data.splice(i,1);
        $scope.$apply(function(){
          $scope.chinesenamedata=data;
        }) 
      })
      //个人用户聊天数据
      socket.on('personneldata',function(data){
        $scope.$apply(function(){
        $scope.temporarychatdata=data;
        }) 
      })

      socket.emit('getmydata',{});//触发后台发送用户数据  
  }

  $scope.getdata();
  $scope.$watch('temporarychatdata', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          $scope.chatdata=$filter('getchatdata')($scope.temporarychatdata,$scope.chinesenamedata);
          $scope.chinesedata=$filter('chinese')($scope.chatdata);
        }
    });
  $scope.$watch('chinesenamedata', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          $scope.chatdata=$filter('getchatdata')($scope.temporarychatdata,$scope.chinesenamedata);
          $scope.chinesedata=$filter('chinese')($scope.chatdata);
        }
    });
 
   $scope.$watch('chatingdata', function(newVal, oldVal) {
      if (newVal !== oldVal) {
        setTimeout(function(){
      $('.chat-right-mid').scrollTop(document.getElementById('chat-right-mid').scrollHeight);
    },100);
        }
    });


  $scope.postdata=function(){

    var chattext=$('.chat-right-bot').text();
    if(!chattext)return;
     var text={
       name:$scope.username,//消息发送者姓名 
       targetname:$scope.chatingdata.englishname,//消息接收者的englishname
       data:{
          time:new Date().getTime(),
          whosepicture:$scope.username,
          addclasson:true,
          text:chattext
         }
     };
     
     socket.emit($scope.chatingdata.englishname, text);
     
     $('.chat-right-bot').text('');
     $scope.chatdata[$filter('getpersonindex')($scope.chatdata,$scope.chatingdata.englishname)].chat.push(text.data);
     setTimeout(function(){
      $('.chat-right-mid').scrollTop(document.getElementById('chat-right-mid').scrollHeight);
     },100);
    
  }
   
   $scope.getpicture=function(whosepicture){
    var index=$filter('getpersonindex')($scope.chatdata,whosepicture);
    if(index===""){ return $scope.picture}else{
      return $scope.chatdata[index].picture
    }
   }
  }])



app.controller("focusctrl",["$scope","$filter",function($scope,$filter){
  $scope.turn=true;
  $scope.targetchildren={};
  socket.on("receivepersondata",function(data){
    $scope.$apply(function(){
      var index=$filter('getpersonindex')(data,"public");
      data.splice(index,1);
      var index=$filter('getpersonindex')(data,"math");
      data.splice(index,1);
      var index=$filter('getpersonindex')(data,"chinese");
      data.splice(index,1);
      var index=$filter('getpersonindex')(data,"english");
      data.splice(index,1);
      $scope.persondata=data;
    });
  })  
  socket.emit("getgrowperson",{});
  socket.emit("getgrowdata",{});
  socket.on("receivegrowdata",function(data){
    $scope.$apply(function(){
      $scope.temporarygrowdata=data;
    });
  });
  $scope.$watch('persondata', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          $scope.childrendata=$filter('getchatdata')($scope.temporarygrowdata,$scope.persondata);
        }
    });
  $scope.$watch('temporarygrowdata', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          $scope.childrendata=$filter('getchatdata')($scope.temporarygrowdata,$scope.persondata);
        }
    });
  $scope.index=0;
  $scope.getindexright=function(){ 
    $scope.index=$filter('gettargetgrowindexright')($scope.targetchildren.grow,
      $(".carousel-inner .active p").text());
  };
  $scope.getindexleft=function(){ 
    $scope.index=$filter('gettargetgrowindexleft')($scope.targetchildren.grow,
      $(".carousel-inner .active p").text());
  };
  $scope.changeturn=function(){$scope.turn=true;}
}])

app.controller("informctrl",["$scope",function($scope){  
  socket.on('receiveinformdata', function(data) {
    $scope.informdata= data;
    $scope.targetinform=$scope.informdata[$scope.informdata.length-1]; 
    $scope.$digest();
  });
  socket.emit("getinformdata",{});
}])

app.controller("recommendctrl",["$scope",function($scope){  
  socket.on('receiverecommenddata', function(data) {
    $scope.recommenddata= data;
    $scope.$digest();
  });
  socket.emit("getrecommenddata",{});
}])
