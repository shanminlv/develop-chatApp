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
  $scope.$watch('targetfocusweek', function(newVal, oldVal) {
      if (newVal !== oldVal) {
          try{var a=$scope.targetfocusweek.access;
          }catch(err){
            for(var i=0,len=$(".focuscheck").length;i<len;i++){
              $(".focuscheck").eq(i).val('');
            }
            return;
          }
          $(".focuscheck").eq(0).val($scope.targetfocusweek.week);
          $(".focuscheck").eq(1).val($scope.targetfocusweek.exam);
          $(".focuscheck").eq(2).val($scope.targetfocusweek.homework);
          $(".focuscheck").eq(3).val($scope.targetfocusweek.behavior);
          $(".focuscheck").eq(4).val($scope.targetfocusweek.moral);
          $(".focuscheck").eq(5).val($scope.targetfocusweek.communication);
          $(".focuscheck").eq(6).val($scope.targetfocusweek.access);
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
    var index=$filter('getdeleteindex')(data,"public");
    data.splice(index,1);
    $scope.persondata=data;    
    $scope.$digest();
  })
  socket.emit('managementlogin',{});

  //获得focus数据
  socket.on('focusperson', function(data) {
    var index=$filter('getdeleteindex')(data,"public");
    data.splice(index,1);
    var index=$filter('getdeleteindex')(data,"english");
    data.splice(index,1);
    var index=$filter('getdeleteindex')(data,"math");
    data.splice(index,1);
    var index=$filter('getdeleteindex')(data,"chinese");
    data.splice(index,1);
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
      $scope.targetfocus=$scope.focusdata[0];
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
  socket.emit("getrecommenddata",{});/*
  socket.emit("md5",{username:hex_md5("dashu"),password:hex_md5("123456")});*/
  
}])