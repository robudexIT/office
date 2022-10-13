const myArgs = process.argv.slice(2);

const mydate = myArgs[0]

//check if accepted date format 
if(!Date.parse(mydate) || mydate == 'undefined'){
    console.log('Date Arguments is need')
    console.log("Must input valid date (yyyy-mm-dd') format")
    return
}

console.log(mydate)

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('What is your name ? ', function (name) {
  if(name == 'rogmer'){
    rl.question('You are an admin enter your password: ', function (password) {
        if(password === 'robudex'){
            console.log('Welcome')
        }else{
            console.log('unauthorized Access!')
        }
        rl.close();
      });
  }else{
    console.log('You are not the admin')
    process.exit(0)
  }
  
});

rl.on('close', function () {
  console.log('\nBYE BYE !!!');
  process.exit(0);
});