import cal from 'ical-generator';
import moment from 'moment';
import fetch from 'node-fetch';
export const normalize = (team: string) => {
  const withoutSpacesAndHyphens = team.replace(/-|\s/g, '');
  const normalized = withoutSpacesAndHyphens.normalize();
  return normalized.toLowerCase();
};

export const buildCalendar = async (incomingTeamName: string) => {
  //first we need an api token which we can extract from the bits homepage
  const pageVisitHTMLString = await fetch('https://bits.swebowl.se').then((r) =>
    r.text()
  );

  const [, apiKey] = pageVisitHTMLString.match(/apiKey: "(.+)"/);

  // then we request all games
  const allGames = await fetch(
    `https://api.swebowl.se/api/v1/Match?APIKey=${apiKey}&seasonId=2020`,
    {
      headers: {
        authority: 'api.swebowl.se',
        referer: 'https://bits.swebowl.se/seriespel',
      },
    }
  ).then((r) => r.json());

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

  console.warn(matches);

  matches.forEach((match) => {
    calendar.createEvent({
      start: moment(match.matchDateTime),
      end: moment(match.matchDateTime).add(3, 'hours'),
      id: match.matchId,
      summary: match.matchHasBeenPlayed
        ? `${match.matchVsTeams} - ${match.matchVsResult}`
        : match.matchVsTeams,
      description: `${
        match.matchHasBeenPlayed
          ? match.matchVsResult
          : match.matchOilPatternName
      }\n${match.matchHallOnlineScoringUrl}`,
      location: match.matchHallName,
    });
  });
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
