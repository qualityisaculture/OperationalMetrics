const express = require('express');
const metricsRoute = express.Router();
import Jira from '../../server/Jira';
import JiraRequester from '../JiraRequester';
import BurnupGraphManager from '../graphManagers/BurnupGraphManager';
import EstimatesGraphManager from '../graphManagers/EstimatesGraphManager';
import ThroughputGraphManager from '../graphManagers/ThroughputGraphManager';
import {
  TypedResponse as TR,
  TypedRequestQuery as TRQ,
  TypedRequestBody as TRB,
} from '../../Types';


async function getJiraData(issueKey: string) {
  
}

const jiraRequester = new JiraRequester();
const burnupGraphManager = new BurnupGraphManager(jiraRequester);
const estimatesGraphManager = new EstimatesGraphManager(jiraRequester);
const throughputGraphManager = new ThroughputGraphManager(jiraRequester);

metricsRoute.get(
  '/throughput',
  (
    req: TRQ<{ query: string, currentSprintStartDate: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const query = req.query.query;
    const currentSprintStartDate = new Date(req.query.currentSprintStartDate);
    throughputGraphManager
      .getThroughputData(query, currentSprintStartDate)
      .then((data) => {
        res.json({ message: 'Metrics route', data: JSON.stringify(data) });
      })
      .catch((error) => console.error('Error:', error));
  });

metricsRoute.get(
  '/estimates', 
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    estimatesGraphManager
      .getEpicEstimatesData(query)
      .then((data) => {
        res.json({ message: 'Metrics route', data: JSON.stringify(data) });
      })
      .catch((error) => console.error('Error:', error));
  }
);

metricsRoute.get(
  '/epicBurnup',
  (
    req: TRQ<{ epicIssueKey: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const issueKey = req.query.epicIssueKey;
    burnupGraphManager
      .getEpicBurnupData(issueKey)
      .then((data) => {
        res.json({ message: 'Metrics route', data: JSON.stringify(data) });
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
