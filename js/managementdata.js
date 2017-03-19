var socket = io('http://localhost:1337'),c=console;
var app=angular.module('app',[]);
app.controller("body",["$scope","$filter",function($scope,$filter){
  
  $scope.showboolean=false;
  $scope.showdelete=false;
  $scope.persondata;
  $scope.clickpersondata;
  $scope.targetfocus={};
  $scope.targetfocusweek={};
  $scope.targetinform={};
  $scope.targetrecommend={};
  $scope.addsocketemit=function(name,data){
    socket.emit(name,data);
  }
  $scope.getletter=function(){
    var englishletter="abcdefghijklmnopqrstuvwsyz",addletter='';
    for(var i=0;i<5;i++){
      var index=Math.floor(Math.random()*26);
      addletter+=englishletter[index];
    }
    return addletter;
  }
  $scope.dele=function(){
    socket.emit('managementlogin',{});
  }
  $scope.$watch('targetinform', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          try{var a=$scope.targetinform.list;
          }catch(err){
            for(var i=0,len=$(".informcheck").length;i<len;i++){
              $(".informcheck").eq(i).val('');
            }
            return;
          }
          $(".informcheck").eq(0).val($scope.targetinform.list);
          $(".informcheck").eq(1).val($scope.targetinform.title);
          $(".informcheck").eq(2).val($scope.targetinform.call);
          $(".informcheck").eq(4).val($scope.targetinform.school);
          $(".informcheck").eq(5).val($scope.targetinform.year);
          $(".informcheck").eq(6).val($scope.targetinform.month);
          $(".informcheck").eq(7).val($scope.targetinform.date);
        }
    })
  $scope.$watch('targetrecommend', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          try{var a=$scope.targetrecommend.title;
          }catch(err){
            for(var i=0,len=$(".recommendcheck").length;i<len;i++){
              $(".recommendcheck").eq(i).val('');
            }
            return;
          }
          $(".recommendcheck").eq(0).val($scope.targetrecommend.title);
          $(".recommendcheck").eq(1).val($scope.targetrecommend.detail);
          $(".recommendcheck").eq(2).val($scope.targetrecommend.link);
        }
    })
  socket.on('managementgetpersondata',function(data){
    $scope.persondata=data;
    $scope.$digest();
  })
  socket.emit('managementlogin',{});

  //获得focus数据
  socket.on('focusperson', function(data) {
    $scope.focusperson= data;
    $scope.$digest();
  });
  socket.on('receivefocusdata', function(data) {
    $scope.focustemdata= data;
    $scope.$digest();
  });
  setTimeout(function(){
    $scope.$apply(function(){
      $scope.focusdata=$filter("getfocusdata")($scope.focustemdata,$scope.focusperson);
    })
  },500);
  socket.emit("getfocusdata",{});

  socket.on('receiveinformdata', function(data) {
    $scope.informdata= data;
    $scope.$digest();
  });
  socket.emit("getinformdata",{});

  socket.on('receiverecommenddata', function(data) {
    $scope.recommenddata= data;
    $scope.$digest();
  });
  socket.emit("getrecommenddata",{});
  
}])



//聊天模块
app.directive("personneldir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
             scope.$apply(function(){
                scope.$parent.showboolean=true;
                scope.$parent.clickpersondata=scope.key;
              })
          })
      }
    }
  })
app.directive("adddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        var name=$("#addname").val(),englishname=$("#addenglishname").val();
        if(name==''||englishname=='')return;
        englishname+=scope.getletter();
        var data={
          name:name,
          englishname:englishname,
          picture:'image/head.png',
          password:"123456"
        }
        scope.$apply(function(){
            scope.persondata.push(data);
        })
        scope.addsocketemit("addperson",data);
        el.addClass('disabled');
      })
      }
    }
  })

app.directive("resetadddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $("#addname").val('');
        $("#addenglishname").val('');
        $("#addperson").removeClass('disabled');
      })
      }
    }
  })

