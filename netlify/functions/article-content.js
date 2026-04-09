// netlify/functions/article-content.js
// Purpose-built article page payload.

const { SANITY_TOKEN, json } = require('./_sanity');
const { getArticlePayload } = require('./_article-content');

exports.handler = async function (event) {
  if (!SANITY_TOKEN) {
    return json(500, {
      error: 'Sanity token not configured',
      post: null,
      relatedPosts: [],
      latestArticle: null
    }, 'no-store');
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return json(400, {
      error: 'Article id is required',
      post: null,
      relatedPosts: [],
      latestArticle: null
    }, 'no-store');
  }

  try {
    const result = await getArticlePayload(id);
    return json(200, result);
  } catch (error) {
    console.error('[article-content] Error:', error.message);
    return json(500, {
      error: 'Article content unavailable',
      post: null,
      relatedPosts: [],
      latestArticle: null
    }, 'no-store');
  }
};
