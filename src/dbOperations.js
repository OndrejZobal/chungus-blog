/// Standard modules
const fs = require('fs')
const path = require('path')
const util = require('util')
const exec = util.promisify(require("child_process").exec);

/// Imported modules
const mysql = require('mysql2/promise')
const { response } = require('express');

/// Local modules
const tools = require('./tools')


/// Connecting with the mySQL database
const makeSqlConnection = async (sqlLogin) => {
  return sql_con = await mysql.createConnection(sqlLogin)
}
exports.makeSqlConnection = makeSqlConnection;

const articles = async (con, searchTerm="%", limit=10) => {
  // Escepting the search term, but preserving the % wildcard
  if (searchTerm == "%"){
    return await con.query('SELECT * FROM Article WHERE titleArticle LIKE "%" AND isWorkInProgress=FALSE AND isPublic=TRUE ORDER BY publicationDateArticle DESC LIMIT ?;', [limit])
  }
  return await con.query('SELECT * FROM Article WHERE titleArticle LIKE ? ORDER BY publicationDateArticle DESC LIMIT ?;', [searchTerm, limit])
}
exports.articles = articles

const articleUrlid = async (con, urlid) => {
  let result = await con.query('SELECT * FROM Article WHERE urlidArticle LIKE ? AND isWorkInProgress=FALSE AND isPublic=TRUE LIMIT 1;', [urlid])
  return result
}
exports.articleUrlid = articleUrlid

const articleId = async (con, id) => {
  return await con.query("SELECT * FROM Article WHERE idArticle = ? AND isWorkInProgress=FALSE AND isPublic=TRUE LIMIT 1;", [id])
}
exports.articleId = articleId

const articleAuthors = async (con, id) => {
  return await con.query(`SELECT Author.idAuthor, Author.nameAuthor, Author.surnameAuthor,
                          Author.photoPathAuthor, Author.usernameAuthor FROM Author
                          INNER JOIN Article_has_Author
                          ON Article_has_Author.Author_idAuthor=Author.idAuthor
                          WHERE Article_has_Author.Article_idArticle= ?;`, [id])
}
exports.articleAuthors = articleAuthors

const createWIPArticle = async (con, title, abstract, publicationDate) => {
  console.log(title)
  let urlid = title
  if (urlid.length > 64){
    urlid = urlid.substr(0, 64)
  }
  urlid = tools.converToAscii(urlid.trim())
  urlid = urlid.replace(/ /g, "-")
  urlid = urlid.replace(/[^0-9a-z-]/gi, '')
  let path = urlid.replace(/-/g, "_").toLowerCase() + '/'

  try{
    return {
      response: await con.query(`INSERT INTO Article (urlidArticle, abstractArticle,
                                publicationDateArticle, pathToArticle, titleArticle,
                                isPublic, isWorkInProgress) VALUES (?, ?, ?, ?, ?,
                                TRUE, TRUE);`, [urlid, abstract, publicationDate,
                                                path, title]),
      urlid: urlid,
      path: path
    }
  }
  catch {
    return false
  }
}
exports.createWIPArticle = createWIPArticle

const createArticleHasAuthor = async (con, articleId, authorId) => {
  try {
    console.log("What the fuck")
    console.log(articleId)
    console.log(authorId)
    return await con.query(`INSERT INTO Article_has_Author (Article_idArticle, Author_idAuthor) VALUES (?, ? );`, [articleId, authorId])
  }
  catch (err) {
    console.log(err)
    return false
  }
}
exports.createArticleHasAuthor = createArticleHasAuthor

const createArticleHasTag = async (con, articleId, tagId) => {
  try {
    return await con.query(`INSERT INTO Article_has_Tag (Article_idArticle, Tag_idTag) VALUES (?, ? );`, [articleId, tagId])
  }
  catch {
    return false
  }
}
exports.createArticleHasTag = createArticleHasTag

