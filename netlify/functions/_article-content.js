const { runSanityQuery } = require('./_sanity');

const ARTICLE_CONTENT_QUERY = `{
  "post": *[_type=="post"&&_id==$id][0]{
    _id,
    title,
    category,
    excerpt,
    body,
    author,
    publishedAt,
    _updatedAt,
    mainImage,
    editorial,
    labels,
    topics,
    tags,
    seo
  },
  "relatedPosts": *[_type=="post"&&_id!=$id]|order(publishedAt desc)[0...10]{
    _id,
    title,
    category,
    excerpt,
    body,
    publishedAt,
    mainImage,
    editorial,
    labels,
    topics,
    tags
  },
  "latestArticle": *[_type=="post"&&_id!=$id]|order(publishedAt desc)[0...1]{
    _id,
    title,
    category,
    publishedAt,
    editorial,
    labels,
    topics
  }[0]
}`;

async function getArticlePayload(id) {
  const result = await runSanityQuery(ARTICLE_CONTENT_QUERY, { id });
  return {
    post: result && result.post ? result.post : null,
    relatedPosts: Array.isArray(result && result.relatedPosts) ? result.relatedPosts : [],
    latestArticle: result && result.latestArticle ? result.latestArticle : null
  };
}

module.exports = {
  getArticlePayload
};
