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

// TODO ADD no limit option for the two following functions.
const articles = async (con, searchTerm="%", limit=10) => {
  // Escepting the search term, but preserving the % wildcard
  if (searchTerm == "%"){
    return await con.query('SELECT * FROM Article WHERE titleArticle LIKE "%" AND isWorkInProgress=FALSE AND isPublic=TRUE ORDER BY publicationDateArticle DESC LIMIT ?;', [limit])
  }
  return await con.query('SELECT * FROM Article WHERE titleArticle LIKE ? AND isWorkInProgress=FALSE AND isPublic=TRUE ORDER BY publicationDateArticle DESC LIMIT ?;', [searchTerm, limit])
}
exports.articles = articles

const allArticles = async (con, searchTerm="%", limit=10) => {
  // Escepting the search term, but preserving the % wildcard
  if (searchTerm == "%"){
    return await con.query('SELECT * FROM Article WHERE titleArticle LIKE "%" ORDER BY publicationDateArticle DESC LIMIT ?;', [limit])
  }
  return await con.query('SELECT * FROM Article WHERE titleArticle LIKE ? ORDER BY publicationDateArticle DESC LIMIT ?;', [searchTerm, limit])
}
exports.allArticles = allArticles

const articleUrlid = async (con, urlid) => {
  let result = await con.query('SELECT * FROM Article WHERE urlidArticle LIKE ? AND isWorkInProgress=FALSE AND isPublic=TRUE LIMIT 1;', [urlid])
  return result
}
exports.articleUrlid = articleUrlid

const allArticleUrlid = async (con, urlid) => {
  let result = await con.query('SELECT * FROM Article WHERE urlidArticle LIKE ? LIMIT 1;', [urlid])
  return result
}
exports.allArticleUrlid = allArticleUrlid

const articleId = async (con, id) => {
  return await con.query("SELECT * FROM Article WHERE idArticle = ? AND isWorkInProgress=FALSE AND isPublic=TRUE LIMIT 1;", [id])
}
exports.articleId = articleId

const allArticleId = async (con, id) => {
  return await con.query("SELECT * FROM Article WHERE idArticle = ? LIMIT 1;", [id])
}
exports.allArticleId = allArticleId

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

const updateArticle = async (con, urlid, title, abstract, isPublic) => {
  try{
    return await con.query(`UPDATE Article SET titleArticle=?, abstractArticle=?, isPublic=? WHERE urlidArticle=? `,
                           [title, abstract, isPublic, urlid])
  }
  catch(err) {
    console.log(err)
    return false
  }
}

