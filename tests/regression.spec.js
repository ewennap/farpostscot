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
            teamId: 'c1',
            teamName: 'Caledonia FC',
            teamCrest: 'https://images.example.com/crest-1.png',
            goals: 14,
            assists: 6,
            rank: 1
          },
          {
            playerId: 'p2',
            playerName: 'Iain Kerr',
            playerPhoto: 'https://images.example.com/player-2.jpg',
            teamId: 'c2',
            teamName: 'Forth Athletic',
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
            teamId: 'c3',
            teamName: 'Tay United',
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
            teamId: 'c4',
            teamName: 'Borders Thistle',
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

async function mockSuccessfulData(page) {
  await page.route('**/.netlify/functions/sanity-fetch**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(articleFeed())
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
  await expect(page.locator('#club-highlights-list .spotlight-item')).toHaveCount(3);
  await expect(page.locator('#player-highlights-list .spotlight-item')).toHaveCount(3);
  await expect(page.locator('#podcast-grid .pod-card')).toHaveCount(2);

  await page.getByRole('link', { name: 'Players' }).click();
  await expect(page).toHaveURL(/players\.html$/);
  await expect(page.locator('#directory-grid .player-card')).toHaveCount(4);
});

test('players hub renders and links to player pages', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/players.html');

  await expect(page.locator('#overview-grid .overview-card')).toHaveCount(3);
  await expect(page.locator('#directory-grid .player-card')).toHaveCount(4);

  const href = await page.locator('#directory-grid .player-card').first().getAttribute('href');
  expect(href).toContain('player.html?id=p1');
});

test('clubs hub renders and links correctly', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/clubs.html');

  await expect(page.locator('#overview-grid .overview-card')).toHaveCount(5);
  await expect(page.locator('#directory-grid .club-card')).toHaveCount(14);

  const href = await page.locator('#directory-grid .club-card').first().getAttribute('href');
  expect(href).toContain('club.html?id=');
  expect(href).toContain('&league=501');
});

test('match page renders essential match content', async ({ page }) => {
  await mockSuccessfulData(page);
  await page.goto('/match.html?id=fixture-100&league=501');

  await expect(page.locator('#match-hero .score-num').first()).toHaveText('2');
  await expect(page.locator('#summary-container .summary-card')).toHaveCount(3);
  await expect(page.locator('#timeline-container .tl-row')).toHaveCount(2);
  await expect(page.locator('#lineups-container .lineup-player')).toHaveCount(2);
  await page.getByRole('button', { name: 'FOR' }).click();
  await expect(page.locator('#lineups-container .lineup-player')).toHaveCount(2);
  await expect(page.locator('#form-container .form-item')).toHaveCount(2);
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
