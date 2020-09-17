/* eslint-disable functional/no-let */
/* eslint-disable functional/no-loop-statement */
/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */

import cal from 'ical-generator';
import markdownTable from 'markdown-table';
import moment from 'moment';
import fetch from 'node-fetch';

export const normalize = (team: string) => {
  const withoutSpacesAndHyphens = team.replace(/-|\s/g, '');
  const normalized = withoutSpacesAndHyphens.normalize();
  return normalized.toLowerCase();
};

class SwebowlClient {
  readonly apiKey = '';

  readonly baseUrl = '';

  constructor({ baseUrl, apiKey }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  get(url) {
    return fetch(`${this.baseUrl}${url}&APIKey=${this.apiKey}`, {
      headers: {
        authority: 'api.swebowl.se',
        referer: 'https://bits.swebowl.se/seriespel',
      },
    }).then((r) => r.json());
  }
}

export const buildCalendar = async (incomingTeamName: string) => {
  //first we need an api token which we can extract from the bits homepage
  const pageVisitHTMLString = await fetch('https://bits.swebowl.se').then((r) =>
    r.text()
  );

  const [, apiKey] = pageVisitHTMLString.match(/apiKey: "(.+)"/);

  const BitsClient = new SwebowlClient({
    baseUrl: 'https://api.swebowl.se/api/v1',
    apiKey,
  });
  // then we request all games

  const allGames = await BitsClient.get('/Match?seasonId=2020');

  const normalizedTeamName = normalize(incomingTeamName);

  // then we filter the games to include the team name
  const matches = allGames.filter(
    (game) =>
      normalize(game.matchAwayTeamName) === normalizedTeamName ||
      normalize(game.matchHomeTeamName) === normalizedTeamName
  );

  if (matches.length === 0) {
    return '';
  }

  const teamName =
    normalize(matches[0].matchAwayTeamName) === normalizedTeamName
      ? matches[0].matchAwayTeamName
      : matches[0].matchHomeTeamName;

  const calendar = cal({ name: `${teamName}'s Bowling Calendar 2020` });

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    // https:// api.swebowl.se/api/v1/matchResult/GetMatchScores?APIKey=62fcl8gPUMXSQGW1t2Y8mc2zeTk97vbd&matchId=3200970

    const buildStatsTable = async (match) => {
      const matchSchemeId = await BitsClient.get(
        `/matchResult/GetHeadInfo?id=${match.matchId}`
      );

      const matchResultsForTeams = await BitsClient.get(
        `/matchResult/GetMatchResults?matchSchemeId=${matchSchemeId}&matchId=${match.matchId}`
      );

      const isHomeTeam =
        normalize(match.matchHomeTeamName) === normalizedTeamName;

      const playerList =
        isHomeTeam === matchResultsForTeams.playerListHome ||
        matchResultsForTeams.playerListAway;

      return (
        '<table><thead><tr>' +
        ['name', '1', '2', '3', '4', 'Series', 'BanP', 'Plats'].map(
          (t) => `<th>${t}</th>`
        ) +
        '</tr></thead>' +
        '<tbody>' +
        playerList
          .map((p) => [
            p.player,
            p.result1,
            p.result2,
            p.result3,
            p.result4,
            p.totalSeries,
            p.lanePoint,
            p.place,
          ])
          .map(
            (row) =>
              '<tr>' + row.map((deep) => '<td>' + deep + '</td>') + '</tr>'
          ) +
        '</tbody></table>'
      );
    };

    const matchResultTable = match.matchHasBeenPlayed
      ? await buildStatsTable(match)
      : '';

    calendar.createEvent({
      start: moment(match.matchDateTime),
      end: moment(match.matchDateTime).add(3, 'hours'),
      id: match.matchId,
      summary: match.matchHasBeenPlayed
        ? `${match.matchVsTeams} - ${match.matchVsResult}`
        : match.matchVsTeams,
      description: `${
        match.matchHasBeenPlayed
          ? `<b>${match.matchVsResult}</b>\n\n${matchResultTable}`
          : match.matchOilPatternName
      }\n<a href="${
        match.matchHallOnlineScoringUrl
      }">Live Scoring Available Here</a>`,
      location: match.matchHallName,
    });
  }
  // then we return the calendar
  return calendar.toString();
};

/**
curl 'https://api.swebowl.se/api/v1/Match?APIKey=62fcl8gPUMXSQGW1t2Y8mc2zeTk97vbd&divisionId=9&seasonId=2020&matchStatus=' \
  -H 'authority: api.swebowl.se' \
  -H 'pragma: no-cache' \
  -H 'cache-control: no-cache' \
  // -H 'accept: **' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36' \
  -H 'origin: https://bits.swebowl.se' \
  -H 'sec-fetch-site: same-site' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-dest: empty' \
  -H 'referer: https://bits.swebowl.se/seriespel?seasonId=2020&divisionId=9&showTeamDivisionTable=true&showAllDivisionMatches=true&showTeamDetails=true' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8,sv;q=0.7' \
  --compressed
*/
