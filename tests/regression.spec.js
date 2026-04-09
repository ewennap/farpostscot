const { test, expect } = require('@playwright/test');

function articleFeed(count = 6) {
  return {
    result: Array.from({ length: count }, (_, index) => ({
      _id: `post-${index + 1}`,
      title: `Far Post Story ${index + 1}`,
      category: index % 2 === 0 ? 'news' : 'feature',
      excerpt: `Story deck ${index + 1}`,
      author: 'Far Post',
      publishedAt: '2026-04-05T12:00:00Z',
      mainImage: {
        asset: {
          _ref: 'image-sample-image-jpg'
        }
      },
      body: [
        {
          children: [{ text: 'Scottish football editorial sample copy.' }]
        }
      ]
    }))
  };
}

function editorialHomepageFeed() {
  return {
    result: [
      {
        _id: 'override-story',
        title: 'Homepage override story',
        category: 'news',
        excerpt: 'Pinned to the hero.',
        author: 'Far Post',
        publishedAt: '2026-04-02T12:00:00Z',
        editorial: { homeHero: true, homeHeroRank: 1 },
        body: [{ children: [{ text: 'Pinned hero copy.' }] }]
      },
      {
        _id: 'pick-story',
        title: 'Editor pick story',
        category: 'analysis',
        excerpt: 'Explicit editor pick.',
        author: 'Far Post',
        publishedAt: '2026-04-04T12:00:00Z',
        editorial: { editorsPick: true, editorsPickRank: 1, labels: ['Must Read'] },
        body: [{ children: [{ text: 'Pick copy.' }] }]
      },
      {
        _id: 'suppressed-story',
        title: 'Suppressed homepage story',
        category: 'news',
        excerpt: 'Should not appear.',
        author: 'Far Post',
        publishedAt: '2026-04-06T12:00:00Z',
        editorial: { suppressHomepage: true },
        body: [{ children: [{ text: 'Suppressed copy.' }] }]
      },
      ...Array.from({ length: 4 }, (_, index) => ({
        _id: `regular-${index + 1}`,
        title: `Regular story ${index + 1}`,
        category: index % 2 === 0 ? 'news' : 'feature',
        excerpt: `Regular deck ${index + 1}`,
        author: 'Far Post',
        publishedAt: `2026-04-0${index + 1}T12:00:00Z`,
        body: [{ children: [{ text: 'Regular copy.' }] }]
      }))
    ]
  };
}

function playersHubPayload() {
  return {
    leagues: [
      {
        leagueId: '501',
        leagueName: 'Premiership',
        seasonId: '1001',
        topScorers: [
          {
            playerId: 'p1',
            playerName: 'Mara Boyd',
            playerPhoto: 'https://images.example.com/player-1.jpg',
            teamId: '501-club-1',
            teamName: '501 Leaders',
            teamCrest: 'https://images.example.com/crest-1.png',
            goals: 14,
            assists: 6,
            rank: 1
          },
          {
            playerId: 'p2',
            playerName: 'Iain Kerr',
            playerPhoto: 'https://images.example.com/player-2.jpg',
            teamId: '501-club-2',
            teamName: '501 Challengers',
            teamCrest: 'https://images.example.com/crest-2.png',
            goals: 11,
            assists: 2,
            rank: 2
          }
        ]
      },
      {
        leagueId: '504',
        leagueName: 'Championship',
        seasonId: '1002',
        topScorers: [
          {
            playerId: 'p3',
            playerName: 'Ross Muir',
            playerPhoto: 'https://images.example.com/player-3.jpg',
            teamId: '504-club-1',
            teamName: '504 Leaders',
            teamCrest: 'https://images.example.com/crest-3.png',
            goals: 10,
            assists: 3,
            rank: 1
          }
        ]
      },
      {
        leagueId: '516',
        leagueName: 'League One',
        seasonId: '1003',
        topScorers: [
          {
            playerId: 'p4',
            playerName: 'Lewis Craig',
            playerPhoto: 'https://images.example.com/player-4.jpg',
            teamId: '516-club-1',
            teamName: '516 Leaders',
            teamCrest: 'https://images.example.com/crest-4.png',
            goals: 9,
            assists: 4,
            rank: 1
          }
        ]
      }
    ]
  };
}

