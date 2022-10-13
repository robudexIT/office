require('dotenv').config()
const sequelize = require('sequelize')
const { DataTypes } = require('sequelize')
const mysql = require('mysql2/promise');

//THIS SCRIPT EXPECT ARGUMENTS
const args = process.argv.slice(2);
const choosedate = args[0];
const option  = args[1]

if(choosedate == 'Undefined' ||  !Date.parse(choosedate)){
    console.log('Date Arguments is need')
    console.log("Must input valid date (yyyy-mm-dd') format")
    process.exit(0)
}
if(option == 'Undefined' || option == '' || option !== 'check' || option !== 'startsync'){
    console.log('No option provided..')
    console.log('select between check|startsync')
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
    const connection = await mysql.createConnection({host:'localhost', user: 'root', database: 'test'});
     return connection.execute(`SELECT Count(*) FROM WHERE getDate= ?, [${choosedate}]` );
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
        let  countph = await countPhDBCdr()
        count = parseInt(count)
        countph = parseInt(countph)
        if(countph > count){
            console.log('Uploading backup cdr to the Main DB...')
        }else if(count > countph){
            console.log('Uploading backupd cdr to Ph Db...')
        }else{
            console.log('Two Database are sync in records..No need to run sync')
        }
    }catch(error){
        console.log(error)
    }
}

const countAllCdr = async () => {
    try {
        let {count, row} = await InboundCdr.findAndCountAll()
        let countph = await countPhDBCdr()
        count = parseInt(count)
        countph = parseInt(countph)
        if(countph > count){
            console.log(`The Main DB have missing of ${countph}-${count} please start sync now`)
        }else if(count > countph){
            console.log(`The Ph DB have missing of ${count}-${countph} please start sync now`)
            // for(let cdr of cdrs){
            //     console.log(cdr.date)
            // }
        }else{
            console.log('Two Database are sync in records..No need to run sync')
        }
    }catch(error){
        console.log(error)
    }
}


if(option == 'check'){
    countAllCdr()
}else if (option == 'startsync'){
    syncDb() 
}


