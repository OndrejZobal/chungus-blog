const path = require('path')

const sendNotFound = async (res, path) => {
  res.status(404)
  await res.sendFile(path)
}
exports.sendNotFound = sendNotFound

// The f stands for fancy, not format!
const fprint = (message, char="*") =>{
  console.log(` <${char}>\t${message}`)
}
exports.fprint = fprint
