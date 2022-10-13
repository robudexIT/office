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
const mysqlserver_db = process.env.MYSQLSERVERDB

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
        const cdr = await InboundCdr.findAll()
    }catch(error){
        console.log(error)
    }
}

const countAllCdr = async () => {
    try {
        const {count, row} = await InboundCdr.findAndCountAll()
        console.log(count)
        if(count == 0){
            console.log('No Found Records')
        }else{
            const cdrs  = await findAllCdr()
            console.log(cdrs)
        }
    }catch(error){
        console.log(error)
    }
}

countAllCdr()

