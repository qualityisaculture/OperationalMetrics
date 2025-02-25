const express = require("express");
const metricsRoute = express.Router();
import Jira from "../../server/Jira";
import JiraRequester from "../JiraRequester";
import BurnupGraphManager from "../graphManagers/BurnupGraphManager";
import EstimatesGraphManager from "../graphManagers/EstimatesGraphManager";
import ThroughputGraphManager from "../graphManagers/ThroughputGraphManager";
import {
  TypedResponse as TR,
  TypedRequestQuery as TRQ,
  TypedRequestBody as TRB,
} from "../../Types";
import BambooRequester from "../BambooRequester";
import BambooGraphManager from "../graphManagers/BambooGraphManager";
import TimeInDevManager from "../graphManagers/TimeInDevManager";
import LeadTimeGraphManager from "../graphManagers/LeadTimeGraphManager";
import CumulativeFlowDiagramManager from "../graphManagers/CumulativeFlowDiagramManager";
import DoraLeadTimeForChanges from "../graphManagers/DoraLeadTimeForChanges";

async function getJiraData(issueKey: string) {}

const jiraRequester = new JiraRequester();
const bambooRequester = new BambooRequester();
const burnupGraphManager = new BurnupGraphManager(jiraRequester);
const estimatesGraphManager = new EstimatesGraphManager(jiraRequester);
const throughputGraphManager = new ThroughputGraphManager(jiraRequester);
const bambooGraphManager = new BambooGraphManager(bambooRequester);
const timeInDevManager = new TimeInDevManager(jiraRequester);
const leadTimeGraphManager = new LeadTimeGraphManager(jiraRequester);
const cfdm = new CumulativeFlowDiagramManager(jiraRequester);
const doraLeadTimeForChanges = new DoraLeadTimeForChanges(jiraRequester);

metricsRoute.get(
  "/cumulativeFlowDiagram",
  (
    req: TRQ<{ query: string; startDate: string; endDate: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const query = req.query.query;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);
    cfdm
      .getCumulativeFlowDiagramData(query, startDate, endDate)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/leadTime",
  (
    req: TRQ<{
      query: string;
      currentSprintStartDate: string;
      numberOfSprints: string;
    }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const query = req.query.query;
    const currentSprintStartDate = new Date(req.query.currentSprintStartDate);
    const numberOfSprints = parseInt(req.query.numberOfSprints);
    leadTimeGraphManager
      .getLeadTimeData(query, currentSprintStartDate, numberOfSprints)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/timeInDev",
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    timeInDevManager
      .getTimeInDevData(query)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/bamboo",
  (
    req: TRQ<{ projectBuildKey: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const projectBuildKey = req.query.projectBuildKey;
    bambooGraphManager
      .getBuildDataByWeek(projectBuildKey)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/throughput",
  (
    req: TRQ<{
      query: string;
      currentSprintStartDate: string;
      numberOfSprints: string;
    }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const query = req.query.query;
    const currentSprintStartDate = new Date(req.query.currentSprintStartDate);
    const numberOfSprints = parseInt(req.query.numberOfSprints);
    throughputGraphManager
      .getThroughputData(query, currentSprintStartDate, numberOfSprints)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/estimates",
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    estimatesGraphManager
      .getEpicEstimatesData(query)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/epicBurnup",
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    burnupGraphManager
      .getEpicBurnupData(query)
      .then((data) => {
        res.json({ message: "Metrics route", data: JSON.stringify(data) });
      })
      .catch((error) => console.error("Error:", error));
  }
);

metricsRoute.get(
  "/doraLeadTime",
  (
    req: TRQ<{ projectName: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const projectName = req.query.projectName;
    doraLeadTimeForChanges
      .getDoraLeadTime(projectName)
      .then((data) => {
        res.json({
          message: "Dora lead time fetched successfully",
          data: JSON.stringify(data),
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        res
          //@ts-ignore
          .status(500)
          .json({ message: "Failed to fetch Dora lead time", error: error.message });
      });
  }
);

metricsRoute.get(
  "/metrics",
  (req: TRQ<{}>, res: TR<{ message: string; data: string }>) => {
    const domain = process.env.JIRA_DOMAIN;
    const issueKey = "AF-1";
    const url = `${domain}/${issueKey}`;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    fetch(url, {
      method: "GET", // or 'POST', 'PUT', etc. depending on your request
      headers: {
        Authorization: "Basic " + btoa(`${email}:${apiToken}`),
        Accept: "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        res.json({ message: "Metrics route", data });
      })
      .catch((error) => console.error("Error:", error));
  }
);

export { metricsRoute };
