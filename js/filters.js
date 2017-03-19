//重新排序用户名字数据并加上ABC
app.filter("chinese",function () {
	return function(key){
		if(!key) return;
    var namearray=[],length=key.length,changedkey=[],y=-1;
    var add=['啊','吧','擦','大','额','发','噶','哈',
    '级','卡','啦','吗','那','哦','怕','全',
    '让','撒','他','哇','西','雅','砸']
    var abc=['A','B','C','D','E','F','G','H',
    'J','K','L','M','N','O','P','Q','R','S','T','W','X','Y','Z']

    for(var i=0;i<length;i++){
      namearray.push(key[i].name);
    }

    for(var x=0;x<add.length;x++){
      namearray.push(add[x]);
    }
    
    namearray=namearray.sort(
      function compareFunction(param1,param2){
          return param1.localeCompare(param2);
      }
    )
   

    for(var j=0;j<namearray.length;j++){
      for(var k=0;k<length;k++){
        if(key[k].name==namearray[j]){          
          y++;
          changedkey[y]=key[k];
        }       
        }
      for(var z=0;z<add.length;z++){ 
        if(namearray[j]==add[z]){
          y++;
          changedkey[y]={
            letter:abc[z],
            name:'',
            bool:true
          };          
        } 
      };
    };  
	
		return changedkey;
	}
})

app.filter("getchatdata",function () {
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

app.filter("getpersonindex",function () {
  return function(chatdata,englishname){
    if(!chatdata||!englishname)return;
    var index="";
      for(var i=0,len=chatdata.length;i<len;i++){
        if(chatdata[i].englishname==englishname){index=i;};
      }
      return index;
  }
})

app.filter("gettargetgrowindexright",function () {
  return function(targetgrow,week){
    if(!targetgrow||!week)return;
    var index=0;
      for(var i=0,len=targetgrow.length;i<len;i++){
        if(targetgrow[i].week==week){index=i;};
      }
      index++;
      if(index==len){
        index=0;
      }
      return index;
  }
})

app.filter("gettargetgrowindexleft",function () {
  return function(targetgrow,week){
    if(!targetgrow||!week)return;
    var index=0;
      for(var i=0,len=targetgrow.length;i<len;i++){
        if(targetgrow[i].week==week){index=i;};
      }
      index--;
      if(index==-1){
        index=len-1;
      }
      return index;
  }
})

