require('dotenv').config()
const sequelize = require('sequelize')
const { DataTypes } = require('sequelize')
// MYSQLSERVERHOST=localhost
// MYSQLSERVERUSER=root
// MYSQLSERVERPWD=sbtdbjapan@2022
// MYSQLSERVERDB=VRS
const mysqlserver_host = process.env.MYSQLSERVERHOST
const mysqlserver_user = process.env.MYSQLSERVERUSER
const mysqlserver_pwd = process.env.MYSQLSERVERPWD
const mysqlserver_db = process.env.MYSQLSERVER_DB

const db = new sequelize(mysqlserver_db,mysqlserver_user,mysqlserver_pwd, {
    host: mysqlserver_host,
    dialect: 'mysql'
})



connectDB = async() => {
    try {
        await db.authenticate()
        console.log('Connected....')
    }catch(error){
        console.log(error)
    }
}

connectDB()

const InboundCdr = db.define('InboundCdr', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    date: {
        type: DataTypes.STRING
    },
    startTimeStamp: {
        type: DataTypes.STRING
    },
    endTimeStamp: {
        type: DataTypes.STRING
    },
    callStatus: {
        type:DataTypes.STRING
    },
    caller: {
        type: DataTypes.STRING
    },
    calledNumber: {
        type: DataTypes.STRING
    },
    whoAnsweredCall: {
        type: DataTypes.STRING
    }, 
    filename: {
        type: DataTypes.STRING
    },
    duration: {
        type: DataTypes.STRING
    }
    
})

InboundCdr.sync()

const findAllCdr = async () => {
    try {
        const cdr = await InboundCdr.findall()
    }catch(error){
        console.log(error)
    }
}



