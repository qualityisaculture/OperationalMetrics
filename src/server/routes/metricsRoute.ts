const express = require('express');
const metricsRoute = express.Router();
const { Jira } = require('../../client/Jira');
import {
  TypedResponse as TR,
  TypedRequestQuery as TRQ,
  TypedRequestBody as TRB,
} from '../../Types';

async function getJiraData(issueKey: string) {
  
}

metricsRoute.get(
  '/epicBurnup',
  (
    req: TRQ<{ epicIssueKey: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const issueKey = req.query.epicIssueKey;
    getJiraData(issueKey)
      .then((data) => {
        let epicJira = new Jira(data);
        res.json({ message: 'Metrics route', data: epicJira.getChildren() });
      })
      .catch((error) => console.error('Error:', error));
  }
);

metricsRoute.get(
  '/metrics',
  (req: TRQ<{}>, res: TR<{ message: string; data: string }>) => {
    const domain = process.env.JIRA_DOMAIN;
    const issueKey = 'AF-1';
    const url = `${domain}/${issueKey}`;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    fetch(url, {
      method: 'GET', // or 'POST', 'PUT', etc. depending on your request
      headers: {
        Authorization: 'Basic ' + btoa(`${email}:${apiToken}`),
        Accept: 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        res.json({ message: 'Metrics route', data });
      })
      .catch((error) => console.error('Error:', error));
  }
);

export { metricsRoute };
