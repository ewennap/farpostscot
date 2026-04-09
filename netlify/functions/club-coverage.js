// netlify/functions/club-coverage.js
// Purpose-built editorial coverage feed for club pages.

const { SANITY_TOKEN, json, runSanityQuery } = require('./_sanity');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function coerceArray(value) {
  if (Array.isArray(value)) return value.filter(function (item) { return item != null && item !== ''; });
  if (value == null || value === '') return [];
  return [value];
}

function uniqueStrings(items) {
  const seen = new Set();
  return coerceArray(items).reduce(function (list, item) {
    let value = '';
    if (typeof item === 'string') value = item;
    else if (item && typeof item === 'object') value = item.title || item.name || item.label || item.value || '';
    value = String(value || '').trim();
    if (!value) return list;
    const key = normalizeText(value);
    if (seen.has(key)) return list;
    seen.add(key);
    list.push(value);
    return list;
  }, []);
}

function extractPortableText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(function (block) {
    if (!block || !Array.isArray(block.children)) return '';
    return block.children.map(function (child) {
      return child && child.text ? child.text : '';
    }).join(' ');
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function extractNamedValues(source, keys) {
  if (!source || !Array.isArray(keys) || !keys.length) return [];
  let values = [];
  keys.forEach(function (key) {
    if (source[key] == null) return;
    values = values.concat(uniqueStrings(source[key]));
  });
  return uniqueStrings(values);
}

function relatedTeams(post) {
  const editorial = (post && post.editorial) || {};
  return uniqueStrings(
    []
      .concat(extractNamedValues(editorial, ['relatedTeams', 'clubs', 'teams']))
      .concat(extractNamedValues(post, ['relatedTeams', 'clubs', 'teams']))
  );
}

function matchesClub(post, team) {
  const normalizedTeam = normalizeText(team);
  if (!normalizedTeam) return false;

  const teams = relatedTeams(post).map(normalizeText);
  if (teams.includes(normalizedTeam)) return true;

  const haystack = [
    post && post.title,
    post && post.excerpt,
    extractPortableText(post && post.body)
  ].join(' ').toLowerCase();

  return haystack.includes(normalizedTeam);
}

exports.handler = async function (event) {
  const team = event.queryStringParameters && event.queryStringParameters.team;

  if (!team || !String(team).trim()) {
    return json(400, { error: 'Club team name is required', articles: [] }, 'no-store');
  }

  if (!SANITY_TOKEN) {
    return json(200, { articles: [] }, 'no-store');
  }

  const query = `*[_type=="post"]|order(publishedAt desc)[0...8]{
    _id,
    title,
    category,
    excerpt,
    author,
    publishedAt,
    body,
    mainImage,
    editorial,
    labels,
    topics
  }`;

  try {
    const result = await runSanityQuery(query);
    const articles = Array.isArray(result) ? result : [];
    const matched = articles
      .filter(function (post) { return matchesClub(post, team); })
      .slice(0, 3)
      .map(function (post) {
        return {
          _id: post._id,
          title: post.title,
          category: post.category,
          excerpt: post.excerpt,
          author: post.author,
          publishedAt: post.publishedAt,
          mainImage: post.mainImage || null
        };
      });

    return json(200, { articles: matched });
  } catch (error) {
    console.error('[club-coverage] Error:', error.message);
    return json(200, { articles: [] }, 'no-store');
  }
};
