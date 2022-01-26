/// Buildins
const path = require('path')
const fs = require('fs')

/// Installed
const mysql = require('mysql')
/// Express
const express = require('express')
const app = express()

/// Constants
const SQL_LOGIN_PATH = 'sql.json.credentials'

/// FIXME debug constants
var articles = [
  {
   title: "Hello wordl",
   author: "Ondřej Zobal",
   content: "What is going on gang!",
  },

  {
   title: "There is ",
   author: "Ondřej Zobal",
   content: "A house in new orlins they call the rising sun",
  },


  {
   title: "Bool je kok",
   author: "Alfons Mucha",
   content: "Smradlaví hoven je král všech muc",
  },

  {
   title: "Kajaki na nás válčí",
   author: "Frajer frajerský",
   content: "A to se kde jako vzalo takováto informace.",
  },

]

/// SQL Connection
let sql_login = fs.readFileSync(SQL_LOGIN_PATH)
sql_login = JSON.parse(sql_login)

const sql_con =  mysql.createConnection(sql_login)
sql_con.connect((err) => {
  if (err) throw err
  else console.log("connected")
})

/// Web server
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
  res.render('./pages/index.ejs', {articles: articles})
})

// app.get('/', (req, res) => {
//   res.sendFile(path.resolve(__dirname, './index.html'))
// })

app.use(express.static('./public'))

app.all('*', (req, res) => {
  res.status(404)
  res.sendFile(path.resolve(__dirname,'./404.html'))
})

app.listen(5000, ()=> {
  console.log('Beeing a dirty baka!')
})
