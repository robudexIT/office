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
const sqlserver_host = process.env.SQLSERVERServer
const sqlserver_user = process.env.SQLSERVERUser 
const sqlserver_pass = process.env.SQLSERVERPass
const sqlserver_db  = process.env.SQLSERVERDB 



const db = new sequelize(mysqlserver_db,mysqlserver_user,mysqlserver_pwd, {
    host: mysqlserver_host,
    dialect: 'mysql'
})

const phdb = async (query) => {
    try{
        const connection = await mysql.createConnection({host: mysqlserverph_host, user: mysqlserverph_user, password:mysqlserverph_pwd, database: mysqlserverph_db});
        return connection.execute(query,[choosedate] );
    }catch(error){
        console.log(error)
    }
    
}
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
        let query
        //query backupcdrs;
        let backupcdrs = await InboundCdr.findAll({where:{date:choosedate}})
        let countbackup = backupcdrs.length
        
        //query phdb cdrs;
        query = `SELECT * FROM  inbound_callstatus WHERE getDate=?`
        phcdrs = await phdb(query)
        let countph = phcdrs[0].length

        //query maindb cdrs;
        let choose_date = choosedate.replaceAll("-","")
        query = `SELECT * FROM tblSBTCallDetails_Incoming WHERE CdtStartDate=${choose_date} AND CdtCalledParty='0452909485'`
        let maindbtcdrs  = await maindb(query)
        maindbtcdrs = maindbtcdrs.recordset
        let maindbcount = maindbtcdrs.length

        countph = parseInt(countph)
        countbackup = parseInt(countbackup)
        maindbcount = parseInt(maindbcount)

        console.log(maindbtcdrs)
        console.log(countph)
        console.log(countbackup)
        console.log(maindbcount)
        let missingcdrs = []

        if(countbackup == countph && countbackup == maindbcount){
            console.log('Two Database are sync in records..No need to run sync')
            process.exit(0)
        }

        if(countbackup > countph && countbackup > maindbcount){
            console.log('Uploading backup cdr to MainDB and PhDB')
            process.exit(0)
        }
        
        if(countbackup > maindbcount){
            console.log('Uploading backup cdr to the MainDB...')
            if(maindbcount == 0){
                console.log('Uploading all backup records cdr to maindb')
                // code here....
            }else{
                const startTimeStamp = maindbtcdrs.map(cdr => {
                    let date = cdr.CdtStartDate
                    let time = cdr.CdtStartTime.replaceAll(":", "")
                    let timestamp = `${date}-${time}`
                    return timestamp
                })
                missingcdrs = backupcdrs.filter(bcdr => {
                    const isOntables = startTimeStamp.includes(bcdr.startTimeStamp)
                    if(!isOntables){
                        return true
                    }
                    return false
                })
                console.log("Here's the missing cdrs that need to upload")
                console.log(missingcdrs)
            }
            process.exit(0)
        }
         if(countbackup > countph){
            console.log('Uploading backupd cdr to PhDB...')
            //when there is no found cdr's upload all backups to phdb
            if(countph == 0){
                console.log('no cdrs on phdb uploading backup to phdb')
                // exten => h,n,System(/usr/bin/php /root/SCRIPTS/inbound_callstatus.php ${CALL_TIME} ${END_TIME} ${DIALSTATUS} ${CALLER} ${CALLED_NO} ${DIALEDPEERNUMBER})
                for (let bcdr of backupcdrs){
                    const { stdout, stderr } = await exec(`/usr/bin/php /root/SCRIPTS/phpdb_inbound.php ${bcdr.startTimeStamp} ${bcdr.endTimeStamp} ${bcdr.callStatus} ${bcdr.caller} ${bcdr.calledNumber} ${bcdr.whoAnsweredCall} ${bcdr.date}`)
                    // console.log(` uploading ${bcdr.startTimeStamp} cdr completed..`)
                    console.log( stdout)
                    console.log( stderr)
                }
                
            }else{
                const startTimeStamp = phcdrs.map(cdr => cdr.StartTimeStamp)
                missingcdrs =  backupcdrs.filter(bcdr => {
                    const isOntables = startTimeStamp.includes(bcdr.startTimeStamp)
                    if(!isOntables){
                        return true
                    }
                    return false
                })
                console.log(missingcdrs)
            }
            
            process.exit(0)
        }

        console.log('Backup DB has been compromise....backup should always have the complete cdr records....')
        process.exit(0)
    }catch(error){
        console.log(error)
    }
    function filtercdr(cdr){
        console.log('begin filtering here....')
    }
}

