#!/usr/bin/env node

/*
 *  Chungus Blog
 *  Copyright (C) 2022  Ondřej Zobal
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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

/**
 * A function for putting the page content into a final template and sending it off
 *to the client.
 * @param res A response object where the page will be sent
 * @param content String of HTML that will be put inside of the template
 * @param options An object for setting aditional optional parameters:
 *     - options.title: A string containing the page title.
 *     - options.og: Object containing openGraph parameters.
 *     - options.highlight: Index number of menubar item that should be highlighted as selected
 * 0 means nothing will be selected.
 *     - options.logo: Path to an image that will be displayed as the page logo.
 *     - options.template: The path to the template file.
 */
const renderInTemplate = async (res, content, options) => {
                                // logo='/img/bigchungus.png',
                                // template='./pages/template.ejs') => {
  if (!options.title){
    options.title = config.webTitle
  }
  else {
    options.title += ' | ' + config.webTitle
  }

  await res.render(options.template || config.mainTemplate , {
    title: options.title,
    logo: options.logo || config.mainLogo,
    content: content,
    highlight: options.highlight || 0,
    og: options.og,
  })
}

const sendNotFound = async (res, path) => {
  res.status(404)

  let content = await ejs.renderFile(config.pathTo404, { path: res.req.path })
  await renderInTemplate(res, content, { title:'Whoopsieee...', highlight: 0, logo: config.errorLogo })
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
  await renderInTemplate(res, content, { title: "Caught in 4K", highlight: 0, logo: "/img/creepy_trollface.gif" })
})

// A funny little easter egg to troll shitty script kiddies
admin.get('/secretadmin', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/admin.ejs')
  await renderInTemplate(res, content, { title: "Admin Panel", highlight: 0, logo: config.adminLogo })
})

admin.get('/secretadmin/compose', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/compose_article.ejs', {
    title: "",
    abstract: "",
    article: "",
    status: "",
    action: req.path,
  })
  await renderInTemplate(res, content, { title: "Compose a new article", highlight: 0, logo: config.adminLogo })
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
    await renderInTemplate(res, result, { title: "Publishing artilce", highlight: 0, logo: config.adminLogo })
  }
  else {
    let content = await ejs.renderFile('./views/pages/compose_article.ejs', {
      title: req.body.title,
      abstract: req.body.abstract,
      article: req.body.article,
      status: result,
      action: req.path,
    })
    await renderInTemplate(res, content, { title: "Error", highlight: 0, logo: config.adminLogo })
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
  await renderInTemplate(res, content, { title: "Compose a new article", highlight: 0, logo: config.adminLogo })
})

admin.post('/secretadmin/compose/:article', tools.bodyCrlfToLf, async (req, res) => {
  let urlid = req.path.match(/[^\/]*$/)[0]

  if (req.body["publish"] !== undefined && req.body["delete"] === undefined){
    let result =  await dbop.editExistingArticle(sqlLogin, config, urlid, req.body.title, null, null, req.body.abstract, req.body.article, null, 1)
    await renderInTemplate(res, result, { title: "done", highlight: 0, logo: config.adminLogo })
  }
  else if (req.body["publish"] === undefined && req.body["delete"] !== undefined){
    let result =  await dbop.deleteExistingArticle(sqlLogin, config, urlid, req.body.title, null, null, req.body.abstract, req.body.article, null, 1)
    await renderInTemplate(res, result, { title:"done", highlight: 0, logo: config.adminLogo })
  }
})

admin.get('/secretadmin/articles', async (req, res) => {
  let articles = (await dbop.allArticles(sql_con, "%", 1000))[0]
  let content = await ejs.renderFile('./views/pages/admin_articles.ejs', { articles: articles })
  await renderInTemplate(res, content, { title:"All articles", highlight: 0, logo: config.adminLogo })
})

app.get('/articles', async (req, res) => {
  let search = "%"
  if(req.query.search){
    search = `%${req.query.search}%`
  }

  let articles = (await dbop.articles(sql_con, search, limit=10000))[0]
  let content = await ejs.renderFile('./views/pages/articles.ejs', {
    action: req.path,
    articles: articles,
    search: req.query.search,
  })
  await renderInTemplate(res, content, { title: "Články", highlight: 2 })
})