function standingsPayload(leagueId) {
  return {
    standings: [
      {
        teamId: `${leagueId}-club-1`,
        team: `${leagueId} Leaders`,
        crest: `https://images.example.com/${leagueId}-crest-1.png`,
        position: 1,
        points: 68,
        played: 31,
        gd: 22
      },
      {
        teamId: `${leagueId}-club-2`,
        team: `${leagueId} Challengers`,
        crest: `https://images.example.com/${leagueId}-crest-2.png`,
        position: 2,
        points: 64,
        played: 31,
        gd: 17
      }
    ]
  };
}

function fixturesPayload(leagueId) {
  return {
    fixtures: [
      {
        id: `${leagueId}-fixture-1`,
        leagueId,
        date: '2026-04-10T15:00:00Z',
        round: 'Matchday 32',
        home: {
          id: `${leagueId}-club-1`,
          name: `${leagueId} Leaders`,
          crest: `https://images.example.com/${leagueId}-crest-1.png`
        },
        away: {
          id: `${leagueId}-club-2`,
          name: `${leagueId} Challengers`,
          crest: `https://images.example.com/${leagueId}-crest-2.png`
        }
      },
      {
        id: `${leagueId}-fixture-2`,
        leagueId,
        date: '2026-04-12T19:45:00Z',
        round: 'Matchday 32',
        home: {
          id: `${leagueId}-club-3`,
          name: `${leagueId} Town`,
          crest: `https://images.example.com/${leagueId}-crest-3.png`
        },
        away: {
          id: `${leagueId}-club-4`,
          name: `${leagueId} County`,
          crest: `https://images.example.com/${leagueId}-crest-4.png`
        }
      }
    ]
  };
}

function resultsPayload(leagueId) {
  return {
    fixtures: [
      {
        id: `${leagueId}-result-1`,
        leagueId,
        state: 'FT',
        round: 'Matchday 31',
        date: '2026-04-05T15:00:00Z',
        home: {
          id: `${leagueId}-club-1`,
          name: `${leagueId} Leaders`,
          short: 'LDR',
          crest: `https://images.example.com/${leagueId}-crest-1.png`
        },
        away: {
          id: `${leagueId}-club-2`,
          name: `${leagueId} Challengers`,
          short: 'CHL',
          crest: `https://images.example.com/${leagueId}-crest-2.png`
        },
        score: { home: 2, away: 1 }
      }
    ]
  };
}