app.directive("modifydir",['$filter',function ($filter) {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){      
        el.on("click",function(){
          var name=$('#modifyname').val();
          if(name==scope.clickpersondata.name){
            scope.$apply(function(){
              scope.showboolean=false;
            });
            return;
          }
          if(name==''){alert('修改的名字不能为空');$('#modifyname').val(scope.clickpersondata.name);return;};
          var index=$filter('getdeleteindex')(scope.persondata,scope.clickpersondata.englishname);
          scope.$apply(function(){
            scope.persondata[index].name=name;
            scope.showboolean=false;
          });
          var obj={
            englishname:scope.clickpersondata.englishname,
            name:name
          };
          scope.addsocketemit("modifypersonname",obj)          
        })
      }
    }
  }]);

app.directive("judgedeletedir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){      
        el.on("click",function(){
          scope.showdelete=true;
        })
      }
    }
  });
app.directive("returndir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
            scope.showboolean=false;
          })            
        })
      }
    }
  })

app.directive("deletedir",['$filter',function ($filter) {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){      
        el.on("click",function(){
          scope.$apply(function(){
              scope.showboolean=false;
              scope.showdelete=false;
          })
          var index=$filter('getdeleteindex')(scope.persondata,scope.clickpersondata.englishname);
          scope.$apply(function(){
              scope.persondata.splice(index,1);
          })
          scope.addsocketemit("deleteperson",{englishname:scope.clickpersondata.englishname});
        })
      }
    }
  }]);

app.directive("nodeletedir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){      
        el.on("click",function(){
          scope.$apply(function(){
              scope.showdelete=false;
          })  
        })
      }
    }
  });


//点滴成长
app.directive("focusadddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){  
        var obj={
          haha:"chishi",
          hide:"chi"
        }
        obj=JSON.stringify(obj);
        $("#type").val($("#addfocus").text());
        $('#sorttime').val(obj);
        $('formfocus').submit();
      })
    }
  }
})

app.directive("targetfocusdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      $("#focusselect").on("click",function(){
        scope.$apply(function(){
          scope.targetfocus=scope.focusdata[$("#focusselect").val()];
        })          
      })
    }
  }
})

app.directive("targetweekdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      $("#focusselectweek").on("click",function(){    
        if($("#focusselectweek").val()!="add"){
          $("#addfocus").text('修改');
          $("#deletefocus").show();
        }else{
          $("#addfocus").text('增加');
          $("#deletefocus").hide();
        }
        scope.$apply(function(){
          scope.targetfocusweek=scope.targetfocus[$("#focusselectweek").val()];
        })          
      })
    }
  }
})

//通知栏
app.directive("targetinformdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      $("#informselect").on("click",function(){    
        if($("#informselect").val()!="add"){
          var str="";
          for(var i=0,len=scope.informdata[$("#informselect").val()].content.length;i<len;i++){
            str+="       "+scope.informdata[$("#informselect").val()].content[i]+'\n';
          }
          str=str.substring(0,str.length-1);
          $("#informtextarea").val(str);
          $("#addinform").text('修改');
          $("#deleteinform").show();
        }else{
          $("#informtextarea").val('');
          $("#addinform").text('增加');
          $("#deleteinform").hide();
        }
        scope.$apply(function(){
          scope.targetinform=scope.informdata[$("#informselect").val()];
        })          
      })
    }
  }
})

