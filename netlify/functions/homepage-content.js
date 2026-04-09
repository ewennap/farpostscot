// netlify/functions/homepage-content.js
// Purpose-built homepage editorial payload.

const { SANITY_TOKEN, json, runSanityQuery } = require('./_sanity');

exports.handler = async function () {
  if (!SANITY_TOKEN) {
    return json(500, { error: 'Sanity token not configured', posts: [] }, 'no-store');
  }

  const query = `{
    "posts": *[_type=="post"]|order(publishedAt desc)[0...12]{
      _id,
      title,
      category,
      excerpt,
      author,
      publishedAt,
      _updatedAt,
      mainImage,
      body,
      editorial,
      labels,
      topics,
      tags,
      seo
    }
  }`;

  try {
    const result = await runSanityQuery(query);
    return json(200, {
      posts: Array.isArray(result && result.posts) ? result.posts : []
    });
  } catch (error) {
    console.error('[homepage-content] Error:', error.message);
    return json(500, { error: 'Homepage content unavailable', posts: [] }, 'no-store');
  }
};
