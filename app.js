#!/usr/bin/env node

/// Buildins
const util = require('util')
const path = require('path')
const fs = require('fs')

/// Installed
const mysql = require('mysql')
const express = require('express')

/// Configuration
let config_path = './config.json'
/// Constants
let sql_login_path = './sql_login.json.credentials'

///// FIXME debug constants
//var articles = [
//  {
//   title: "Hello wordl",
//   author: "Ondřej Zobal",
//   content: "Sugonthose nuts",
//  },
//
//  {
//   title: "There is ",
//   author: "Ondřej Zobal",
//   content: "A house in new orlins they call the rising sun",
//  },
//
//
//  {
//   title: "Bool je kok",
//   author: "Alfons Mucha",
//   content: "Smradlaví hoven je král všech muc",
//  },
//
//  {
//   title: "Kajaki na nás válčí",
//   author: "Frajer frajerský",
//   content: "A to se kde jako vzalo takováto informace.",
//  },
//
//]

/// Loading Configuration
let config = fs.readFileSync(config_path)
config = JSON.parse(config)

/// Connecting to the SQL database
let sql_login = fs.readFileSync(sql_login_path)
sql_login = JSON.parse(sql_login)

/// Public website
const app = express()
// Test query
const sql_con =  mysql.createConnection(sql_login)
sql_con.connect((err) => {
  if (err) throw err
  else {
    console.log("connected")
  }
})


// Starting the webserver
app.set('view engine', 'ejs')

app.get('/', async (req, res) => {
  let art = sql_con.query("SELECT * FROM Article", (err, result, asdf) => {
    if (err) {
      res.status(500)
      res.send(":( Database Brokeeee")
    }
    else {
      res.render('./pages/index.ejs', {articles: result})
    }
  })
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

/// Admin web
const admin = express()
admin.set('view engine', 'ejs')
admin.all('*', (req, res) => {
  res.status(200)
  res.sendFile(path.resolve(__dirname, './404.html'))
})
admin.listen(5001, () => {
  console.log('Starting admin panel')
})