function podcastXml(imageUrl = 'https://images.example.com/podcast-cover.jpg') {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
    <channel>
      <title>Across the Tiers</title>
      <itunes:image href="${imageUrl}" />
      <item>
        <title>Title Race Focus</title>
        <description><![CDATA[The latest from across the leagues.]]></description>
        <pubDate>Sun, 05 Apr 2026 12:00:00 GMT</pubDate>
        <duration>00:42:00</duration>
        <link>https://feeds.acast.com/public/shows/across-the-tiers/episode-1</link>
        <itunes:image href="${imageUrl}" />
      </item>
      <item>
        <title>Cup Weekend Review</title>
        <description><![CDATA[Reviewing the key Scottish cup ties.]]></description>
        <pubDate>Sat, 04 Apr 2026 12:00:00 GMT</pubDate>
        <duration>00:35:00</duration>
        <link>https://feeds.acast.com/public/shows/across-the-tiers/episode-2</link>
        <itunes:image href="${imageUrl}" />
      </item>
    </channel>
  </rss>`;
}

function articleWithClubMention(id = 'club-story') {
  return {
    result: {
      _id: id,
      title: '501 Leaders are setting the pace',
      category: 'news',
      excerpt: 'A closer look at how 501 Leaders and 504 Leaders are shaping the week.',
      editorial: {
        labels: ['Must Read'],
        relatedTeams: ['501 Leaders', '504 Leaders']
      },
      author: 'Far Post',
      publishedAt: '2026-04-05T12:00:00Z',
      _updatedAt: '2026-04-06T12:00:00Z',
      mainImage: {
        asset: {
          _ref: 'image-sample-image-jpg'
        }
      },
      body: [
        {
          _type: 'block',
          children: [{ text: '501 Leaders remain in control while 504 Leaders continue to apply pressure.' }]
        }
      ]
    }
  };
}

function matchDetailPayload() {
  return {
    data: {
      id: 'fixture-100',
      league_id: '501',
      starting_at: '2026-04-11T15:00:00Z',
      state: { short: 'FT', name: 'Full Time' },
      participants: [
        {
          id: 'club-home',
          name: 'Caledonia FC',
          short_code: 'CAL',
          image_path: 'https://images.example.com/home-crest.png',
          meta: { location: 'home' }
        },
        {
          id: 'club-away',
          name: 'Forth Athletic',
          short_code: 'FOR',
          image_path: 'https://images.example.com/away-crest.png',
          meta: { location: 'away' }
        }
      ],
      scores: [
        { description: 'FT', score: { participant: 'home', goals: 2 } },
        { description: 'FT', score: { participant: 'away', goals: 1 } }
      ],
      events: [
        { type_id: 14, player_name: 'Mara Boyd', participant_id: 'club-home', minute: 12 },
        { type_id: 18, player_name: 'Ross Muir', related_player_name: 'Lewis Craig', participant_id: 'club-away', minute: 63 }
      ],
      lineups: [
        { participant_id: 'club-home', type_id: 11, jersey_number: 9, player_name: 'Mara Boyd' },
        { participant_id: 'club-home', type_id: 12, jersey_number: 18, player_name: 'Calum Ross' },
        { participant_id: 'club-away', type_id: 11, jersey_number: 10, player_name: 'Ross Muir' },
        { participant_id: 'club-away', type_id: 12, jersey_number: 15, player_name: 'Lewis Craig' }
      ]
    }
  };
}

function teamFormPayload(teamName) {
  return [
    {
      requestedTeamSide: 'home',
      homeScore: 2,
      awayScore: 1,
      awayTeamCrest: 'https://images.example.com/opponent-crest.png',
      homeTeamCrest: 'https://images.example.com/home-crest.png',
      result: 'W',
      date: `vs ${teamName}`
    }
  ];
}

function clubSummaryPayload(teamId = '501-club-1', leagueId = '501') {
  const leagueNames = {
    '501': 'Premiership',
    '504': 'Championship',
    '507': 'Scottish Cup',
    '510': 'League Cup',
    '516': 'League One'
  };
  const teamName = `${leagueId} Leaders`;
  const crest = `https://images.example.com/${leagueId}-crest-1.png`;

  return {
    team: {
      id: teamId,
      name: teamName,
      crest,
      leagueId,
      leagueName: leagueNames[leagueId] || 'Scottish football',
      position: 1
    },
    form: [
      {
        id: `${leagueId}-result-1`,
        date: '2026-04-05T15:00:00Z',
        state: 'FT',
        isFinished: true,
        requestedIsHome: true,
        result: 'W',
        home: { id: teamId, name: teamName, crest },
        away: {
          id: `${leagueId}-club-2`,
          name: `${leagueId} Challengers`,
          crest: `https://images.example.com/${leagueId}-crest-2.png`
        },
        score: { home: 2, away: 1 }
      },
      {
        id: `${leagueId}-result-2`,
        date: '2026-03-29T15:00:00Z',
        state: 'FT',
        isFinished: true,
        requestedIsHome: false,
        result: 'D',
        home: {
          id: `${leagueId}-club-3`,
          name: `${leagueId} Town`,
          crest: `https://images.example.com/${leagueId}-crest-3.png`
        },
        away: { id: teamId, name: teamName, crest },
        score: { home: 1, away: 1 }
      }
    ],
    results: [
      {
        id: `${leagueId}-result-1`,
        date: '2026-04-05T15:00:00Z',
        state: 'FT',
        isFinished: true,
        requestedIsHome: true,
        result: 'W',
        home: { id: teamId, name: teamName, crest },
        away: {
          id: `${leagueId}-club-2`,
          name: `${leagueId} Challengers`,
          crest: `https://images.example.com/${leagueId}-crest-2.png`
        },
        score: { home: 2, away: 1 }
      }
    ],
    fixtures: [
      {
        id: `${leagueId}-fixture-1`,
        date: '2026-04-10T15:00:00Z',
        state: 'NS',
        isFinished: false,
        requestedIsHome: true,
        result: null,
        home: { id: teamId, name: teamName, crest },
        away: {
          id: `${leagueId}-club-2`,
          name: `${leagueId} Challengers`,
          crest: `https://images.example.com/${leagueId}-crest-2.png`
        },
        score: { home: '-', away: '-' }
      }
    ],
    standings: [
      {
        teamId,
        team: teamName,
        crest,
        position: 1,
        points: 68,
        played: 31,
        won: 21,
        drawn: 5,
        lost: 5,
        gd: 22
      },
      {
        teamId: `${leagueId}-club-2`,
        team: `${leagueId} Challengers`,
        crest: `https://images.example.com/${leagueId}-crest-2.png`,
        position: 2,
        points: 64,
        played: 31,
        won: 19,
        drawn: 7,
        lost: 5,
        gd: 17
      }
    ],
    topScorers: [
      {
        playerId: 'p1',
        playerName: 'Mara Boyd',
        playerPhoto: 'https://images.example.com/player-1.jpg',
        teamId,
        teamName,
        teamCrest: crest,
        goals: 14,
        rank: 1,
        leagueId,
        seasonId: '1001'
      }
    ]
  };
}