app.get('/guestbook', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/guestbook.ejs')
  await renderInTemplate(res, content, { title: "Návštěvní kniha", highlight: 3 })
})

app.get('/about', async (req, res) => {
  let content = await ejs.renderFile('./views/pages/about.ejs')

  let og = {
    title: "O Čangasovi",
    type: "website",
    image: config.baseUrl + config.mainLogo.substring(1), // TODO add images to articles. Also make the substringing more stable
    url: config.baseUrl + req.path.substring(1),
    locale: config.locale,
    description: "",
    site_name: config.webTitle,
  }

  await renderInTemplate(res, content, { title: "O Čangasovi", highlight: 4, og })
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
    let logo = null
    if(article.length > 0){
      let authors = (await dbop.articleAuthors(sql_con, article[0].idArticle))[0]
      // Get the actual article file :)
      let content = null
      try {
        content = await fs.readFile(path.join(config.articleDirectory, article[0].pathToArticle, config.articleContentFileNameHtml))}
      catch (err) {
        console.log(err)
        res.status(500)
        content = '<span style="color: red">Server cannot display this article</span>'
        logo = config.errorLogo
      }


      let rendered = await ejs.renderFile('./views/pages/article.ejs', {
        article: article[0],
        content: content,
        authors: authors
      })

      let og = {
        title: article[0].titleArticle,
        type: "article",
        image: config.baseUrl + config.mainLogo.substring(1), // TODO add images to articles. Also make the substringing more stable
        url: config.baseUrl + req.path.substring(1),
        locale: config.locale,
        description: article[0].abstractArticle,
        site_name: config.webTitle,
      }

      await renderInTemplate(res, rendered, { title: title=article[0].titleArticle, highlight: 2, og, logo })
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

// Le article cdn has arrived 🧢.
app.get('/:article/*', async (req, res) => {
  // Remove the article from the path
  let localPath = req.path.replace(/^\/[^/]*/, "")

  /*
   * If i understand things correctly there is no way for the client to escape
   * the article's res directory, because '..' gets resolved in the entire url
   * beforehand.
   */

  // Get the full resource path of the article.
  let article = (await dbop.articleUrlid(sql_con, req.params.article))[0]

  // Handle the article not existing.
  if (!article[0]) {
    sendNotFound(res, config.pathTo404);
    return;
  }
  // Building the whole path.
  let resourcePath = path.resolve(path.join(config.articleDirectory, article[0].pathToArticle, config.articleResourceSubdir, localPath))

  // Handle the file not existing
  if(!fssync.existsSync(resourcePath)) {
    sendNotFound(res, config.pathTo404);
    return;
  }

  // And off you go!
  res.sendFile(resourcePath)
})

app.get('/', async (req, res) => {
  let result = (await dbop.articles(sql_con, "%", 5))[0]
  // Doing your mom
  let sex = await fs.readFile('./quote.txt')
  let content = await ejs.renderFile('./views/pages/home.ejs', {articles: result, sex: sex})

  let og = {
    title: config.webTitle,
    type: "website",
    image: config.baseUrl + config.mainLogo.substring(1), // TODO Make the substringing more stable
    url: config.baseUrl + req.path.substring(1),
    locale: config.locale,
    description: "Vstoupit smí každý. S odchodem už to ale tak jednoduché nebude...",
    site_name: config.webTitle,
  }

  await renderInTemplate(res, content, { title:"", highlight: 1, og } )
})

// app.get('/', (req, res) => {
//   res.sendFile(path.resolve(__dirname, './index.html'))
// })


app.all('*', (req, res) => {
  sendNotFound(res, config.pathTo404)
})

app.listen(config.webPort, ()=> {
  console.log('Beeing a dirty baka!')
})

admin.all('*', (req, res) => {
  sendNotFound(res, config.pathTo404)
})

admin.listen(config.managementPort, ()=> {
  console.log('Beeing a dirty baka!')
})
