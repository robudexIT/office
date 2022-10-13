require('dotenv').config()
const sequelize = require('sequelize')
const { DataTypes } = require('sequelize')
const mysql = require('mysql2/promise');

//THIS SCRIPT EXPECT ARGUMENTS
const args = process.argv.slice(2);
const choosedate = args[0];
const option  = args[1]

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
// MYSQLSERVERHOST=localhost
// MYSQLSERVERUSER=root
// MYSQLSERVERPWD=sbtdbjapan@2022
// MYSQLSERVERDB=VRS
const mysqlserver_host = process.env.MYSQLSERVERHOST
const mysqlserver_user = process.env.MYSQLSERVERUSER
const mysqlserver_pwd = process.env.MYSQLSERVERPWD
const mysqlserver_db = process.env.MYSQLSERVERDB

const mysqlserverph_host = process.env.MYSQLSERVERPHHOST
const mysqlserverph_user = process.env.MYSQLSERVERPHUSER
const mysqlserverph_pwd = process.env.MYSQLSERVERPHPWD
const mysqlserverph_db = process.env.MYSQLSERVERPHDB



const db = new sequelize(mysqlserver_db,mysqlserver_user,mysqlserver_pwd, {
    host: mysqlserver_host,
    dialect: 'mysql'
})

const countPhDBCdr = async () => {
    try{
        const connection = await mysql.createConnection({host: mysqlserverph_host, user: mysqlserverph_user, password:mysqlserverph_pwd, database: mysqlserverph_db});
        return connection.execute(`SELECT Count(*) FROM  inbound_callstatus WHERE getDate=?`,[choosedate] );
    }catch(error){
        console.log(error)
    }
    
}

const connectBackupDB = async() => {
    try {
        await db.authenticate()
        console.log('Connected....')
    }catch(error){
        console.log(error)
    }
}

connectBackupDB()

const InboundCdr = db.define('InboundCdr', {
    date: {
        type: DataTypes.STRING,
        allowNull: false
    },
    startTimeStamp: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    endTimeStamp: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    callStatus: {
        type:DataTypes.STRING,
        allowNull: false
    },
    caller: {
        type: DataTypes.STRING,
        allowNull: false
    },
    calledNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    whoAnsweredCall: {
        type: DataTypes.STRING,
        allowNull: false
    }, 
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: false
    }
    
})

InboundCdr.sync()

const findAllCdr = async () => {
    try {
        return InboundCdr.findAll()

    }catch(error){
        console.log(error)
    }
}

const syncDb = async () => {
    try {
        let {count, row} = await InboundCdr.findAndCountAll({where:{date:choosedate}})
        let [rows,fields] = await countPhDBCdr()
        let countph = rows[0]['Count(*)']
        let countbuffer = parseInt(count)
        countph = parseInt(countph)
        if(countph > count){
            console.log('Uploading backup cdr to the Main DB...')
            process.exit(0)
        }else if(count > countph){
            console.log('Uploading backupd cdr to Ph Db...')
            process.exit(0)
        }else{
            console.log('Two Database are sync in records..No need to run sync')
            process.exit(0)
        }
    }catch(error){
        console.log(error)
    }
}

const countAllCdr = async () => {
    try {
        let {count, row} = await InboundCdr.findAndCountAll()
        let [rows,fields] = await countPhDBCdr()
        let countph = rows[0]['Count(*)']
        
        let countbuffer = parseInt(count)
        countph = parseInt(countph)
        console.log(countph)
        console.log(count)
        let missing 
        if(countph > countbuffer){
            missing = countph - countbuffer
            console.log(`The Main DB have missing of ${missing} please start sync now`)
            process.exit(0)
        }else if(countbuffer > countph){
            missing =  countbuffer -  countph
            console.log(`The Ph DB have missing of ${missing} please start sync now`)
            // for(let cdr of cdrs){
            //     console.log(cdr.date)
            // }
            process.exit(0)
        }else{
            console.log('Two Database are sync in records..No need to run sync')
            process.exit(0)
        }
    }catch(error){
        console.log(error)
    }
}


if(option == 'check'){
    countAllCdr()
}else if (option == 'startsync'){
    syncDb() 
}else{
    console.log('Second arguments is invalid...')
    proccess.exit(0)
}


