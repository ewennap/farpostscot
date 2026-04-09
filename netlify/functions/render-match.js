const { SPORTMONKS_TOKEN, getMatchDetail } = require('./_match-detail');
const { buildMatchMetadata, injectMetadataBlock, readTemplateHtml } = require('../../lib/page-head');

exports.handler = async function (event) {
  let html;

  try {
    html = await readTemplateHtml('match.html');
  } catch (error) {
    console.error('[render-match] Template error:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'Match template unavailable'
    };
  }

  const fixtureId = event.queryStringParameters && event.queryStringParameters.id;
  if (!fixtureId || !SPORTMONKS_TOKEN) {
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
    const payload = await getMatchDetail(fixtureId);
    if (payload && payload.data) {
      html = injectMetadataBlock(html, buildMatchMetadata(payload.data, {
        headers: event.headers,
        leagueId: event.queryStringParameters && event.queryStringParameters.league
      }));
    }
  } catch (error) {
    console.error('[render-match] Metadata error:', error.message);
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
