const SPORTMONKS_TOKEN = process.env.SPORTMONKS_TOKEN;

async function getMatchDetail(fixtureId) {
  const url =
    `https://api.sportmonks.com/v3/football/fixtures/${fixtureId}` +
    `?api_token=${SPORTMONKS_TOKEN}` +
    `&include=events;lineups;participants;scores;state;statistics`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data && data.message ? data.message : 'Sportmonks error');
  }

  return data;
}

module.exports = {
  SPORTMONKS_TOKEN,
  getMatchDetail
};