function clubCoveragePayload(teamName = '501 Leaders') {
  return {
    articles: [
      {
        _id: 'club-coverage-1',
        title: `${teamName} are setting the pace`,
        category: 'news',
        excerpt: `Why ${teamName} have built momentum at the right time.`,
        author: 'Far Post',
        publishedAt: '2026-04-06T12:00:00Z',
        mainImage: {
          asset: {
            _ref: 'image-sample-image-jpg'
          }
        }
      },
      {
        _id: 'club-coverage-2',
        title: `How ${teamName} control the middle of the pitch`,
        category: 'analysis',
        excerpt: 'A tactical read on their recent run.',
        author: 'Far Post',
        publishedAt: '2026-04-04T12:00:00Z',
        mainImage: {
          asset: {
            _ref: 'image-sample-image-jpg'
          }
        }
      },
      {
        _id: 'club-coverage-3',
        title: `${teamName} and the pressure of the run-in`,
        category: 'feature',
        excerpt: 'The wider context around the club.',
        author: 'Far Post',
        publishedAt: '2026-04-02T12:00:00Z',
        mainImage: {
          asset: {
            _ref: 'image-sample-image-jpg'
          }
        }
      }
    ]
  };
}

function squadPayload() {
  return {
    goalkeepers: [
      { id: 'gk-1', display_name: 'Aidan Kerr', jersey_number: 1, image_path: null }
    ],
    defenders: [
      { id: 'df-1', display_name: 'Lewis Grant', jersey_number: 4, image_path: null }
    ],
    midfielders: [
      { id: 'mf-1', display_name: 'Calum Ross', jersey_number: 8, image_path: null }
    ],
    attackers: [
      { id: 'fw-1', display_name: 'Mara Boyd', jersey_number: 9, image_path: null }
    ]
  };
}

