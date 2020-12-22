var express = require('express');
var router = express.Router();
var mysql=require('mysql')
var crypto=require('crypto')
const util=require('util');
const jwt=require('jsonwebtoken');
const { route } = require('./users');
var path = require('path');
const bodyParser = require('body-parser');
const var_dump = require('var_dump');
const { stat } = require('fs');
var con= mysql.createConnection({
  host: 'localhost',
  user:'xxx',
  password: 'xxx',
  database: 'assignment_mobile'
});
const query=util.promisify(con.query).bind(con);
con.connect(function(err){
  if (err) throw err;
  console.log("Connected!");
});

const secretKey="xxxxxxx";
let generateToken = (name, secretSignature, tokenLife) => {
  return new Promise((resolve, reject) => {
    const userData = {
      name: name
    }
    jwt.sign(
      userData,
      secretSignature,
      {
        algorithm: "HS256",
        expiresIn: tokenLife,
      },
      (error, token) => {
        if (error) {
          return reject(error);
        }
        resolve(token);
    });
  });
}


let verifyToken = (token, secretKey) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        return reject(error);
      }
      resolve(decoded);
    });
  });
}
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({
  extended: true
}));
router.get('/register',async function(req,res){
  res.send("OK");
});
router.post('/register',async function(req, res){
  try{
  name=req.body.username;
  console.log(name);
  password=req.body.password;
  if(name===null ||password===null)
    return res.status(400).json({message: 'name/password is missing',})
  password=crypto.createHash('md5').update(password).digest('hex');
  var sql="select * from user where name=?";
  let result= await query(sql,[name]);
  console.log(result);
  size=Object.keys(result).length;
  if(size>0){
    res.status(400);
    return res.send("Name already register!");
  }
  var sql="Insert into user(name,passhash) values(?,?)";
  result= await query(sql,[name,password]);
  res.status(200);
  return res.send("Register Successful");
}
catch(err){
  console.log(err);
  return res.status(500).json({
    message: 'something wrong',
  });
}
});

router.get('/login',async function(req,res){
  res.status(200);
  return res.render('login').send("OK");
});

