app.directive("changepersondatadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on('click',function(){
        var value=$("#personpassword").val();
        var data={
        englishname:scope.username,
        name:$("#personname").val(),
        password:hex_md5(value)
        }
        c.log(data);
        data=JSON.stringify(data);        
        $('#data').val(data);
        $('formchangeperson').submit();
      })
    }
  }
})

app.directive("chatingclassdir",function () {
	return{
		restrict:"ACE",
		link:function(scope,el,attrs){
			
			if(scope.$parent.$parent.once==1){
				if(!scope.i.bool){
              	 scope.$parent.$parent.chatingdata=scope.i;
              	 el.addClass('bg');
              	 scope.$parent.$parent.once=2;
              	}
       }
             

			el.on("click",function(){
			if(!scope.i.bool){
              $(".bg").removeClass('bg');
              el.addClass('bg');
              scope.$apply(function(){
              	scope.$parent.$parent.chatingdata=scope.i; 
              })
          }
			})
		}
	}
})



app.directive("colordir",function () {
	return{
		restrict:"ACE",
		link:function(scope,el,attrs){
			el.on("click",function(){
              $(".color").removeClass('color');
              el.addClass('color');
              if(attrs.index=="1"){
              	scope.ischating=true;
              	scope.ispersonlist=false;
              }else if(attrs.index=="2"){
              	scope.ischating=false;
              	scope.ispersonlist=true;
              }
              scope.$digest();
			})
		}
	}
})

app.directive("studentnamedir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
          scope.$parent.targetchildren=scope.i;
          scope.$parent.turn=false;
        })          
      })
    }
  }
})

app.directive("ifshowinputdatadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $('.inputdata').show();
      })
    }
  }
})

app.directive("showinputdatadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $('.inputdata').show();
        $('.mainapp').hide();
      })
    }
  }
})

app.directive("hideinputdatadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $('.inputdata').hide();
        $('.mainapp').show();
      })
    }
  }
})

app.directive("postdatadir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("keydown",function(e){
        var eve=e?e:winow.event;
        if(eve.keyCode==13){
          scope.postdata();
          scope.$digest();
        }        
      })
    }
  }
})

app.directive("targetinformdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        scope.$apply(function(){
          scope.$parent.targetinform=scope.i;
        })          
      })
    }
  }
})