import express from 'express';

export const server = express();
import { buildCalendar, normalize } from '../lib';

server.get('/v1/games/:team', async (request, response) => {
  const teamName = normalize(request.params.team);

  const calendar = await buildCalendar(teamName);
  response.set('Content-Type', 'text/calendar;charset=utf-8');
  response.set('Content-Disposition', `attachment; filename="${teamName}.ics"`);

  response.send(calendar);
});
