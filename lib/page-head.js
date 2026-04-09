const fs = require('node:fs/promises');
const path = require('node:path');

const SANITY_PROJECT_ID = 't11tx9if';
const SANITY_DATASET = 'production';
const HEAD_BLOCK_PATTERN = /<!-- FP_HEAD_START -->[\s\S]*?<!-- FP_HEAD_END -->/;

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeJson(value) {
  return String(value == null ? '' : value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function truncateText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text || !maxLength || text.length <= maxLength) return text;
  return text.slice(0, Math.max(0, maxLength - 1)).trim() + '\u2026';
}

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

function categoryLabel(category) {
  return ({
    opinion: 'Opinion',
    analysis: 'Analysis',
    news: 'News',
    interview: 'Interview',
    feature: 'Feature'
  }[category] || 'Article');
}

function storyLabel(post) {
  const editorial = (post && post.editorial) || {};
  const labels = uniqueStrings(
    []
      .concat(coerceArray(editorial.label))
      .concat(coerceArray(editorial.labels))
      .concat(coerceArray(post && post.editorialLabel))
      .concat(coerceArray(post && post.labels))
  );
  return labels[0] || categoryLabel(post && post.category);
}

function absoluteUrl(origin, value) {
  if (!value) return origin || '';
  if (/^https?:\/\//i.test(value)) return value;
  const base = origin || '';
  return base + (value.charAt(0) === '/' ? value : '/' + value);
}

function sanityImageUrl(ref) {
  if (!ref) return null;
  const parts = String(ref).replace('image-', '').split('-');
  const ext = parts.pop();
  const id = parts.join('-');
  return `https://cdn.sanity.io/images/${SANITY_PROJECT_ID}/${SANITY_DATASET}/${id}.${ext}`;
}

function buildOrigin(headers, fallbackOrigin) {
  if (fallbackOrigin) return fallbackOrigin;
  const proto = headers && (headers['x-forwarded-proto'] || headers['X-Forwarded-Proto']);
  const host = headers && (headers.host || headers.Host || headers['x-forwarded-host']);
  if (proto && host) return `${proto}://${host}`;
  if (host) return `https://${host}`;
  return 'https://farpostscot.com';
}

function parseScoreline(fixture) {
  const scores = Array.isArray(fixture && fixture.scores) ? fixture.scores : [];
  const relevant = scores.filter(function (entry) {
    return entry && (entry.description === 'CURRENT' || entry.description === 'FT');
  });
  const homeEntry = relevant.find(function (entry) {
    return entry && entry.score && entry.score.participant === 'home';
  });
  const awayEntry = relevant.find(function (entry) {
    return entry && entry.score && entry.score.participant === 'away';
  });
  return {
    home: homeEntry && homeEntry.score && homeEntry.score.goals != null ? homeEntry.score.goals : null,
    away: awayEntry && awayEntry.score && awayEntry.score.goals != null ? awayEntry.score.goals : null
  };
}

function matchParticipants(fixture) {
  const participants = Array.isArray(fixture && fixture.participants) ? fixture.participants : [];
  return {
    home: participants.find(function (item) { return item && item.meta && item.meta.location === 'home'; }) || participants[0] || {},
    away: participants.find(function (item) { return item && item.meta && item.meta.location === 'away'; }) || participants[1] || {}
  };
}

function formatKickoff(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  const datePart = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
  const timePart = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart} at ${timePart}`;
}

function buildArticleMetadata(post, options) {
  const config = options || {};
  const origin = buildOrigin(config.headers, config.origin);
  const editorial = (post && post.editorial) || {};
  const relatedTeams = uniqueStrings(
    []
      .concat(extractNamedValues(editorial, ['relatedTeams', 'clubs', 'teams']))
      .concat(extractNamedValues(post, ['relatedTeams', 'clubs', 'teams']))
  );
  const relatedPlayers = uniqueStrings(
    []
      .concat(extractNamedValues(editorial, ['relatedPlayers', 'players']))
      .concat(extractNamedValues(post, ['relatedPlayers', 'players']))
  );
  const topics = uniqueStrings(
    []
      .concat(coerceArray(editorial.topics))
      .concat(coerceArray(editorial.labels))
      .concat(coerceArray(post && post.topics))
      .concat(coerceArray(post && post.labels))
      .concat(coerceArray(post && post.tags))
      .concat(relatedTeams)
      .concat(relatedPlayers)
  );
  const titleText = editorial.seoTitle || (post && post.seo && post.seo.title) || (post && post.title) || 'Far Post';
  const description = truncateText(
    editorial.seoDescription
      || (post && post.seo && post.seo.description)
      || (post && post.excerpt)
      || extractPortableText(post && post.body),
    165
  ) || 'Far Post brings premium Scottish football editorial with club, player and match context on every story.';
  const id = config.id || (post && post._id) || '';
  const canonicalPath = `/article.html?id=${encodeURIComponent(id)}`;
  const imageRef = post && post.mainImage && post.mainImage.asset ? post.mainImage.asset._ref : null;
  const image = imageRef
    ? `${sanityImageUrl(imageRef)}?w=1400&h=800&fit=crop&auto=format`
    : '/android-chrome-512x512.png';
  const title = `${titleText} — Far Post`;

  return {
    title,
    description,
    type: 'article',
    image: absoluteUrl(origin, image),
    canonicalUrl: absoluteUrl(origin, canonicalPath),
    twitterCard: 'summary_large_image',
    keywords: topics,
    section: storyLabel(post),
    publishedTime: post && post.publishedAt,
    modifiedTime: (post && post._updatedAt) || (post && post.publishedAt),
    jsonLdId: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: post && post.title ? post.title : titleText,
      description,
      image: imageRef ? [absoluteUrl(origin, image)] : undefined,
      datePublished: post && post.publishedAt ? post.publishedAt : undefined,
      dateModified: post && (post._updatedAt || post.publishedAt) ? (post._updatedAt || post.publishedAt) : undefined,
      author: {
        '@type': 'Person',
        name: (post && post.author) || 'Far Post'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Far Post',
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(origin, '/android-chrome-512x512.png')
        }
      },
      mainEntityOfPage: absoluteUrl(origin, canonicalPath)
    }
  };
}

function buildMatchMetadata(fixture, options) {
  const config = options || {};
  const origin = buildOrigin(config.headers, config.origin);
  const teams = matchParticipants(fixture);
  const score = parseScoreline(fixture);
  const home = teams.home || {};
  const away = teams.away || {};
  const state = (fixture && fixture.state) || {};
  const stateShort = state.short || '';
  const stateName = state.name || stateShort || 'Match centre';
  const leagueId = config.leagueId || fixture.league_id || fixture.leagueId || '';
  const canonicalPath = `/match.html?id=${encodeURIComponent(fixture && fixture.id ? fixture.id : '')}${leagueId ? `&league=${encodeURIComponent(leagueId)}` : ''}`;
  const title = `${home.name || 'Home'} vs ${away.name || 'Away'} — Far Post`;
  const hasScore = score.home != null && score.away != null;
  const kickoff = formatKickoff(fixture && fixture.starting_at);
  let description = `Far Post match centre for ${home.name || 'Home'} vs ${away.name || 'Away'}: scoreline, timeline, lineups and form guide.`;

  if (stateShort === 'FT' || stateShort === 'AET' || stateShort === 'PEN') {
    description = hasScore
      ? `Far Post match centre: ${home.name || 'Home'} ${score.home}-${score.away} ${away.name || 'Away'}. Timeline, lineups, stats and form guide.`
      : `Far Post match centre for ${home.name || 'Home'} vs ${away.name || 'Away'} at full time. Timeline, lineups, stats and form guide.`;
  } else if (kickoff) {
    description = `Far Post match centre for ${home.name || 'Home'} vs ${away.name || 'Away'}, due off ${kickoff}. Lineups, timeline and form guide in one place.`;
  }

  return {
    title,
    description,
    type: 'website',
    image: absoluteUrl(origin, home.image_path || away.image_path || '/android-chrome-512x512.png'),
    canonicalUrl: absoluteUrl(origin, canonicalPath),
    twitterCard: 'summary_large_image',
    keywords: uniqueStrings([home.name, away.name, 'match centre', 'Scottish football']),
    jsonLdId: 'match-page',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${home.name || 'Home'} vs ${away.name || 'Away'}`,
      startDate: fixture && fixture.starting_at ? fixture.starting_at : undefined,
      eventStatus: stateName,
      competitor: [
        { '@type': 'SportsTeam', name: home.name || 'Home' },
        { '@type': 'SportsTeam', name: away.name || 'Away' }
      ],
      url: absoluteUrl(origin, canonicalPath)
    }
  };
}

