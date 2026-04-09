function getArticlePost(id) {
  if (!id) return null;

  if (id === 'club-story') {
    return {
      _id: 'club-story',
      title: '501 Leaders are setting the pace',
      category: 'news',
      excerpt: 'A closer look at how 501 Leaders and 504 Leaders are shaping the week.',
      author: 'Far Post',
      publishedAt: '2026-04-05T12:00:00Z',
      _updatedAt: '2026-04-06T12:00:00Z',
      editorial: {
        labels: ['Must Read'],
        relatedTeams: ['501 Leaders', '504 Leaders']
      },
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
    };
  }

  return {
    _id: id,
    title: 'Far Post Story 1',
    category: 'news',
    excerpt: 'Story deck 1',
    author: 'Far Post',
    publishedAt: '2026-04-05T12:00:00Z',
    _updatedAt: '2026-04-05T12:00:00Z',
    mainImage: {
      asset: {
        _ref: 'image-sample-image-jpg'
      }
    },
    body: [
      {
        _type: 'block',
        children: [{ text: 'Scottish football editorial sample copy.' }]
      }
    ]
  };
}

function getMatchFixture(id) {
  if (!id) return null;

  return {
    id,
    league_id: '501',
    starting_at: '2026-04-11T15:00:00Z',
    state: { short: 'FT', name: 'Full Time' },
    participants: [
      {
        id: 'club-home',
        name: 'Caledonia FC',
        image_path: 'https://images.example.com/home-crest.png',
        meta: { location: 'home' }
      },
      {
        id: 'club-away',
        name: 'Forth Athletic',
        image_path: 'https://images.example.com/away-crest.png',
        meta: { location: 'away' }
      }
    ],
    scores: [
      { description: 'FT', score: { participant: 'home', goals: 2 } },
      { description: 'FT', score: { participant: 'away', goals: 1 } }
    ]
  };
}

module.exports = {
  getArticlePost,
  getMatchFixture
};
