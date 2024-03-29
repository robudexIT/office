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
let  extensions = args[2].split(",")
// let extensions_string = ''
// for (let i=0 ;extensions.length>i ; i++){
   
//     if(i < extensions.length && extensions_string != ""){
//         extensions_string+=`,`
//     }
    
//     extensions_string+=`${extensions[i]}`
// }
// console.log(extensions_string)
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

if(extensions == "Undefined" || extensions == ''){
    console.log('Please provide second argument..')
    console.log('second argument must be check|startsync')
    process.exit(0)
}


const mysqlserverph_host = process.env.MYSQLSERVERPHHOST
const mysqlserverph_user = process.env.MYSQLSERVERPHUSER
const mysqlserverph_pwd = process.env.MYSQLSERVERPHPWD
const mysqlserverph_db = process.env.MYSQLSERVERPHDB

const sqlserver_host = process.env.SQLSERVERServer
const sqlserver_user = process.env.SQLSERVERUser 
const sqlserver_pass = process.env.SQLSERVERPass
const sqlserver_db  = process.env.SQLSERVERDB 


const maindb = async (query) => {
    console.log('This is the main db')
    const sqlConfig = {
        user: sqlserver_user,
        password: sqlserver_pass,
        database: sqlserver_db,
        server:  sqlserver_host,
        connectionTimeout: 30000, 
        requestTimeout:  60000,
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000
        },
        options: {
          encrypt: false, // for azure
          trustServerCertificate: false // change to true for local dev / self-signed certs
        }
      }
    try{
        // const sql = await sqlserver.connect(`Server=${sqlserver_host},1433;Database=${sqlserver_db};User Id=${sqlserver_user};Password=${sqlserver_pass};Encrypt=false`)
        const sql = await sqlserver.connect(sqlConfig)
        if(sql){
            console.log('Successfully Connected to MainDB...')
            return  sql.query(query)
            
        }
    }catch(error){
        console.log(error)
    }
}


const phdb = async (query) => {
    try{
        const connection = await mysql.createConnection({host: mysqlserverph_host, user: mysqlserverph_user, password:mysqlserverph_pwd, database: mysqlserverph_db});
        return connection.execute(query,[choosedate] );
    }catch(error){
        console.log(error)
    }
    
}

const syncdb = async (query) => {
    try {
        let query
         //query phdb cdrs;
         //replace the query string according to recording type
         // for collection table = collectionteam_callsummary
         //for everone = outbound

        //  query = `SELECT * FROM  outbound WHERE getDate=? AND Caller IN(${extensions})`
        //  phcdrs = await phdb(query)
        //  let countph = phcdrs[0].length
         
         
         //query maindb cdrs;
         let choose_date = choosedate.replaceAll("-","")
         query = `SELECT * FROM tblSBTCallDetails_AddressBook WHERE CdtCallingParty='2148' AND CdtStartDate='20230201';`
         let maindbtcdrs  = await maindb(query)
         maindbtcdrs = maindbtcdrs.recordset
         let maindbcount = maindbtcdrs.length
         console.log(maindbtcdrs)
        //  countph = parseInt(countph)
         maindbcount = parseInt(maindbcount)
         
     
        //  console.log(`PHDB has ${countph} cdr`)
         console.log(`MainDB has ${maindbcount} cdr`)
    }catch(error){
        console.log(error)
    }
}

syncdb()