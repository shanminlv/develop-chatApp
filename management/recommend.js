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
    var index="";
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

