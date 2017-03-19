//点滴成长

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
          scope.targetfocusweek=scope.targetfocus.grow[$("#focusselectweek").val()];
        })          
      })
    }
  }
})

app.directive("focusadddir",["$filter",function ($filter) {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      
      el.on("click",function(){

        var obj={
          "week":$(".focuscheck").eq(0).val(),
          "exam":$(".focuscheck").eq(1).val(),
          "homework":$(".focuscheck").eq(2).val(),
          "behavior":$(".focuscheck").eq(3).val(),
          "moral":$(".focuscheck").eq(4).val(),
          "communication":$(".focuscheck").eq(5).val(),
          "access":$(".focuscheck").eq(6).val()
        }
        var data=scope.targetfocus;
          if($("#addfocus").text()=="修改"){
            data.grow.splice($("#focusselectweek").val(),1,obj)
          }else if($("#addfocus").text()=="增加"){
            data.grow.push(obj);
          }
        for(var i=0,len=data.grow.length;i<len;i++){
          if(data.grow[i].$$hashKey){delete data.grow[i].$$hashKey;}
        }
        data=JSON.stringify(data);        
        $('#data').val(data);
        $('formfocus').submit();
      })
    }
  }
}])

app.directive("focusdeletedir",["$filter",function ($filter) {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
          scope.targetfocus.grow.splice($("#focusselectweek").val(),1);          
        })
        var data=scope.targetfocus;
        for(var i=0,len=data.grow.length;i<len;i++){
          if(data.grow[i].$$hashKey){delete data.grow[i].$$hashKey;}
        }
        var obj={
          englishname:data.englishname,
          photo:data.photo,
          grow:data.grow
        }
        for(var i=0,len=$(".focuscheck").length;i<len;i++){
          $(".focuscheck").eq(i).val('');
        }
        scope.addsocketemit("deletefocus",obj);
      })
    }
  }
}])

app.directive("focusresetdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
          scope.targetfocusweek={};
        })          
      })
    }
  }
})