const countAllCdr = async () => {
    try {
        let query;
        //query backupdb
        let {count, row} = await InboundCdr.findAndCountAll({where:{date:choosedate}})
        let countbackupcdr = parseInt(count)

        //query phdb
        query = `SELECT Count(*) FROM  inbound_callstatus WHERE getDate=?`
        let [rows,fields] = await phdb(query)
        let countphcdr = rows[0]['Count(*)']
        countphcdr= parseInt(countphcdr)
        let choose_date = choosedate.replaceAll("-","")
        //query maindb(2x-db)
         query = `SELECT Count(*) FROM tblSBTCallDetails_Incoming WHERE CdtStartDate=${choose_date} AND CdtCalledParty='0452909485'`
         let maindbcountcdr  = await maindb(query)
         maindbcountcdr = maindbcountcdr.recordset[0]['']
         console.log(maindbcountcdr)
         maindbcountcdr = parseInt(maindbcountcdr)

        console.log('backup ' + countbackupcdr)
        console.log('phdb ' + countphcdr)
        console.log('maindb ' +maindbcountcdr)
        let missing
        if(countbackupcdr == countphcdr && countbackupcdr == maindbcountcdr){
            console.log('MainDB and PhDB are in sync...')
            process.exit(0)
        }
        if(countbackupcdr > countphcdr && countbackupcdr > maindbcountcdr){
            let mainmissing  = countbackupcdr - maindbcountcdr;
            let phmissing = countbackupcdr - countphcdr
            console.log(`The Main DB have missing of ${mainmissing} cdr records please start syncdb now` )
            console.log(`The PH DB have missing of ${phmissing} cdr records please start syncdb now` )
            process.exit(0)
        }
         
        if(countbackupcdr > maindbcountcdr){
            missing =  countbackupcdr - maindbcountcdr
            console.log(`The Main DB have missing of ${missing} cdr records please start sync now`)
            process.exit(0)
        }
         if(countbackupcdr > countphcdr){
            missing =  countbackupcdr -  countphcdr
            console.log(`The Ph DB have missing of ${missing} cdr records please start sync now`)
            process.exit(0)
        }
        console.log('Backup DB has been compromise....backup should always have the complete cdr records....')
        process.exit(0)
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
    process.exit(0)
}




// exten => h,n,System(/root/inbound-sqlserver.php ${CALL_TIME} ${END_TIME} ${DIALSTATUS} ${CALLER} ${CALLED_NO} ${DIALEDPEERNUMBER} ${RECORDING_
//     FILENAME} ${ANSWEREDTIME})
//     exten => h,n,System(/root/SCRIPTS/inbound-mysqlserver.php ${CALL_TIME} ${END_TIME} ${DIALSTATUS} ${CALLER} ${CALLED_NO} ${DIALEDPEERNUMBER} ${
//     RECORDING_FILENAME} ${ANSWEREDTIME})
//     exten => h,n,System(/usr/bin/php /root/SCRIPTS/inbound_callstatus.php ${CALL_TIME} ${END_TIME} ${DIALSTATUS} ${CALLER} ${CALLED_NO} ${DIALEDPE
//     ERNUMBER})
//     exten => h,n,System(/usr/bin/php /root/SCRIPTS/inbound_callstatus2.php ${CALL_TIME} ${END_TIME} ${DIALSTATUS} ${CALLER} ${CALLED_NO} ${DIALEDP
//     EERNUMBER})
//     ;exten => h,n,System(/usr/bin/php /root/SCRIPTS/delete_waiting.php ${CALLERID(num)})