async function mockSuccessfulData(page) {
  await page.route('**/.netlify/functions/sanity-fetch**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(articleFeed())
    });
  });

  await page.route('**/.netlify/functions/homepage-content', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ posts: articleFeed().result })
    });
  });

  await page.route('**/.netlify/functions/article-content?id=*', async route => {
    const id = new URL(route.request().url()).searchParams.get('id') || 'post-1';
    const posts = articleFeed(4).result;
    const post = { ...posts[0], _id: id };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        post,
        relatedPosts: posts.slice(1, 3),
        latestArticle: posts[1] || null
      })
    });
  });

  await page.route('**/.netlify/functions/players-hub', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(playersHubPayload())
    });
  });

  await page.route('**/.netlify/functions/standings?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(standingsPayload(leagueId))
    });
  });

  await page.route('**/.netlify/functions/fixtures?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    if (leagueId === 'all') {
      const fixtures = ['501', '504', '507', '510', '516'].flatMap(id => fixturesPayload(id).fixtures);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fixtures })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixturesPayload(leagueId))
    });
  });

  await page.route('**/.netlify/functions/results?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(resultsPayload(leagueId))
    });
  });

  await page.route('**/.netlify/functions/podcast', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/xml',
      body: podcastXml()
    });
  });

  await page.route('**/.netlify/functions/match-detail?fixtureId=*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(matchDetailPayload())
    });
  });

  await page.route('**/.netlify/functions/team-form?teamId=*', async route => {
    const teamId = new URL(route.request().url()).searchParams.get('teamId');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(teamFormPayload(teamId))
    });
  });

  await page.route('**/.netlify/functions/club-summary?teamId=*', async route => {
    const url = new URL(route.request().url());
    const teamId = url.searchParams.get('teamId') || '501-club-1';
    const leagueId = url.searchParams.get('leagueId') || '501';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(clubSummaryPayload(teamId, leagueId))
    });
  });

  await page.route('**/.netlify/functions/club-coverage?team=*', async route => {
    const teamName = new URL(route.request().url()).searchParams.get('team') || '501 Leaders';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(clubCoveragePayload(teamName))
    });
  });

  await page.route('**/.netlify/functions/squad?teamId=*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(squadPayload())
    });
  });

  await page.route('https://images.example.com/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9lJawAAAAASUVORK5CYII=',
        'base64'
      )
    });
  });
}

test('homepage loads core modules and nav links work', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/index.html');

  await expect(page.locator('#hero-slides .hero-slide')).toHaveCount(6);
  await expect(page.locator('#results-grid .result-card')).toHaveCount(5);
  await expect(page.locator('#editors-picks-list .identity-item')).toHaveCount(3);
  await expect(page.locator('#week-briefing-list .identity-item')).toHaveCount(3);
  await expect(page.locator('#club-highlights-list .spotlight-item')).toHaveCount(3);
  await expect(page.locator('#player-highlights-list .spotlight-item')).toHaveCount(3);
  await expect(page.locator('#podcast-grid .pod-card')).toHaveCount(2);

  await page.getByRole('navigation').getByRole('link', { name: 'Players', exact: true }).click();
  await expect(page).toHaveURL(/players\.html$/);
  await expect(page.locator('#directory-grid .player-card')).toHaveCount(4);
});

test('homepage honours editorial hero and picks overrides', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.route('**/.netlify/functions/homepage-content', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ posts: editorialHomepageFeed().result })
    });
  });

  await page.goto('/index.html');

  await expect(page.locator('#hero-slides .hero-slide').first().locator('.hero-headline')).toHaveText('Homepage override story');
  await expect(page.locator('#editors-picks-list .identity-item').first().locator('.identity-name')).toHaveText('Editor pick story');
  await expect(page.locator('#hero-slides')).not.toContainText('Suppressed homepage story');
});

test('article response ships story-specific head metadata', async ({ request }) => {
  const response = await request.get('/article.html?id=club-story');
  const html = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(html).toContain('<title>501 Leaders are setting the pace — Far Post</title>');
  expect(html).toContain('property="og:url" content="http://127.0.0.1:4173/article.html?id=club-story"');
  expect(html).toContain('name="twitter:title" content="501 Leaders are setting the pace — Far Post"');
  expect(html).toContain('data-fp-jsonld="article"');
});

test('match response ships fixture-specific head metadata', async ({ request }) => {
  const response = await request.get('/match.html?id=fixture-100');
  const html = await response.text();

  expect(response.ok()).toBeTruthy();
  expect(html).toContain('<title>Caledonia FC vs Forth Athletic — Far Post</title>');
  expect(html).toContain('property="og:description" content="Far Post match centre: Caledonia FC 2-1 Forth Athletic. Timeline, lineups, stats and form guide."');
  expect(html).toContain('rel="canonical" href="http://127.0.0.1:4173/match.html?id=fixture-100&amp;league=501"');
  expect(html).toContain('data-fp-jsonld="match-page"');
});

