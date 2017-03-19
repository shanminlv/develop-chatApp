1.安全关闭服务器
 >use admin
 >db.shutdownServer()

2.查看数据库：show dbs;

新建表：db.createCollection('要新建的表名');

查看当前数据库下表： show collections;

删除当前数据库指定表：db.表名.drop();

删除当前数据库：db.dropDatabase();
查询表中所有数据：db.表名.find();

按条件查询（支持多条件）：db.表名.find(条件);

查询第一条（支持条件）：db.表名.findOne(条件);

限制数量：db.表名.find().limit(数量);

跳过指定数量：db.表名.find().skip(数量);


db.表名.update({"条件字段名":"字段值"},{$set:{"要修改的字段名":"修改后的字段值"}});

db.表名.remove(条件);

3.E:\mongodb\32\bin  
mongod.exe --dbpath E:\mongodb\32\data\db   F:\upupw\htdocs\shanmin\developapp\node


 : "lvshanmin", "picture" : "/image/smseghtjgt.png", "password" : "e10adc3949ba5
9abbe56e057f20f883e" }