function renderMetadataBlock(metadata) {
  const lines = [
    `<title>${escapeHtml(metadata.title || 'Far Post')}</title>`,
    `<meta name="description" content="${escapeHtml(metadata.description || '')}">`,
    `<meta property="og:title" content="${escapeHtml(metadata.title || 'Far Post')}">`,
    `<meta property="og:description" content="${escapeHtml(metadata.description || '')}">`,
    `<meta property="og:type" content="${escapeHtml(metadata.type || 'website')}">`,
    `<meta property="og:image" content="${escapeHtml(metadata.image || '')}">`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl || '')}">`,
    `<meta property="og:site_name" content="Far Post">`,
    `<meta name="twitter:card" content="${escapeHtml(metadata.twitterCard || 'summary_large_image')}">`,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title || 'Far Post')}">`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description || '')}">`,
    `<meta name="twitter:image" content="${escapeHtml(metadata.image || '')}">`,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl || '')}">`
  ];

  if (metadata.keywords && metadata.keywords.length) {
    lines.push(`<meta name="keywords" content="${escapeHtml(uniqueStrings(metadata.keywords).join(', '))}">`);
  }
  if (metadata.section) {
    lines.push(`<meta property="article:section" content="${escapeHtml(metadata.section)}">`);
  }
  if (metadata.publishedTime) {
    lines.push(`<meta property="article:published_time" content="${escapeHtml(metadata.publishedTime)}">`);
  }
  if (metadata.modifiedTime) {
    lines.push(`<meta property="article:modified_time" content="${escapeHtml(metadata.modifiedTime)}">`);
  }
  if (metadata.jsonLdId && metadata.jsonLd) {
    lines.push(
      `<script type="application/ld+json" data-fp-jsonld="${escapeHtml(metadata.jsonLdId)}">${escapeJson(JSON.stringify(metadata.jsonLd))}</script>`
    );
  }

  return lines.map(function (line) {
    return `  ${line}`;
  }).join('\n');
}

function injectMetadataBlock(html, metadata) {
  if (!HEAD_BLOCK_PATTERN.test(html)) return html;
  const block = typeof metadata === 'string' ? metadata : renderMetadataBlock(metadata);
  return html.replace(HEAD_BLOCK_PATTERN, `<!-- FP_HEAD_START -->\n${block}\n  <!-- FP_HEAD_END -->`);
}

async function readTemplateHtml(filename) {
  const candidates = [
    path.resolve(process.cwd(), filename),
    path.resolve(__dirname, '..', filename)
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, 'utf8');
    } catch (error) {
      if (error && error.code !== 'ENOENT') throw error;
    }
  }

  throw new Error(`Template not found: ${filename}`);
}

module.exports = {
  buildArticleMetadata,
  buildMatchMetadata,
  injectMetadataBlock,
  readTemplateHtml,
  renderMetadataBlock
};
