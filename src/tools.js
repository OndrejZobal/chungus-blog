const path = require('path')


// The f stands for fancy, not format!
const fprint = (message, char="*") =>{
  console.log(` <${char}>\t${message}`)
}
exports.fprint = fprint

// FIXME Ever Googled for loop, retard???
const convertToAscii = (string) => {
  string = string.replace(/ě/g, "e").replace(/š/g, "s").replace(/č/g, "c").replace(/ř/g, "r").replace(/ž/g, "z").replace(/ý/g, "y").replace(/á/g, "a")
  string = string.replace(/í/g, "i").replace(/é/g, "e").replace(/ů/g, "u").replace(/ú/g, "u").replace(/ň/g, "n").replace(/ď/g, "d").replace(/ť/g, "t")
  string = string.replace(/ó/g, "o")
  string = string.replace(/Ě/g, "E").replace(/Š/g, "S").replace(/Č/g, "C").replace(/Ř/g, "R").replace(/Ž/g, "Z").replace(/Ý/g, "Y").replace(/Á/g, "A")
  string = string.replace(/Í/g, "I").replace(/É/g, "E").replace(/Ů/g, "U").replace(/Ú/g, "U").replace(/Ň/g, "N").replace(/Ď/g, "D").replace(/Ť/g, "T")
  string = string.replace(/Ó/g, "O")
  return string
}
exports.converToAscii = convertToAscii
