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
          password:hex_md5('123456')
        }
        var growdata={
          englishname:englishname,
          photo:"image/grow.jpg",
          grow:[]
        }
        scope.$apply(function(){
            scope.persondata.push(data);
        })
        scope.addsocketemit("addperson",{person:data,grow:growdata});
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