const setArticleWip = async (con, id, state) => {
  if (isNaN(state)) {
    console.log("omega pepega")
    return false
  }
  try {
    await con.query(`UPDATE Article SET isWorkInProgress = ? WHERE idArticle = ?`,
                    [state, id])
    return true
  }
  catch {
    console.log("Trulo nulo")
    return false
  }
}

const publishNewArticle = async (sqlLogin, config, title, authorIds, tagIds, publicationDate, abstract, mdContent, resources) => {
  // 1. Article is created in the database. Work in progress is set to true,
  // so the article is not visible

  const errorHandle = async (err, db, dir) => {
    console.log(err)
    try {
      if (dir){
        if (fs.existsSync(dir)){
          fs.rmSync(dir, { recursive:  true, force: true })
        }
      }
    }
    catch (err) {
      console.log("Error while reverting changes from unsuccesfull attenpt at adding article.")
      console.log(err)
    }

    await db.rollback()
    await db.end()
    return false;
  }

  // Making a brand new db connection to do transactions on.

  let db = null
  try {
    db = await makeSqlConnection(sqlLogin)
  }
  catch (err) {
    console.log(err)
    return
  }

  await db.beginTransaction()

  // Creating article entry in the database
  let result = await createWIPArticle(db, title, abstract,
                                      publicationDate)
  if (!result.response){
    await errorHandle("The database refused to add this article, TIP: Check if ids are unique.", db)
  }
  let articleId = result.response[0].insertId

  // Assigning Authors
  try {
    for (const author of authorIds) {
      console.log(articleId)
      if (!await createArticleHasAuthor(db, articleId, author)){
        await errorHandle("Cannot add Authors to database", db)
      }
    }
  }
  catch (err) {
    await errorHandle(err, db)
  }

  // Assigning Tags
  try {
    for (const tag of tagIds) {
      await createArticleHasTag(db, articleId, tag)
    }
  }
  catch (err) {
    await errorHandle(err, db)
  }

  // 2. If the db entry was created sucessfully a directory for the article will be
  // created. And the Markdown file will be moved inside. Along with other resources

  console.log(config.articleDirectory)
  console.log(result.path)
  let pathToArticle = path.join(config.articleDirectory, result.path)
  let resPath = path.join(pathToArticle, config.articleResourceSubdir)
  try {
    // I. Make directory for the article
    if (fs.existsSync(pathToArticle)){
      await errorHandle(`Article directory "${result.path}" already exists!`, db)
    }
    fs.mkdirSync(pathToArticle)
    fs.mkdirSync(resPath)

    // II. Move md source to the article directory

    await fs.promises.writeFile(path.join(pathToArticle, config.articleContentFileNameMd),
                      mdContent)
  }
  catch (err) {
    await errorHandle(err, db, pathToArticle)
  }
  // III. TODO Make subdirectory for resources and move resources for the article there.

  // 3. Pandoc will convert the md file into an html file, that will be saved in
  // the articles directory along with other resources.

  // I. Run pandoc targeting the md file and save the aoutput in the article direcoty
  let htmlPath = path.join(pathToArticle, config.articleContentFileNameHtml)
  let mdPath = path.join(pathToArticle, config.articleContentFileNameMd)
  console.log(htmlPath)
  try {
    console.log("What the shit")
    await exec(`pandoc --standalone --template ${config.articleCreationTemplate} -o ${htmlPath} < ${mdPath} ;`)
  }
  catch (err) {
    await errorHandle(err, db, pathToArticle)
  }

  // 4. If everything went ok the articles entry in the database will be altered
  // to work in progress off. The article should then be publicly available
  // on the website.

  if (!await setArticleWip(db, articleId, 0)){
    await errorHandle("Article WIP state could not be changed", db, pathToArticle)
  }

  // Finalize changes to the db
  await db.commit()
  await db.end()
  console.log(`ARTICLE ${result.path} ADDED SUCCESSFULL`)
}

exports.publishNewArticle = publishNewArticle