test('players hub renders and links to player pages', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/players.html');

  await expect(page.locator('#overview-grid .overview-card')).toHaveCount(3);
  await expect(page.locator('#watchlist-grid .watch-card')).toHaveCount(3);
  await expect(page.locator('#directory-grid .player-card')).toHaveCount(4);

  const href = await page.locator('#directory-grid .player-card').first().getAttribute('href');
  expect(href).toContain('player.html?id=p1');
  await expect(page.locator('#overview-grid .overview-card').first().getByRole('link', { name: /open mara boyd player page/i })).toHaveAttribute('href', /player\.html\?id=p1/);
  await expect(page.locator('#watchlist-grid .watch-card').first().getByRole('link', { name: 'Club page' })).toHaveAttribute('href', /club\.html/);
});

test('players hub overview routes filter the directory and survive per-league fixture failures', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.unroute('**/.netlify/functions/fixtures?league=*');
  await page.route('**/.netlify/functions/fixtures?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    if (leagueId === '504') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Fixture feed unavailable' })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixturesPayload(leagueId))
    });
  });

  await page.goto('/players.html');

  await page.locator('#overview-grid .overview-card').nth(1).getByRole('link', { name: 'View scorers' }).click();
  await expect(page.locator('#directory-note')).toHaveText('1 player shown');
  await expect(page.locator('#directory-grid .player-card')).toHaveCount(1);
  await expect(page.locator('#directory-grid .player-card').first()).toHaveAttribute('href', /player\.html\?id=p3/);
  await expect(page.locator('#directory-grid .player-card .player-card-next')).toContainText('Next fixture to be confirmed');
});

test('players hub avoids creative-watch copy when assist data is not meaningful', async ({ page }) => {
  await page.route('**/.netlify/functions/players-hub', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagues: [
          {
            leagueId: '501',
            leagueName: 'Premiership',
            seasonId: '1001',
            topScorers: [
              {
                playerId: 'p1',
                playerName: 'Mara Boyd',
                playerPhoto: 'https://images.example.com/player-1.jpg',
                teamId: '501-club-1',
                teamName: '501 Leaders',
                teamCrest: 'https://images.example.com/crest-1.png',
                goals: 14,
                assists: 0,
                rank: 1
              },
              {
                playerId: 'p2',
                playerName: 'Iain Kerr',
                playerPhoto: 'https://images.example.com/player-2.jpg',
                teamId: '501-club-2',
                teamName: '501 Challengers',
                teamCrest: 'https://images.example.com/crest-2.png',
                goals: 11,
                assists: 0,
                rank: 2
              }
            ]
          },
          {
            leagueId: '504',
            leagueName: 'Championship',
            seasonId: '1002',
            topScorers: [
              {
                playerId: 'p3',
                playerName: 'Ross Muir',
                playerPhoto: 'https://images.example.com/player-3.jpg',
                teamId: '504-club-1',
                teamName: '504 Leaders',
                teamCrest: 'https://images.example.com/crest-3.png',
                goals: 10,
                assists: 0,
                rank: 1
              }
            ]
          }
        ]
      })
    });
  });

  await page.route('**/.netlify/functions/fixtures?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixturesPayload(leagueId))
    });
  });

  await page.goto('/players.html');

  await expect(page.locator('#watchlist-grid')).toContainText('Secondary scorer');
  await expect(page.locator('#watchlist-grid')).not.toContainText('Creative watch');
  await expect(page.locator('#watchlist-grid')).not.toContainText('0 assists');
});

test('clubs hub renders and links correctly', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/clubs.html');

  await expect(page.locator('#overview-grid .overview-card')).toHaveCount(5);
  await expect(page.locator('#watchlist-grid .watch-card')).toHaveCount(3);
  await expect(page.locator('#directory-grid .club-card')).toHaveCount(14);

  const href = await page.locator('#directory-grid .club-card').first().getAttribute('href');
  expect(href).toContain('club.html?id=');
  expect(href).toContain('&league=501');
  await expect(page.locator('#watchlist-grid .watch-card').first().getByRole('link', { name: 'Leading scorer' })).toHaveAttribute('href', /player\.html\?id=p1/);
});

