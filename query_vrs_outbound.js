require('dotenv').config()
const sequelize = require('sequelize')
const { DataTypes } = require('sequelize')
const { Op } = require('sequelize')
const mysql = require('mysql2/promise');
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const sqlserver = require('mssql')

//THIS SCRIPT EXPECT ARGUMENTS
const args = process.argv.slice(2);
const choosedate = args[0];
const option  = args[1]
const extensions = args[2]

console.log(option)
if(choosedate == 'Undefined' ||  !Date.parse(choosedate)){
    console.log('Date Arguments is need')
    console.log("Must input valid date (yyyy-mm-dd') format")
    process.exit(0)
}
if(option == 'Undefined' || option == '' ){
    console.log('Please provide second argument..')
    console.log('second argument must be check|startsync')
    process.exit(0)
}

const mysqlserver_host = process.env.MYSQLSERVERHOST
const mysqlserver_user = process.env.MYSQLSERVERUSER
const mysqlserver_pwd = process.env.MYSQLSERVERPWD
const mysqlserver_db = process.env.MYSQLSERVERDB

const mysqlserverph_host = process.env.MYSQLSERVERPHHOST
const mysqlserverph_user = process.env.MYSQLSERVERPHUSER
const mysqlserverph_pwd = process.env.MYSQLSERVERPHPWD
const mysqlserverph_db = process.env.MYSQLSERVERPHDB

const sqlserver_host = process.env.SQLSERVERServer
const sqlserver_user = process.env.SQLSERVERUser 
const sqlserver_pass = process.env.SQLSERVERPass
const sqlserver_db  = process.env.SQLSERVERDB 



const db = new sequelize(mysqlserver_db,mysqlserver_user,mysqlserver_pwd, {
    host: mysqlserver_host,
    dialect: 'mysql'
})


const maindb = async (query) => {
    console.log('This is the main db')
    try{
        const sql = await sqlserver.connect(`Server=${sqlserver_host},1433;Database=${sqlserver_db};User Id=${sqlserver_user};Password=${sqlserver_pass};Encrypt=false`)
        if(sql){
            console.log('Successfully Connected to MainDB...')
            return  sql.query(query)
            
        }
    }catch(error){
        console.log(error)
    }
}






const syncDb = async () => {
    try {
        let query
        //query backupcdrs;
    

        //query maindb cdrs;
        let choose_date = choosedate.replaceAll("-","")
        query = `SELECT * FROM tblSBTCallDetails_AddressBook WHERE  CdtCallingParty='6336' AND CdtStartDate=${choose_date};`
        let maindbtcdrs  = await maindb(query)
        maindbtcdrs = maindbtcdrs.recordset
        let maindbcount = maindbtcdrs.length
     
        
        maindbcount = parseInt(maindbcount)
        
    
        console.log(maindbtcdrs)    
        console.log(`MainDB has ${maindbcount} cdr`)
      

        
    }catch(error){
        console.log(error)
    }

}



if(option == 'check' || option == 'startsync'){
    syncDb()

}else{
    console.log('Second arguments is invalid...')
    process.exit(0)
}




