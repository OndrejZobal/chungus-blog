#!/usr/bin/env node

/// Buildins
const util = require('util')
const path = require('path')
const fs = require('fs').promises
const fssync = require('fs')
const child_processes = require('child_process')
const exec = util.promisify(child_processes.exec)

/// Installed
const express = require('express')
const ejs = require('ejs')
const bodyParser = require('body-parser')

/// Local
const dbop = require('./src/dbOperations')
const tools = require('./src/tools')
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
const admin = express()

let sql_con = null
dbop.makeSqlConnection(sqlLogin).then((con) => {
  sql_con = con
})

const renderInTemplate = async (res, content, title='', highlight=0,
                                logo='/img/bigchungus.png',
                                template='./pages/template.ejs') => {
  if (title === ''){
    title = config.webTitle
  }
  else {
    title += ' | ' + config.webTitle
  }

  await res.render(template, {
    title: title,
    logo: logo,
    content: content,
    highlight: highlight
  })
}

const sendNotFound = async (res, path) => {
  res.status(404)

  let content = await ejs.renderFile(config.pathTo404, { path: res.req.path })
  await renderInTemplate(res, content, title='Whoopsieee...', 0, '/img/sadcat.png')
}

app.use(express.static('./public'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Starting the webserver
app.set('view engine', 'ejs')

// Starting the webserver
admin.set('view engine', 'ejs')
admin.use(express.static('./public'))
admin.use(express.json())
admin.use(express.urlencoded({extended: true}))
admin.set('view engine', 'ejs')

// A funny little easter egg to troll shitty script kiddies
app.get('/admin', async (req, res) => {
  let content = await fs.readFile('./views/pages/epic_hacker.html')
  await renderInTemplate(res, content, "Caught in 4K", 0, "/img/creepy_trollface.gif")
})

// A funny little easter egg to troll shitty script kiddies
admin.get('/secretadmin', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/admin.ejs')
  await renderInTemplate(res, content, "Admin Panel", 0, "/img/flushed_round.gif")
})

admin.get('/secretadmin/compose', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/compose_article.ejs', {
    title: "",
    abstract: "",
    article: "",
    status: "",
    action: req.path,
  })
  await renderInTemplate(res, content, "Compose a new article", 0, "/img/flushed_round.gif")
})

