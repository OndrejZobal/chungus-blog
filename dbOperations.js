const {esc = escape} = require('sqlstring');

const articles = (searchTerm="%", limit=10) => {
  // Escepting the search term, but preserving the % wildcard
  if (searchTerm != "%"){
    searchTerm = esc(searchTerm)
  }
  return `SELECT * FROM Article WHERE titleArticle LIKE "${searchTerm}" ORDER BY publicationDateArticle LIMIT ${esc(limit)};`
}
exports.articles = articles

const articleUrlid = (urlid) => {
  return `SELECT * FROM Article WHERE urlidArticle LIKE "${esc(urlid)}" LIMIT 1;`
}
exports.articleUrlid = articleUrlid

const articleId = (id) => {
  return `SELECT * FROM Article WHERE idArticle = ${esc(id)} LIMIT 1;`
}
exports.articleId = articleId

const articleAuthors = (id) => {
  return `SELECT Author.idAuthor, Author.nameAuthor, Author.surnameAuthor,
          Author.photoPathAuthor, Author.usernameAuthor FROM Author
          INNER JOIN Article_has_Author
          ON Article_has_Author.Author_idAuthor=Author.idAuthor
          WHERE Article_has_Author.Article_idArticle=${esc(id)};`
}
exports.articleAuthors = articleAuthors
