const myArgs = process.argv.slice(2);

const mydate = myArgs[0]

//check if accepted date format 
if(!Date.parse(mydate) || mydate == 'undefined'){
    console.log('Date Arguments is need')
    console.log("Must input valid date (yyyy-mm-dd') format")
    return
}

console.log(mydate)