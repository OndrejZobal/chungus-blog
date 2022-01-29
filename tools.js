const path = require('path')


// The f stands for fancy, not format!
const fprint = (message, char="*") =>{
  console.log(` <${char}>\t${message}`)
}
exports.fprint = fprint
