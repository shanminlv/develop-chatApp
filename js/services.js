app.factory("getdataservice",["$http",
  function ($http) {
    var getrequest=function(dataurl){
      return $http({
            method:'GET',
            url:dataurl
           })
    };
    var postrequest=function(dataurl,datadata){
      return $http({
            method:'POST',
            url:dataurl,
            data:datadata
           })
    }
    return {
      getdata:function(dataurl){
        return getrequest(dataurl);
      },
      postdata:function(dataurl,datadata){
        return postrequest(dataurl,datadata);
      }
    }
}])
