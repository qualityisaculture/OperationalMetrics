const express = require('express');
const metricsRoute = express.Router();
import {
  TypedResponse as TR,
  TypedRequestQuery as TRQ,
  TypedRequestBody as TRB,
} from '../../Types';

metricsRoute.get('/metrics', (req: TRQ<{}>, res: TR<{ message: string, data: string }>) => {
  const domain = process.env.JIRA_DOMAIN;
  const issueKey = 'AF-1';
  const url = `${domain}/${issueKey}`;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  let responseData;
  fetch(url, {
    method: 'GET', // or 'POST', 'PUT', etc. depending on your request
    headers: {
      Authorization: 'Basic ' + btoa(`${email}:${apiToken}`),
      Accept: 'application/json',
    },
  })
    .then((response) => response.json())
    .then((data) => {
      responseData = data;
      res.json({ message: 'Metrics route', data: responseData });
    })
    .catch((error) => console.error('Error:', error));

});

export { metricsRoute };