app.directive("informadddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){ 
        
        var content=$(".informcheck").eq(3).val().split("\n"),arr=[];
       for(var i=0,length=content.length;i<length;i++){
          var target=content[i].split(" ");
          if(target[target.length-1]!=''){ arr[i]=target[target.length-1];}         
        }
        var obj={
          "list":$(".informcheck").eq(0).val(),
          "title":$(".informcheck").eq(1).val(),
          "sorttime":new Date().getTime(),
          "call":$(".informcheck").eq(2).val(),
          "school":$(".informcheck").eq(4).val(),
          "year":$(".informcheck").eq(5).val(),
          "month":$(".informcheck").eq(6).val().length==1?('0'+$(".informcheck").eq(6).val()):$(".informcheck").eq(6).val(),
          "date":$(".informcheck").eq(7).val().length==1?('0'+$(".informcheck").eq(7).val()):$(".informcheck").eq(7).val(),
          "content": arr         
        }
        if($("#addinform").text()=='修改'){
          scope.addsocketemit("modifyinform",{data:obj,sorttime:scope.targetinform.sorttime});          
        }else if($("#addinform").text()=='增加'){
          scope.addsocketemit("addinform",{data:obj}); 
        };
        $("#informtextarea").val(''); 
        scope.$apply(function(){
          scope.targetinform={};
        })
        socket.emit("getinformdata",{}); 
      })
    }
  }
})

app.directive("informdeletedir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.addsocketemit("deleteinform",{sorttime:scope.targetinform.sorttime});
        $("#informtextarea").val('');
        scope.$apply(function(){
          scope.targetinform={};
        }) 
        socket.emit("getinformdata",{});
      })
    }
  }
})

app.directive("informtextareadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("blur",function(){  
         if($("#informtextarea").val()=='')return;
         var content=$("#informtextarea").val().split("\n"),arr=[];
         for(var i=0,length=content.length;i<length;i++){
            var target=content[i].split(" ");
            arr[i]=target[target.length-1];
          }
          var str="";
          for(var i=0,len=arr.length;i<len;i++){
            str+="       "+arr[i]+'\n';
          }
          str=str.substring(0,str.length-1);
          $("#informtextarea").val(str);
      })
    }
  }
})

app.directive("informresetdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $("#informtextarea").val('') 
        scope.$apply(function(){
          scope.targetinform={};
        })          
      })
    }
  }
})

//推荐栏
app.directive("targetrecommenddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      $("#recommendselect").on("click",function(){    
        if($("#recommendselect").val()!="add"){
          $("#addrecommend").text('修改');
          $("#deleterecommend").show();
        }else{
          $("#addrecommend").text('增加');
          $("#deleterecommend").hide();
        }
        scope.$apply(function(){
          scope.targetrecommend=scope.recommenddata[$("#recommendselect").val()];
        })          
      })
    }
  }
})

app.directive("recommendadddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){ 
        $("#type").val($("#addrecommend").text());
        $('#sorttime').val(scope.targetrecommend.sorttime);
        $('formrecommend').submit();
      })
    }
  }
})

app.directive("recommenddeletedir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.addsocketemit("deleterecommend",{sorttime:scope.targetrecommend.sorttime});
        socket.emit("getrecommenddata",{});
        scope.$apply(function(){
          scope.targetrecommend={};
        }) 
      })
    }
  }
})

app.directive("recommendresetdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
          scope.targetrecommend={};
        })          
      })
    }
  }
})

//过滤器
app.filter("getdeleteindex",function () {
  return function(chatdata,englishname){
    if(!chatdata||!englishname)return;
    var index=0;
      for(var i=0,len=chatdata.length;i<len;i++){
        if(chatdata[i].englishname==englishname){index=i;};
      }
      return index;
  }
})

app.filter("getfocusdata",function () {
  return function(temporarydata,chinesenamedata){
    if(!temporarydata||!chinesenamedata)return;
    var temporarydatalength=temporarydata.length,
        chinesenamedatalength=chinesenamedata.length,
        chatdata=chinesenamedata;
      for(var i=0;i<chinesenamedatalength;i++){
         delete chatdata[i].password;
        for(var j=0;j<temporarydatalength;j++){
           if(chinesenamedata[i].englishname==temporarydata[j].englishname){
            if(temporarydata[j].chat){chatdata[i].chat=temporarydata[j].chat;}else{
              if(!temporarydata[j].photo)return;
              chatdata[i].photo=temporarydata[j].photo;
              chatdata[i].grow=temporarydata[j].grow;
              chatdata[i].homegrow=temporarydata[j].homegrow;
            }           
           }        
        }
      }
      return chatdata;
  }
})