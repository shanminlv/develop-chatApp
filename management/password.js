app.directive("passwordadddir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){ 
        if(!$("#account").val()||!$("#password").val())return;
        var obj={
          englishname:"teacher",
          name:$("#account").val(),
          password:hex_md5($("#password").val())
        }
        socket.emit("changemanagepassword",obj);
        window.location.href="http://localhost:1337/loginmanage.html";
      })
    }
  }
})

app.directive("passwordresetdir",function () {
  return{
    restrict:"ACE",
    link:function(scope,el,attrs){
      el.on("click",function(){
        $("#account").val('');
        $("#password").val('');
      })
    }
  }
})