test('clubs hub all-directory search keeps deduped clubs discoverable across cup memberships', async ({ page }) => {
  await page.route('**/.netlify/functions/players-hub', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ leagues: [] })
    });
  });

  await page.route('**/.netlify/functions/standings?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        ['501', '504', '516'].includes(leagueId)
          ? standingsPayload(leagueId)
          : { standings: [] }
      )
    });
  });

  await page.route('**/.netlify/functions/fixtures?league=*', async route => {
    const leagueId = new URL(route.request().url()).searchParams.get('league');
    const fixturesByLeague = {
      '501': fixturesPayload('501'),
      '504': fixturesPayload('504'),
      '516': fixturesPayload('516'),
      '507': {
        fixtures: [
          {
            id: '507-fixture-1',
            leagueId: '507',
            date: '2026-04-11T15:00:00Z',
            round: 'Quarter-final',
            home: {
              id: '501-club-1',
              name: '501 Leaders',
              crest: 'https://images.example.com/501-crest-1.png'
            },
            away: {
              id: '507-club-3',
              name: '507 Town',
              crest: 'https://images.example.com/507-crest-3.png'
            }
          },
          {
            id: '507-fixture-2',
            leagueId: '507',
            date: '2026-04-12T15:00:00Z',
            round: 'Quarter-final',
            home: {
              id: '501-club-2',
              name: '501 Challengers',
              crest: 'https://images.example.com/501-crest-2.png'
            },
            away: {
              id: '507-club-4',
              name: '507 County',
              crest: 'https://images.example.com/507-crest-4.png'
            }
          }
        ]
      },
      '510': {
        fixtures: [
          {
            id: '510-fixture-1',
            leagueId: '510',
            date: '2026-04-13T19:45:00Z',
            round: 'Semi-final',
            home: {
              id: '504-club-1',
              name: '504 Leaders',
              crest: 'https://images.example.com/504-crest-1.png'
            },
            away: {
              id: '510-club-3',
              name: '510 Town',
              crest: 'https://images.example.com/510-crest-3.png'
            }
          }
        ]
      }
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixturesByLeague[leagueId] || { fixtures: [] })
    });
  });

  await page.goto('/clubs.html');

  await page.locator('#club-search').fill('Scottish Cup');
  const leadersCard = page.locator('#directory-grid .club-card', {
    has: page.locator('.club-card-name', { hasText: /^501 Leaders$/ })
  });
  await expect(page.locator('#directory-note')).toHaveText('4 clubs shown');
  await expect(page.locator('#directory-grid .club-card')).toHaveCount(4);
  await expect(leadersCard).toHaveCount(1);
  await expect(leadersCard).toHaveAttribute('href', /club\.html\?id=501-club-1&league=501/);
});

test('club page renders coverage from the dedicated club feed', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/club.html?id=501-club-1&league=501');

  await expect(page.locator('#articlesSection')).toBeVisible();
  await expect(page.locator('#articlesGrid .coverage-feature')).toHaveCount(1);
  await expect(page.locator('#articlesGrid .article-card')).toHaveCount(2);
  await expect(page.locator('#heroCoverageValue')).toHaveText('03');
  await expect(page.locator('#articlesGrid')).toContainText('501 Leaders are setting the pace');
});

