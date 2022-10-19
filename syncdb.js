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
const maindb2  = async(query) => {
     try{
        const connection = await mysql.createConnection({host: mysqlserver_host, user: mysqlserver_user, password:mysqlserver_pwd, database: mysqlserver_db});
        return connection.execute(query,[choosedate]);
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
        query = `SELECT * FROM tblSBTCallDetails_Incoming WHERE  ((CdtCalledParty='0452909480' AND CdtAcceptedParty LIKE 'sbphilippines:sbtrading%') OR CdtCalledParty='0452909485') AND CdtStartDate=${choose_date};`
        let maindbtcdrs  = await maindb(query)
        maindbtcdrs = maindbtcdrs.recordset
        let maindbcount = maindbtcdrs.length
        console.log(maindbtcdrs)
        let maindbtcdrs2 = await maindb2(query)
        maindbcount2 = maindbtcdrs2[0].length

        countph = parseInt(countph)
        countbackup = parseInt(countbackup)
        maindbcount = parseInt(maindbcount)
        maindbcount2 = parseInt(maindbcount2)

        
       

        console.log(countph)
        console.log(countbackup)
        console.log(maindbcount)
        console.log(maindbcount2)

        let missingcdrs = []

        if(countbackup == countph && countbackup == maindbcount2){
            console.log('Two Database are sync in records..No need to run sync')
            process.exit(0)
        }

        if(countbackup > countph && countbackup > maindbcount2){
           
            
            const phcommand = '/usr/bin/php /root/SCRIPTS/phpdb_inbound.php'
            const phmessage = 'Uploading backup cdr to PhDB...'
            await uploadtoDB(countph,phcdrs[0],backupcdrs,phcommand,phmessage, 'phdb' )
            
            const maindb2command = '/usr/bin/php /root/SCRIPTS/inbound-maindb2.php' 
            const maindb2message = 'Uploading backup cdr to MainDB2...'
            await uploadtoDB(maindbcount2,maindbtcdrs2[0],backupcdrs,maindb2command,phmessage, 'maindb2' )
            process.exit(0)

        }
        
        if(countbackup > maindbcount2){
            const maindb2command = '/usr/bin/php /root/SCRIPTS/inbound-maindb2.php' 
            const maindb2message = 'Uploading backup cdr to MainDB2...'
            await uploadtoDB(maindbcount2,maindbtcdrs2[0],backupcdrs,maindb2command,maindb2message, 'maindb2' )
            process.exit(0)
        }
         if(countbackup > countph){
           const command = '/usr/bin/php /root/SCRIPTS/phpdb_inbound.php'
           const message = 'Uploading backup cdr to PhDB...' 
           await uploadtoDB(countph,phcdrs[0],backupcdrs,command,message, 'phdb' )
            process.exit(0)
        }

        console.log('Backup DB has been compromise....backup should always have the complete cdr records....')
        process.exit(0)
    }catch(error){
        console.log(error)
    }
    async function uploadtoDB(cdrcount, cdrs, backupcdrs, command, message, db){
        console.log(`${message}`)
        //when there is no found cdr's upload all backups to phdb
        if(cdrcount == 0){
            console.log(`no cdrs on ${db} uploading backup to ${db}`)
           
            for (let bcdr of backupcdrs){
                let params = ''
                if(db == 'phdb'){
                    params = `${bcdr.startTimeStamp} ${bcdr.endTimeStamp} ${bcdr.callStatus} ${bcdr.caller} ${bcdr.calledNumber} ${bcdr.whoAnsweredCall} ${bcdr.date}`
                }else{
                    params = `${bcdr.startTimeStamp} ${bcdr.endTimeStamp} ${bcdr.callStatus} ${bcdr.caller} ${bcdr.calledNumber} ${bcdr.whoAnsweredCall} ${bcdr.filename} ${bcdr.duration}`
                }
                const { stdout, stderr } = await exec(`${command} ${params}`)
               
                console.log( stdout)
                console.log( stderr)
            }
            
        }else{
            const startTimeStamp = cdrs.map(cdr => {
                if(db == 'phdb'){
                    return cdr.StartTimeStamp
                }
                if(db = 'maindb' || db == db =='maindb2') {
                    let date = cdr.CdtStartDate
                    let time = cdr.CdtStartTime.replaceAll(":", "")
                    let timestamp = `${date}-${time}`
                    return timestamp
                }
             
            })
            missingcdrs =  backupcdrs.filter(bcdr => {
                const isOntables = startTimeStamp.includes(bcdr.startTimeStamp)
                if(isOntables){
                    return false
                }
                return true
            })
            for(let cdr of missingcdrs){
                let params = ''
                if(db == 'phdb'){
                    params = `${cdr.startTimeStamp} ${cdr.endTimeStamp} ${cdr.callStatus} ${cdr.caller} ${cdr.calledNumber} ${cdr.whoAnsweredCall} ${cdr.date}`
                }else {
                    params = `${cdr.startTimeStamp} ${cdr.endTimeStamp} ${cdr.callStatus} ${cdr.caller} ${cdr.calledNumber} ${cdr.whoAnsweredCall} ${cdr.filename} ${cdr.duration}`
                }
                const { stdout, stderr } = await exec(`${command} ${params}` )
                // console.log(` uploading ${bcdr.startTimeStamp} cdr completed..`)
                console.log( stdout)
                console.log( stderr)
            }
        }
        
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

        //query phdb cdrs;
        query = `SELECT * FROM  inbound_callstatus WHERE getDate=?`
        phcdrs = await phdb(query)
        let countph = phcdrs[0].length

        countphcdr= parseInt(countphcdr)
        let choose_date = choosedate.replaceAll("-","")
        //query maindb(2x-db)
        query = `SELECT Count(*) FROM tblSBTCallDetails_Incoming WHERE  ((CdtCalledParty='0452909480' AND CdtAcceptedParty LIKE 'sbphilippines:sbtrading%') OR CdtCalledParty='0452909485') AND CdtStartDate=${choose_date}`
         let maindbcountcdr  = await maindb(query)
         maindbcountcdr = maindbcountcdr.recordset[0]['']
         console.log(maindbcountcdr)
         maindbcountcdr = parseInt(maindbcountcdr)

         //query maindb2 
        //  query = `SELECT Count(*) FROM tblSBTCallDetails_Incoming WHERE CdtStartDate=${choose_date} AND CdtCalledParty='0452909485'`
         let maindbcountcdr2  = await maindb2(query)
                     
         maindbcountcdr2 =   parseInt(maindbcountcdr2[0][0]['Count(*)'])
        // console.log(maindbcountcdr2[0][0]['Count(*)'])
        console.log('backup ' + countbackupcdr)
        console.log('phdb ' + countphcdr)
        console.log('maindb ' +maindbcountcdr)
        console.log('maindb2 ' +maindbcountcdr2)
        let missing
        if(countbackupcdr == countphcdr && countbackupcdr == maindbcountcdr2){
            console.log('MainDB and PhDB are in sync...')
            process.exit(0)
        }
        if(countbackupcdr > countphcdr && countbackupcdr > maindbcountcdr2){
            let mainmissing  = countbackupcdr - maindbcountcdr2;
            let phmissing = countbackupcdr - countphcdr
            console.log(`The Main DB have missing of ${mainmissing} cdr records please start syncdb now` )
            console.log(`The PH DB have missing of ${phmissing} cdr records please start syncdb now` )
            process.exit(0)
        }
         
        if(countbackupcdr > maindbcountcdr2){
            missing =  countbackupcdr - maindbcountcdr2
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