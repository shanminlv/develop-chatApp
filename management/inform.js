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