admin.post('/secretadmin/compose', tools.bodyCrlfToLf, async (req, res) => {
  date = new Date(Date.now())
  stringDate = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`
  let result = await dbop.publishNewArticle(sqlLogin, config, req.body.title, [1], [], stringDate, req.body.abstract, req.body.article, [])

  console.log({
      title: req.body.title,
      abstract: req.body.abstract,
      article: req.body.article,
      status: result
  })
  if (result){
    let content = await ejs.renderFile('./views/pages/admin.ejs')
    await renderInTemplate(res, result, "Publishing artilce", 0, "/img/flushed_round.gif")
  }
  else {
    let content = await ejs.renderFile('./views/pages/compose_article.ejs', {
      title: req.body.title,
      abstract: req.body.abstract,
      article: req.body.article,
      status: result,
      action: req.path,
    })
    await renderInTemplate(res, content, "Error", 0, "/img/flushed_round.gif")
  }
})

admin.get('/secretadmin/compose/:article', async (req, res) => {
  let article = (await dbop.allArticleUrlid(sql_con, req.params.article))[0][0]
  //let pathToArticle = await dbop.getArticlePath(con, {urlid: req.params.article})
  if (!article) {
    await sendNotFound(res, config.pathTo404)
    return
  }
  let pathToArticle = path.join(config.articleDirectory, article.pathToArticle, config.articleContentFileNameMd)
  let articleContent = await fs.readFile(pathToArticle, 'utf8')
  console.log(articleContent)
  let content = await ejs.renderFile('./views/pages/compose_article.ejs', {
    title: article.titleArticle,
    abstract: article.abstractArticle,
    article: articleContent,
    status: "",
    action: req.path,
  })
  await renderInTemplate(res, content, "Compose a new article", 0, "/img/flushed_round.gif")
})

admin.post('/secretadmin/compose/:article', tools.bodyCrlfToLf, async (req, res) => {
  let urlid = req.path.match(/[^\/]*$/)[0]

  if (req.body["publish"] !== undefined && req.body["delete"] === undefined){
    let result =  await dbop.editExistingArticle(sqlLogin, config, urlid, req.body.title, null, null, req.body.abstract, req.body.article, null, 1)
    await renderInTemplate(res, result, "done", 0, "/img/flushed_round.gif")
  }
  else if (req.body["publish"] === undefined && req.body["delete"] !== undefined){
    let result =  await dbop.deleteExistingArticle(sqlLogin, config, urlid, req.body.title, null, null, req.body.abstract, req.body.article, null, 1)
    await renderInTemplate(res, result, "done", 0, "/img/flushed_round.gif")
  }
})

admin.get('/secretadmin/articles', async (req, res) => {
  let articles = (await dbop.allArticles(sql_con, "%", 1000))[0]
  let content = await ejs.renderFile('./views/pages/admin_articles.ejs', { articles: articles })
  await renderInTemplate(res, content, "All articles", 0, "/img/flushed_round.gif")
})

app.get('/articles', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/articles.ejs')
  await renderInTemplate(res, content, "Články", 2)
})

app.get('/guestbook', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/guestbook.ejs')
  await renderInTemplate(res, content, "Návštěvní kniha", 3)
})

app.get('/about', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/about.ejs')
  let mdContent = "# What the shit is pooping on!\nThe heck **is this shit**..."
  await dbop.editExistingArticle(sqlLogin, config, "Proof-this-works", "doing your mom", [], null, "What the shit just happened here", mdContent, null, 1)
  // await dbop.publishNewArticle(sqlLogin, config, "New Proof this works", [1], [1], "4024-1-30", "This is a short description of the article that is funny and eye catching", "# Hello world!\nHow is it **going**? xd", 0)
  await renderInTemplate(res, content, "O Čangasovi", 4)
})

app.get('/atom', async (req, res) => {
  let articles = (await dbop.articles(sql_con, "%", 25))[0]
  if (articles === undefined){
    res.send('error')
  }
  try {
    if (articles.length < 1) {
      res.send('error')
    }
  }
  catch {
    res.send('error')
  }

  res.setHeader('content-type', 'application/atom+xml')
  let lastEdit = articles[0].editDateArticle === null ? articles[0].publicationDateArticle : articles[0].editDateArticle
  console.log(lastEdit)
  latstEdit = `${lastEdit.getFullYear()}-${lastEdit.getMonth()+1}-${lastEdit.getDate()}`
  await res.render('./pages/atom.ejs', {
    webTitle: config.webTitle,
    baseUrl: config.baseUrl,
    ownerName: config.ownerName,
    ownerEmail: config.ownerEmail,
    lastUpdate: lastEdit,
    articles: articles
  })
})

app.get('/:article', async (req, res) => {
  const serve = async (res, article) => {
    if(article.length > 0){
      let authors = (await dbop.articleAuthors(sql_con, article[0].idArticle))[0]
      // Get the actual article file :)
      let content = await fs.readFile(`./articles/${article[0].pathToArticle}/article.html`)

      let rendered = await ejs.renderFile('./views/pages/article.ejs', {
        article: article[0],
        content: content,
        authors: authors
      })
      await renderInTemplate(res, rendered, title=article[0].titleArticle, 2)
      fprint(`Article "${article[0].titleArticle}" served.`)
      return true
    }
  }

  // Find article by id number
  if (!isNaN(req.params.article)){
    if (await serve(res, (await dbop.articleId(sql_con, req.params.article))[0])) {
      return
    }
  }

  // Querry for article using urlid
  if (await serve(res, (await dbop.articleUrlid(sql_con, req.params.article))[0])) {
    return
  }

  // Give the ol' 404
  await sendNotFound(res, config.pathTo404)
})

app.get('/', async (req, res) => {
  let result = (await dbop.articles(sql_con))[0]
  // Doing your mom
  let sex = await fs.readFile('./quote.txt')
  let content = await ejs.renderFile('./views/pages/home.ejs', {articles: result, sex: sex})
  await renderInTemplate(res, content, "", 1 )
})

// app.get('/', (req, res) => {
//   res.sendFile(path.resolve(__dirname, './index.html'))
// })


app.all('*', (req, res) => {
  sendNotFound(res, config.pathTo404)
})

app.listen(5000, ()=> {
  console.log('Beeing a dirty baka!')
})

admin.all('*', (req, res) => {
  sendNotFound(res, config.pathTo404)
})

admin.listen(5001, ()=> {
  console.log('Beeing a dirty baka!')
})
