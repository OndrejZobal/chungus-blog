#!/usr/bin/env node

/// Buildins
const util = require('util')
const path = require('path')
const fs = require('fs').promises
const fssync = require('fs')
const child_processes = require('child_process')
const exec = util.promisify(child_processes.exec)

/// Installed
const mysql = require('mysql2/promise')
const express = require('express')

/// Local
const dbop = require('./dbOperations')
const tools = require('./tools')
const {fprint} = tools

/// Configuration
let config_path = './config.json'
/// Constants
let sql_login_path = './sql_login.json.credentials'

/// Loading Configuration
let config = fssync.readFileSync(config_path)
config = JSON.parse(config)
config.pathTo404 = path.resolve(__dirname, config.pathTo404)

/// Connecting to the SQL database
let sqlLogin = fssync.readFileSync(sql_login_path)
sqlLogin = JSON.parse(sqlLogin)

/// Public website
const app = express()

/// Connecting with the mySQL database
const makeSqlConnection = async (sql_con) => {
  return sql_con = await mysql.createConnection(sqlLogin)
}
let sql_con = null
makeSqlConnection(sql_con).then((con) => {
  sql_con = con
})

app.use(express.static('./public'))

// Starting the webserver
app.set('view engine', 'ejs')
app.get('/:article', async (req, res) => {
  const serve = async (res, article) => {
    if(article.length > 0){
      let authors = (await sql_con.query(dbop.articleAuthors(article[0].idArticle)))[0]
      // Get the actual article file :)
      let content = await fs.readFile(`./articles/${article[0].pathToArticle}/article.html`)
      await res.render('./pages/article.ejs', {
        article: article[0],
        content:content,
        authors: authors
      })
      fprint(`Article "${article[0].titleArticle}" served.`)
      return true
    }
  }

  // Find article by id nymber
  if (!isNaN(req.params.article)){
    if (await serve(res, (await sql_con.query(dbop.articleId(req.params.article)))[0])) {
      return
    }
  }

  // Querry for article using urlid
  if (await serve(res, (await sql_con.query(dbop.articleUrlid(req.params.article)))[0])) {
    return
  }

  // Give the ol' 404
  await tools.sendNotFound(res, config.pathTo404)
})

app.get('/', async (req, res) => {
  let result = (await sql_con.query(dbop.articles()))[0]
  // Doing your mom
  let sex = await fs.readFile('./quote.txt')
  res.render('./pages/index.ejs', {articles: result, sex: sex})
})

// app.get('/', (req, res) => {
//   res.sendFile(path.resolve(__dirname, './index.html'))
// })


app.all('*', (req, res) => {
  tools.sendNotFound(res, config.pathTo404)
})

app.listen(5000, ()=> {
  console.log('Beeing a dirty baka!')
})