router.post('/login',async function(req,res){
  try{
  name=req.body.username;
  password=req.body.password;
  password=crypto.createHash('md5').update(password).digest('hex');
  var sql="select * from user where name=?and passhash=?";
  let result= await query(sql,[name,password]);
  console.log(result);
  size=Object.keys(result).length;
  if(size>0){
    accessToken=await generateToken(name,secretKey,1800);
    result={"accesstoken":accessToken}
    res.status(200);
    return res.json(result);
  }
  else{
    res.status(200);
    return res.send("Name/password is wrong!");
  }
}
catch(err){
  return res.status(500).json({
    message: 'something wrong',
  });
}
});
/**
 * Middleware: Authorization user by Token
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
let isAuth=async(req, res,next)=>{
  const tokenFromClient=req.body.token||req.query.token||req.headers['x-access-token'];
  if (tokenFromClient){
    try{
      const decoded=await verifyToken(tokenFromClient,secretKey);
      req.jwtDecoded=decoded;
      next();
    }catch(err){
      return res.status(401).json({
        message: 'Unauthorized.',
      });
    }
  }else{
    console.log(err);
    return res.status(403).send({
      message: 'No token provided.',
    });
  }
}
router.use(isAuth);

router.get('/home',async function(req,res){
  console.log(req.jwtDecoded['name']);
  return res.send("OK");
})
router.get('/employee',async function(req,res){
  try{
    var sql="select * from employee";
    let result=await query(sql);
    console.log(result);
    res.status(200);
    return res.json(result);
  }catch(err){
    console.log(err);

    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.post('/employee',async function(req,res){
  try{
    employee_name=req.body.employee_name;
    employee_role=req.body.employee_role;
    image="tmp";
    phone_number=req.body.phone_number;
    if (!employee_name){
      res.status(400);
      return res.send("Please give me a name!");
    }
    if (!employee_role){
      res.status(400);
      return res.send("Please give me a role!");
    }
    if (!phone_number){
      res.status(400);
      return res.send("Please give me a phone number!");
    }
    var sql= 'Select *from type_role where role_name=?'
    var result=await query(sql,[employee_role]);
    if(result.length==0){
      return res.status(400).send('Role not exists!');
    }
     sql="INSERT into employee(employee_name,employee_role,image,phone_number) values(?,?,?,?)";
    result=await query(sql,[employee_name,employee_role,image,phone_number]);
    console.log(result);
    res.status(200);
    return res.send("OK")
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.put('/employee/:employee_id',async function(req,res){
  try{
    employee_id = req.params.employee_id;
    if(!employee_id){
      res.status(400);
      return res.send("Please give me a employee_id!");
    }
    var sql='select * from employee where employee_id=?';
    let result= await query(sql,[employee_id]);
    if (result.length==0){
      res.status(400);
      return res.send("Employee not exists!");
    }
    //image
    new_name=(req.body.employee_name)?req.body.employee_name:result[0].employee_name;
    new_role=(req.body.employee_role)?req.body.employee_role:result[0].employee_role;
    new_image=("tmp")?"tmp":result[0].image;
    sql= 'Select *from type_role where role_name=?'
    result=await query(sql,[new_role]);
    if(result.length==0){
      return res.status(400).send('Role not exists!');
    }
    console.log(new_name);
    new_phone=(req.body.phone_number)?req.body.phone_number:result[0].phone_number;
    sql='Update employee set employee_name=?,employee_role=?,image=?,phone_number=? where employee_id=?';
    console.log((new_role));
    result=await query(sql,[new_name,new_role,new_image,new_phone,employee_id]);
    res.status(200);
    return res.send('Update successful!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.delete('/employee/:employee_id',async function(req,res){
  try{
    employee_id = req.params.employee_id;
    if(!employee_id){
      res.status(400);
      return res.send("Please give me a employee_id!");
    }
    var sql='select * from employee where employee_id=?';
    let result= await query(sql,[employee_id]);
    if (result.length==0){
      res.status(400);
      return res.send("Employee not exists!");
    }
    sql='delete from employee where employee_id=?';
    result=await query(sql,[employee_id]);
    res.status(200);
    return res.send('A employee was deleted!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.get('/import',async function(req,res){
  try{
    warehouse_id=req.body.warehouse_id;
    if(warehouse_id){
      var sql='select * from import where warehouse_id = ?';
      let result=await query(sql,[warehouse_id]);
      res.status(200);
      return res.json(result);
    }
    else{
      var sql='select * from import';
      let result=await query(sql);
      res.status(200);
      return res.json(result);
    }
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });

  }
})
router.post('/import',async function(req,res){
  try{
    today= String(new Date().toISOString().slice(0, 10))
    product_id=Number(req.body.product_id);
    create_date=(req.body.create_date)?req.body.create_date:today;
    receive_date=req.body.receive_date?req.body.receive_date:today;
    number=Number(req.body.number)?Number(req.body.number):0;
    status=(req.body.status)?req.body.status:0;
    warehouse_id=req.body.warehouse_id;
    if(!product_id){
      return res.status(400).send('Please give me product_id!')
    }
    if(!warehouse_id){
      return res.status(400).send('Please give me warehouse_id!')
    }
    if(number<0){
      return res.status(400).send('Please check the number!')
    }
    var sql='select * from product where product_id=?';
    product=await query(sql,[product_id]);
    if(product.length==0){
      return res.status(400).send('Product not exists!')
    }
    var sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    console.log(status);
    sql='insert into import(product_id ,create_date ,receive_date,status ,num_product,warehouse_id) values(?,?,?,?,?,?)';
    result=await query(sql,[product_id,create_date,receive_date,status,number,warehouse_id]);
    sql='Update product set num_product=num_product+? where product_id=?';
    result=await query(sql,[number,product_id]);
    
    return res.status(200).send('Create a import successful!')
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.put('/import/:import_id',async function(req,res){
  try{
    import_id=Number(req.params.import_id);
    if(!import_id){
      return res.status(400).send('Please give me a import_id!')
    }
    var sql='select * from import where import_id=?';
    imports=await query(sql,[import_id]);
    if(imports.length==0){
      return res.status(400).send('Import not exixts!')
    }
    
    today= String(new Date().toISOString().slice(0, 10))
    product_id=Number(req.body.product_id)?Number(req.body.product_id):imports[0].product_id;
    create_date=(req.body.create_date)?req.body.create_date:imports[0].create_date;
    receive_date=req.body.receive_date?req.body.receive_date:imports[0].receive_date;
    oldnumber=imports[0].num_product;

    new_number=Number(req.body.number)?Number(req.body.number):imports[0].num_product;

    status=(req.body.status)?req.body.status:imports[0].status;
    warehouse_id=req.body.warehouse_id?req.body.warehouse_id:imports[0].warehouse_id;
    if(!product_id){
      return res.status(400).send('Please give me a product_id!')
    }
    if(!warehouse_id){
      return res.status(400).send('Please give me a warehouse_id!')
    }

    var sql='select * from product where product_id=?';
    product=await query(sql,[imports[0].product_id]);
    
    if(product.length==0){
      return res.status(400).send('Product not exists!')
    }
    current_product_id=imports[0].product_id;
    var sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    current_num_product=product[0].num_product;
    if(current_product_id==product_id){
      //not change product
      delta=new_number-oldnumber;
      if(new_number<0 || current_num_product+delta<=0){
        return res.status(400).send('Please check the number!')
      }
      sql='update import set product_id=? ,create_date=?,receive_date=?,status=?,num_product=?,warehouse_id=? where import_id=?';
      result=await query(sql,[product_id,create_date,receive_date,status,new_number,warehouse_id,import_id]);
      sql='Update product set num_product=num_product+? where product_id=?';
      result=await query(sql,[delta,product_id]);
      sql='Update import set product_id=? where import_id=?';
      result=await query(sql,[product_id,import_id]);
      return res.status(200).send('Update success!')
    }
    //change product_id
    //check current product
    if(current_num_product-new_number<0){
      return res.status(400).send('Please check the number!')
    }
    sql='Update product set num_product=num_product-? where product_id=?';
    result=await query(sql,[new_number,current_product_id]);
    sql='Update product set num_product=num_product+? where product_id=?';
    result=await query(sql,[new_number,product_id]);
    return res.status(200).send('Update success!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
  
})
router.delete('/import/:import_id',async function(req,res){
  try{
    import_id=Number(req.params.import_id);
    if(!import_id){
      return res.status(400).send('Please give me a import_id!')
    }
    var sql='select * from import where import_id=?';
    imports=await query(sql,[import_id]);
    if(imports.length==0){
      return res.status(400).send('Import not exixts!')
    }
    sql='Update product set num_product=num_product-? where product_id=?';
    result=await query(sql,[imports[0].num_product,imports[0].product_id]);
    sql='Delete from import where import_id=?';
    result=query(sql,[import_id]);
    return res.status(200).send('Delete success!');
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }

})
router.get('/export',async function(req,res){
  try{
    warehouse_id=req.query.warehouse_id;
    if(warehouse_id){
      var sql='select * from export where warehouse_id = ?';
      let result=await query(sql,[warehouse_id]);
      res.status(200);
      return res.json(result);
    }
    else{
      var sql='select * from export';
      let result=await query(sql);
      res.status(200);
      return res.json(result);
    }
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });

  }
})
router.post('/export',async function(req,res){
  try{
    today= String(new Date().toISOString().slice(0, 10))
    product_id=Number(req.body.product_id);
    create_date=(req.body.create_date)?req.body.create_date:today;
    receive_date=req.body.receive_date?req.body.receive_date:today;
    number=Number(req.body.number)?Number(req.body.number):0;
    status=(req.body.status)?req.body.status:0;
    warehouse_id=req.body.warehouse_id;
    if(!product_id){
      return res.status(400).send('Please give me product_id!')
    }
    if(!warehouse_id){
      return res.status(400).send('Please give me warehouse_id!')
    }
    if(number<0){
      return res.status(400).send('Please check the number!')
    }
    var sql='select * from product where product_id=?';
    product=await query(sql,[product_id]);
    current_num_product=product[0].num_product;
    if(number>current_num_product){
      return res.status(400).send('Dont enough product!')
    }
    if(product.length==0){
      return res.status(400).send('Product not exists!')
    }
    var sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    console.log(status);
    sql='insert into export(product_id ,create_date ,receive_date,status ,num_product,warehouse_id) values(?,?,?,?,?,?)';
    result=await query(sql,[product_id,create_date,receive_date,status,number,warehouse_id]);
    sql='Update product set num_product=num_product-? where product_id=?';
    result=await query(sql,[number,product_id]);
    
    return res.status(200).send('Create a export successful!')
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.put('/export/:export_id',async function(req,res){
  try{
    export_id=Number(req.params.export_id);
    if(!export_id){
      return res.status(400).send('Please give me a export_id!')
    }
    var sql='select * from export where export_id=?';
    imports=await query(sql,[export_id]);
    if(imports.length==0){
      return res.status(400).send('Export not exixts!')
    }
    today= String(new Date().toISOString().slice(0, 10))
    product_id=Number(req.body.product_id)?Number(req.body.product_id):imports[0].product_id;
    create_date=(req.body.create_date)?req.body.create_date:imports[0].create_date;
    receive_date=req.body.receive_date?req.body.receive_date:imports[0].receive_date;
    oldnumber=imports[0].num_product;
    new_number=Number(req.body.number)?Number(req.body.number):imports[0].num_product;
    status=(req.body.status)?req.body.status:imports[0].status;
    warehouse_id=req.body.warehouse_id?req.body.warehouse_id:imports[0].warehouse_id;
    if(!product_id){
      return res.status(400).send('Please give me a product_id!')
    }
    if(!warehouse_id){
      return res.status(400).send('Please give me a warehouse_id!')
    }

    var sql='select * from product where product_id=?';
    product=await query(sql,[product_id]);
    
    if(product.length==0){
      return res.status(400).send('Product not exists!')
    }
    current_product_id=imports[0].product_id;
    var sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    current_num_product=product[0].num_product;
    if(current_product_id==product_id){
      //not change product
      delta=new_number-oldnumber;
      if(new_number<0 || current_num_product+delta<=0){
        return res.status(400).send('Please check the number!')
      }
      sql='update export set product_id=? ,create_date=?,receive_date=?,status=?,num_product=?,warehouse_id=? where export_id=?';
      result=await query(sql,[product_id,create_date,receive_date,status,new_number,warehouse_id,export_id]);
      sql='Update product set num_product=num_product-? where product_id=?';
      result=await query(sql,[delta,product_id]);
      
      return res.status(200).send('Update success!')
    }
    //change product_id
    //check current product
    if(current_num_product-new_number<0){
      return res.status(400).send('Please check the number1!')
    }
    sql='Update product set num_product=num_product+? where product_id=?';
    result=await query(sql,[new_number,current_product_id]);
    sql='Update product set num_product=num_product-? where product_id=?';
    result=await query(sql,[new_number,product_id]);
    sql='Update export set product_id=? where export_id=?';
    result=await query(sql,[product_id,export_id]);
    return res.status(200).send('Update success!')
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
  
})
router.delete('/export/:export_id',async function(req,res){
    try{
      export_id=Number(req.params.export_id);
      if(!export_id){
        return res.status(400).send('Please give me a export_id!')
      }
      var sql='select * from export where export_id=?';
      imports=await query(sql,[export_id]);
      if(imports.length==0){
        return res.status(400).send('Import not exixts!')
      }
      sql='Update product set num_product=num_product+? where product_id=?';
      result=await query(sql,[imports[0].num_product,imports[0].product_id]);
      sql='Delete from export where export_id=?';
      result=query(sql,[export_id]);
      return res.status(200).send('Delete success!');
    }catch(err){
      console.log(err);
      return res.status(500).json({
        message: 'something wrong',
      });
    }

  })
router.get('/product',async function(req,res){
  try{
    warehouse_id=req.query.warehouse_id;
    if(warehouse_id){
      var sql='select * from product where warehouse_id = ?';
      let result=await query(sql,[warehouse_id]);
      res.status(200);
      return res.json(result);
    }
    else{
      var sql='select * from product';
      let result=await query(sql);
      res.status(200);
      return res.json(result);
    }
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });

  }
})
router.post('/product',async function(req,res){
  try{
    product_name=(req.body.product_name);
    type_id=req.body.type_id;
    number=0;
    warehouse_id=req.body.warehouse_id;
    if(!warehouse_id){
      return res.status(400).send('Please give me warehouse_id!')
    }
    var sql='select * from product where product_name=?';
    product=await query(sql,[product_name]);
    if(product.length>0){
      return res.status(400).send('Product exists!')
    }
    var sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    sql='insert into product(product_name,type_id,num_product,warehouse_id) values(?,?,?,?)';
    result=await query(sql,[product_name,type_id,number,warehouse_id]);
    return res.status(200).send('Create a product successful!')
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.put('/product/:product_id',async function(req,res){
  try{
    product_id=req.params.product_id;
    if(!product_id){
      return res.status(400).send('Please give me a product_id!')
    }
    var sql='select * from product where product_id=?';
    result=await query(sql,[product_id]);
    if(result.length==0){
      return res.status(400).send('Product not exixts!')
    }
    product_name=(req.body.product_name)?req.body.product_name:result[0].product_name;
    type_id=req.body.type_id?req.body.type_id:result[0].type_id;
    warehouse_id=req.body.warehouse_id?req.body.warehouse_id:result[0].warehouse_id;

    sql='select * from type_p where type_id=?';
    result=await query(sql,[type_id]);
    if(result.length==0){
      return res.status(400).send('Type not exists!')
    }
    sql='select * from warehouse where warehouse_id=?';
    warehouse=await query(sql,[warehouse_id]);
    if(warehouse.length==0){
      return res.status(400).send('Warehouse not exists!')
    }
    sql='Update product set product_name=?,type_id=?,warehouse_id=? where product_id=?';
    result=await query(sql,[product_name,type_id,warehouse_id,product_id]);
    
    return res.status(200).send('Update success!')
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
  
})
router.delete('/product/:product_id',async function(req,res){
    try{
      product_id=Number(req.params.product_id);
      if(!product_id){
        return res.status(400).send('Please give me a product_id!')
      }
      var sql='select * from product where product_id=?';
      products=await query(sql,[product_id]);
      if(products.length==0){
        return res.status(400).send('Product not exixts!')
      }
      sql='Delete from product where product_id=?';
      result=query(sql,[product_id]);
      return res.status(200).send('Delete success!');
    }catch(err){
      console.log(err);
      return res.status(500).json({
        message: 'something wrong',
      });
    }

  })
router.get('/search',async function(req,res){
    try{
      product_name=req.query.product_name;
      warehouse_id=req.query.warehouse_id;
      if(!product_name){
        return res.status(400).send('Give me a name');
      }
      if(warehouse_id){
        var sql='select * from product where product_name like ? and warehouse_id=?'
        result= await query(sql,['%'+product_name+'%',warehouse_id])
        return res.status(200).json(result)
      }
      var sql='select * from product where product_name like ?'
      result= await query(sql,['%'+product_name+'%'])
      return res.status(200).json(result)
    }catch(err){
      console.log(err);
      return res.status(500).json({
        message: 'something wrong',
      });
  
    }
  })
router.get('/type_product',async function(req,res){
  try{
    var sql='select * from type_p';
    type_p=await query(sql,[]);
    return res.status(200).json(type_p)
    
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.post('/type_product',async function(req,res){
  try{
    tmp=req.body.name;
    var sql='select * from type_p where type_id=?';
    result=await query(sql,[tmp])
    if (result.length==0){
      res.status(400).send('Product type exists!');
    }
    sql='Insert into type_p(name) values(?)';
    result=await query(sql,[tmp])
    return res.status(200).send('Create a product type successful!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
  
})
router.put('/type_product/:type_id',async function(req,res){
  try{
    type_id=req.params.type_id;
    if(!type_id){
      res.status(400).send('Give me a type_id!');
    }
    name=req.body.name;
    var sql='select * from type_p where type_id=?';
    result=await query(sql,[type_id])
    if (result.length==0){
      res.status(400).send('type_id not exists!');
    }
    sql='update type_p set name=? where type_id=?';
    result=await query(sql,[name,type_id])
    return res.status(200).send('Update successful!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
  
})
router.delete('/type_product/:type_id',async function(req,res){
    try{
      type_id=Number(req.params.type_id);
      if(!type_id){
        return res.status(400).send('Please give me a type_id!')
      }
      var sql='select * from type_p where type_id=?';
      result=await query(sql,[type_id]);
      if(result.length==0){
        return res.status(400).send('Product type not exixts!')
      }
      sql='Delete from type_p where type_id=?';
      result=query(sql,[type_id]);
      return res.status(200).send('Delete success!');
    }catch(err){
      console.log(err);
      return res.status(500).json({
        message: 'something wrong',
      });
    }

  })
router.get('/role', async function(req,res){
  var sql='select * from type_role';
  result=await query(sql,[])
  return res.status(200).json(result);
})
router.post('/role', async function(req,res){
  try{
  role_name=req.body.role_name;
  if(!role_name){
    return res.status(400).send('Please give me a role name');
  }
  var sql='select * from type_role where role_name=?'
  result= await query(sql,[role_name]);
  if (result.length>0){
    return res.status(400).send('Role exixts')
  }
  sql='Insert into type_role (role_name) values(?)';
  result= await query(sql,[role_name]);
  return res.status(200).send('Create role successfull!')
}catch(err){
  console.log(err);
  return res.status(500).json({
    message: 'something wrong',
  });
}
})
router.put('/role/:oldname', async function(req,res){
  oldname=req.params.oldname
  role_name=req.body.role_name;
  if(!role_name){
    return res.status(400).send('Please give me a role name');
  }
  var sql='select * from type_role where role_name=?'
  result= await query(sql,[oldname]);
  if (result.length==0){
    return res.status(400).send('Role not exixts')
  }
  sql='Update type_role set role_name=? where role_name=?';
  result= await query(sql,[role_name,oldname]);
  return res.status(200).send('Update success!')
})
router.delete('/role/:role_name',async function(req,res){
  try{
  role_name=req.params.role_name;
  if(!role_name){
    return res.status(400).send('Please give me a role name');
  }
  var sql='Delete from type_role where role_name=?'
  result= await query(sql,[role_name]);
  res.status(200).send('Delete role success!')
}
  catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.get('/warehouse',async function(req,res){
  try{
    var sql='select * from warehouse';
    result= await query(sql,[]);
    return res.status(200).json(result);
  }catch(err){
  console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
}
})
router.post('/warehouse/',async function(req,res){
  try{
    warehouse_name=req.body.warehouse_name;
    address=req.body.address;
    manager_id=req.body.manager_id;
    phone_number=req.body.phone_number;
    if(!warehouse_name){
      res.status(400).send('Please give me a name');
    }
    if(!address){
      res.status(400).send('Please give me a address');
    }
    var sql='select * from employee where employee_id=?'
    result= await query(sql,[manager_id]);
    if(result.length==0){
      return res.status(400).send('Employee not exists');
    }
    sql='insert into warehouse (warehouse_name, address,manager_id, phone_number) values (?,?,?,?)'
    result=await query(sql,[warehouse_name,address,manager_id,phone_number])

    return res.status(200).send('Create a warehouse success!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.put('/warehouse/:warehouse_id',async function(req,res){
  try{
    warehouse_id=req.params.warehouse_id;
    if(!warehouse_id){
      res.status(400).send('Please give me a warehouse_id!');
    }
    var sql='select * from warehouse where warehouse_id=?'
    result= await query(sql,[warehouse_id]);

    if(result.length==0){
      res.status(400).send('Warehouse not exists!')
    }
    warehouse_name=req.body.warehouse_name?req.body.warehouse_name:result[0].warehouse_name;
    address=req.body.address?req.body.address:result[0].address;
    manager_id=req.body.manager_id?req.body.manager_id:result[0].manager_id;
    phone_number=req.body.phone_number?req.body.phone_number:result[0].phone_number;

    sql='update warehouse set  warehouse_name=?,address=?,manager_id=?,phone_number=? where warehouse_id=?';
    result=await query(sql,[warehouse_name, address,manager_id, phone_number,warehouse_id])
    return res.status(200).send('Update success!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
  }
})
router.delete('/warehouse/:warehouse_id',async function(req,res){
  try{
    warehouse_id=req.params.warehouse_id;
    if(!warehouse_id){
      res.status(400).send('Please give me a warehouse_id!')
    }
    var sql='select * from warehouse where warehouse_id=?'
    result=await query(sql,[warehouse_id])
    if(result.length==0){
      res.status(400).send('Warehouse not exists!')
    }
    sql='delete from warehouse where warehouse_id=?'
    result=await query(sql,[warehouse_id])
    return res.status(200).send('Delete success!')
  }catch(err){
    console.log(err);
    return res.status(500).json({
      message: 'something wrong',
    });
}
})
module.exports = router;