test('match page renders essential match content', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.route('**/.netlify/functions/players-hub', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagues: [
          {
            leagueId: '501',
            leagueName: 'Premiership',
            seasonId: '1001',
            topScorers: [
              { playerId: 'p1', playerName: 'Mara Boyd', teamId: 'club-home', teamName: 'Caledonia FC', goals: 14, assists: 6, rank: 1 },
              { playerId: 'p3', playerName: 'Ross Muir', teamId: 'club-away', teamName: 'Forth Athletic', goals: 10, assists: 3, rank: 2 },
              { playerId: 'p4', playerName: 'Lewis Craig', teamId: 'club-away', teamName: 'Forth Athletic', goals: 9, assists: 4, rank: 3 }
            ]
          }
        ]
      })
    });
  });
  await page.goto('/match.html?id=fixture-100&league=501');

  await expect(page.locator('#match-hero .score-num').first()).toHaveText('2');
  await expect(page.locator('#summary-container .summary-card')).toHaveCount(3);
  await expect(page.locator('#timeline-container .tl-row')).toHaveCount(2);
  await expect(page.locator('#lineups-container .lineup-player')).toHaveCount(2);
  await expect(page.locator('#timeline-container .tl-player a').first()).toHaveAttribute('href', /player\.html\?id=p1/);
  await page.getByRole('button', { name: 'FOR' }).click();
  await expect(page.locator('#lineups-container .lineup-player')).toHaveCount(2);
  await expect(page.locator('#lineups-container .lineup-name a').first()).toHaveAttribute('href', /player\.html\?id=p3/);
  await expect(page.locator('#form-container .form-item')).toHaveCount(2);
  await expect(page).toHaveTitle(/Caledonia FC vs Forth Athletic — Far Post/);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Caledonia FC vs Forth Athletic/);
});

test('article page surfaces related club links when story mentions tracked sides', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.route('**/.netlify/functions/article-content?id=*', async route => {
    const id = new URL(route.request().url()).searchParams.get('id');
    if (id === 'club-story') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          post: articleWithClubMention().result,
          relatedPosts: articleFeed(2).result,
          latestArticle: articleFeed(2).result[0]
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        post: articleFeed(1).result[0],
        relatedPosts: articleFeed(2).result,
        latestArticle: articleFeed(2).result[0]
      })
    });
  });

  await page.goto('/article.html?id=club-story');
  await expect(page.locator('.club-links-section .club-link-card')).toHaveCount(2);
  await expect(page.locator('.club-links-section .club-link-card').first()).toHaveAttribute('href', /club\.html\?id=501-club-1&league=501/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /A closer look/);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('#stay-grid .stay-card')).toHaveCount(2);
});

test('podcast cards survive artwork failures', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.route('**/.netlify/functions/podcast', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/xml',
      body: podcastXml('https://images.example.com/broken-podcast.jpg')
    });
  });
  await page.route('https://images.example.com/broken-podcast.jpg', async route => {
    await route.abort();
  });

  await page.goto('/index.html');
  await expect(page.locator('#podcast-grid .pod-card')).toHaveCount(2);
  await expect(page.locator('#podcast-grid .pod-art--fallback')).toHaveCount(2);
});

test('critical pages fail gracefully on bad or missing data', async ({ page }) => {
  await page.route('**/.netlify/functions/players-hub', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Upstream failure' })
    });
  });

  await page.goto('/players.html');
  await expect(page.locator('#overview-grid .fp-state__title')).toHaveText('Could not load player hub');

  await page.unroute('**/.netlify/functions/players-hub');

  await page.route('**/.netlify/functions/player-detail?playerId=*', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'No player detail' })
    });
  });

  await page.goto('/player.html?id=p1&teamId=501-club-1&teamName=501%20Leaders&leagueId=501&goals=14&assists=6&rank=1');
  await expect(page.locator('#intelTitle')).toHaveText('Player detail currently unavailable');
  await expect(page.locator('#intelNote')).toHaveText('Limited detail');
  await expect(page.locator('#heroMain .player-jump')).not.toContainText('Form');
  await expect(page.locator('#heroMain .player-jump')).not.toContainText('Fixtures');
  await expect(page.locator('#heroMain .player-jump a')).toHaveCount(1);
  await expect(page.locator('#heroMain .player-jump a').first()).toHaveAttribute('href', /club\.html\?id=501-club-1&league=501/);

  await page.route('**/.netlify/functions/match-detail?fixtureId=*', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'No data' })
    });
  });

  await page.goto('/match.html?id=fixture-404');
  await expect(page.locator('#match-hero .fp-state__title')).toHaveText('Could not load match data');
});