const createArticleHasAuthor = async (con, articleId, authorId) => {
  try {
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

const getArticlePath = async (con, ids) => {
  if (ids.urlid) {
    return await con.query('SELECT pathToArticle FROM Article WHERE urlidArticle = ? ', ids.urlid)
  }
  if (ids.id) {
    return await con.query('SELECT pathToArticle FROM Article WHERE idArticle = ? ', ids.ids)
  }
  return null;
}
exports.getArticlePath = getArticlePath

const setArticleWip = async (con, id, state) => {
  if (isNaN(state)) {
    return false
  }
  try {
    await con.query(`UPDATE Article SET isWorkInProgress = ? WHERE idArticle = ?`,
                    [state, id])
    return true
  }
  catch {
    return false
  }
}

const publishNewArticle = async (sqlLogin, config, title, authorIds, tagIds, publicationDate, abstract, mdContent, resources) => {
  try{
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
    let articleId = null
    try{
      articleId = result.response[0].insertId
    }
    catch (err){
      console.log(err)
      return await errorHandle("The database refused to add this article, TIP: Check if ids are unique.", db)
    }

    // Assigning Authors
    try {
      for (const author of authorIds) {
        console.log(articleId)
        console.log(author)
        if (!await createArticleHasAuthor(db, articleId, author)){
          return await errorHandle("Cannot add Authors to database", db)
        }
      }
    }
    catch (err) {
      return await errorHandle(err, db)
    }

    // Assigning Tags
    try {
      for (const tag of tagIds) {
        await createArticleHasTag(db, articleId, tag)
      }
    }
    catch (err) {
      return await errorHandle(err, db)
    }

    // 2. If the db entry was created sucessfully a directory for the article will be
    // created. And the Markdown file will be moved inside. Along with other resources

    // Creating an article in the article root can cause all articles to be deleted.
    if(!result.path){
      return await errorHandle("Empty path of article", db)
    }

    let pathToArticle = path.resolve(path.join(config.articleDirectory, result.path))
    if (pathToArticle === path.resolve(config.articleDirectory)){
      return await errorHandle(`Attempted to create article (${urlid}) with a path in article root`, db)
    }

    let resPath = path.join(pathToArticle, config.articleResourceSubdir)
    try {
      // I. Make directory for the article
      if (fs.existsSync(pathToArticle)){
        return await errorHandle(`Article directory "${result.path}" already exists!`, db)
      }
      fs.mkdirSync(pathToArticle)
      fs.mkdirSync(resPath)

      // II. Move md source to the article directory

      await fs.promises.writeFile(path.join(pathToArticle, config.articleContentFileNameMd),
                        mdContent)
    }
    catch (err) {
      return await errorHandle(err, db, pathToArticle)
    }
    // III. TODO Make subdirectory for resources and move resources for the article there.

    // 3. Pandoc will convert the md file into an html file, that will be saved in
    // the articles directory along with other resources.

    // I. Run pandoc targeting the md file and save the aoutput in the article direcoty
    let htmlPath = path.join(pathToArticle, config.articleContentFileNameHtml)
    let mdPath = path.join(pathToArticle, config.articleContentFileNameMd)
    console.log(htmlPath)
    try {
      await exec(`pandoc --standalone --template ${config.articleCreationTemplate} -o ${htmlPath} < ${mdPath} ;`)
    }
    catch (err) {
      return await errorHandle(err, db, pathToArticle)
    }

    // 4. If everything went ok the articles entry in the database will be altered
    // to work in progress off. The article should then be publicly available
    // on the website.

    if (!await setArticleWip(db, articleId, 0)){
      return await errorHandle("Article WIP state could not be changed", db, pathToArticle)
    }

    // Finalize changes to the db
    await db.commit()
    await db.end()
    console.log(`ARTICLE ${result.path} ADDED SUCCESSFULL`)
    return true
  }
  catch (err) {
    console.log(err)
    return false
  }
}
exports.publishNewArticle = publishNewArticle

const editExistingArticle = async (sqlLogin, config, urlid, title, tagIds, publicationDate, abstract, mdContent, resources, isPublic) => {
  try{
    // 1. Article is created in the database. Work in progress is set to true,
    // so the article is not visible

    const errorHandle = async (err, db, dir) => {
      console.log(err)

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
    let result = await updateArticle(db, urlid, title, abstract, isPublic)
    console.log(result)

    /*
     * TODO The fucking tags lol
    // Assigning Tags
    try {
      for (const tag of tagIds) {
        await createArticleHasTag(db, articleId, tag)
      }
    }
    catch (err) {
      await errorHandle(err, db)
    }
    */

    // Query for the article path lol
    let pathToArticle = path.resolve((await getArticlePath(db, { urlid: urlid }))[0][0].pathToArticle)
    pathToArticle = path.join(config.articleDirectory, pathToArticle)
    if (pathToArticle === path.resolve(config.articleDirectory)){
      return await errorHandle(`Attempted to edit article (${urlid}) with a path in article root`, db)
    }
    if (!fs.existsSync(pathToArticle)){
      return await errorHandle(`Article's (${urlid}) directory (${pathToArticle}) was not found.`, db)
    }

    // Writing the md content into a file
    let htmlPath = path.join(pathToArticle, config.articleContentFileNameHtml)
    let mdPath = path.join(pathToArticle, config.articleContentFileNameMd)
    await fs.promises.writeFile(mdPath, mdContent)
    // III. TODO Make subdirectory for resources and move resources for the article there.

    // 3. Pandoc will convert the md file into an html file, that will be saved in
    // the articles directory along with other resources.

    // I. Run pandoc targeting the md file and save the aoutput in the article direcoty
    try {
      console.log("What the shit")
      await exec(`pandoc --standalone --template ${config.articleCreationTemplate} -o ${htmlPath} < ${mdPath} ;`)
    }
    catch (err) {
      return await errorHandle(err, db, pathToArticle)
    }

    // 4. If everything went ok the articles entry in the database will be altered
    // to work in progress off. The article should then be publicly available
    // on the website.

    // Finalize changes to the db
    await db.commit()
    await db.end()
    console.log(`ARTICLE ${result.path} ADDED SUCCESSFULL`)
    return true
  }
  catch (err) {
    console.log(err)
    return false
  }
}
exports.editExistingArticle = editExistingArticle

const getIdArticleFromUrlid = async (con, urlid) => {
  return (await con.query('SELECT idArticle FROM Article WHERE urlidArticle = ?', urlid))[0][0].idArticle
}

const removeArticleTags = async (con, id) => {
  try {
    return await con.query('DELETE FROM Article_has_Tag WHERE Article_idArticle = ?', id)
  }
  catch (err) {
    console.log(err)
    return false
  }
}

const removeArticleAuthors = async (con, id) => {
  try {
    return await con.query('DELETE FROM Article_has_Author WHERE Article_idArticle = ?', id)
  }
  catch (err) {
    console.log(err)
    return false
  }
}

const removeArticle = async (con, urlid) => {
  // get id
  let id = await getIdArticleFromUrlid(con, urlid)

  // remove tags
  let result = await removeArticleTags(con, id)
  if (!result) {
    console.log(`Cannot remove tags on article ${urlid}`)
    return false
  }

  // remove authors
  result = await removeArticleAuthors(con, id)
  if (!result) {
    console.log(`Cannot remove authors on article ${urlid}`)
    return false
  }

  try {
    return await con.query('DELETE FROM Article WHERE urlidArticle = ?', urlid)
  }
  catch (err) {
    console.log(err)
    return false
  }
}

const deleteExistingArticle = async (sqlLogin, config, urlid) => {
  const errorHandle = async (err, db) => {
    console.log(err)
    await db.rollback()
    await db.query('UPDATE Article SET isWorkInProgress = FALSE WHERE urlidArticle = ?;', urlid)
    await db.end()
    return false
  }

  try {
    let db = await makeSqlConnection(sqlLogin)
    let pathToArticle = (await getArticlePath(db, {urlid: urlid}))[0][0].pathToArticle
    pathToArticle = path.resolve(path.join(config.articleDirectory, pathToArticle))
    if (pathToArticle === path.resolve(config.articleDirectory)){
      return await errorHandle(`Attempted to edit article (${urlid}) with a path in article root`, db)
    }
    console.log("What tyhe fauckgnakjdgf sagfiucssmacj")
    console.log(pathToArticle)

    // set WIP
    await db.query('UPDATE Article SET isWorkInProgress = TRUE WHERE urlidArticle = ?;', urlid)

    // begin transaciton
    await db.beginTransaction()

    // remove article entry from database
    let result = await removeArticle(db, urlid)
    if (!result) {
      return await errorHandle("Problem with removing article from database", db)
    }
    console.log(result)

    // remove files
    try {
      // I. Make directory for the article
      if (fs.existsSync(pathToArticle)){
        fs.rmSync(pathToArticle, { recursive:  true, force: true })
      }
      else {
        return await errorHandle(`Article directory was not found (${pathToArticle})`, db)
      }
    }
    catch (err) {
      console.log(err)
      return await errorHandle("Problem with removing article files", db)
    }

    // commit
    await db.commit()
    await db.end()
    console.log(`Article (${urlid}) removed sucessfully...`)
  }
  catch (err) {
    console.log(err)
  }
}
exports.deleteExistingArticle = deleteExistingArticle
