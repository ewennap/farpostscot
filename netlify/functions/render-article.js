const { SANITY_TOKEN } = require('./_sanity');
const { getArticlePayload } = require('./_article-content');
const { buildArticleMetadata, injectMetadataBlock, readTemplateHtml } = require('../../lib/page-head');

exports.handler = async function (event) {
  let html;

  try {
    html = await readTemplateHtml('article.html');
  } catch (error) {
    console.error('[render-article] Template error:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Article template unavailable'
    };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id || !SANITY_TOKEN) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60'
      },
      body: html
    };
  }

  try {
    const payload = await getArticlePayload(id);
    if (payload && payload.post) {
      html = injectMetadataBlock(html, buildArticleMetadata(payload.post, {
        headers: event.headers,
        id
      }));
    }
  } catch (error) {
    console.error('[render-article] Metadata error:', error.message);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    },
    body: html
  };
};
