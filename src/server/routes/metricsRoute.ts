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
import CustomerSLAGraphManager from "../graphManagers/CustomerSLAGraphManager";
import CreatedResolvedGraphManager from "../graphManagers/CreatedResolvedGraphManager";
import TempoReportGraphManager from "../graphManagers/TempoReportGraphManager";

async function getJiraData(issueKey: string) {}

const jiraRequester = new JiraRequester();
const bambooRequester = new BambooRequester();
const burnupGraphManager = new BurnupGraphManager(jiraRequester);
const estimatesGraphManager = new EstimatesGraphManager(jiraRequester);
const bambooGraphManager = new BambooGraphManager(bambooRequester);
const timeInDevManager = new TimeInDevManager(jiraRequester);
const leadTimeGraphManager = new LeadTimeGraphManager(jiraRequester);
const cfdm = new CumulativeFlowDiagramManager(jiraRequester);
const doraLeadTimeForChanges = new DoraLeadTimeForChanges(jiraRequester);
const customerSLAGraphManager = new CustomerSLAGraphManager(jiraRequester);
const createdResolvedGraphManager = new CreatedResolvedGraphManager(
  jiraRequester
);
const tempoReportGraphManager = new TempoReportGraphManager();

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

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create a new ThroughputGraphManager with progress callback
    const throughputGraphManager = new ThroughputGraphManager(
      jiraRequester,
      (progress) => {
        console.log("Sending progress update:", progress);
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    // Send initial processing message
    res.write(
      `data: ${JSON.stringify({
        status: "processing",
        step: "initializing",
        message: "Starting to process throughput data...",
        progress: {
          current: 0,
          total: 0,
          totalIssues: 0,
        },
      })}\n\n`
    );

    throughputGraphManager
      .getThroughputData(query, currentSprintStartDate, numberOfSprints)
      .then((data) => {
        // Send completion message with data
        res.write(
          `data: ${JSON.stringify({
            status: "complete",
            data: JSON.stringify(data),
          })}\n\n`
        );
        res.end();
      })
      .catch((error) => {
        console.error("Error:", error);
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            message: error.message,
          })}\n\n`
        );
        res.end();
      });
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

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Create a new BurnupGraphManager with progress callback
    const burnupGraphManager = new BurnupGraphManager(
      jiraRequester,
      (progress) => {
        console.log("Sending progress update:", progress);
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    // Send initial processing message
    res.write(
      `data: ${JSON.stringify({
        status: "processing",
        step: "initializing",
        message: "Starting to process burnup data...",
        progress: {
          current: 0,
          total: 0,
          currentEpic: "",
          totalEpics: 0,
          totalIssues: 0,
        },
      })}\n\n`
    );

    burnupGraphManager
      .getEpicBurnupData(query)
      .then((data) => {
        // Send completion message with data
        res.write(
          `data: ${JSON.stringify({
            status: "complete",
            data: JSON.stringify(data),
          })}\n\n`
        );
        res.end();
      })
      .catch((error) => {
        console.error("Error:", error);
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            message: error.message,
          })}\n\n`
        );
        res.end();
      });
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
          .json({
            message: "Failed to fetch Dora lead time",
            error: error.message,
          });
      });
  }
);

metricsRoute.get(
  "/customerSLA",
  (
    req: TRQ<{ projectNames: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const projectNamesParam = req.query.projectNames;

    // Handle both single project (legacy) and multiple projects
    let projectNames: string[];
    if (projectNamesParam.includes(",")) {
      projectNames = projectNamesParam.split(",").map((name) => name.trim());
    } else {
      projectNames = [projectNamesParam];
    }

    console.log(
      `Customer SLA endpoint called for projects: ${projectNames.join(", ")}`
    );

    customerSLAGraphManager
      .getCustomerSLADataForMultipleProjects(projectNames)
      .then((data) => {
        res.json({
          message: "Customer SLA data fetched successfully",
          data: JSON.stringify(data),
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        res.json({
          message: "Error fetching Customer SLA data",
          data: JSON.stringify([]),
        });
      });
  }
);

metricsRoute.get(
  "/projects",
  (req: TRQ<{}>, res: TR<{ message: string; data: string }>) => {
    console.log("Projects endpoint called - fetching from Jira");

    jiraRequester
      .getProjects()
      .then((projects) => {
        console.log(`Found ${projects.length} projects from Jira`);
        res.json({
          message: "Projects fetched successfully from Jira",
          data: JSON.stringify(projects),
        });
      })
      .catch((error) => {
        console.error("Error fetching projects from Jira:", error);
        res.json({
          message: "Error fetching projects from Jira",
          data: JSON.stringify([]),
        });
      });
  }
);

metricsRoute.get(
  "/createdResolved",
  (
    req: TRQ<{ query: string; startDate: string; endDate: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const query = req.query.query;
    const startDate = new Date(req.query.startDate);
    const endDate = new Date(req.query.endDate);

    createdResolvedGraphManager
      .getCreatedResolvedData(query, startDate, endDate)
      .then((data) => {
        res.json({
          message: "Created/Resolved data fetched successfully",
          data: JSON.stringify(data),
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        res.json({
          message: "Error fetching Created/Resolved data",
          data: JSON.stringify([]),
        });
      });
  }
);

metricsRoute.get(
  "/tempoAccounts",
  (req: TRQ<{}>, res: TR<{ message: string; data: string }>) => {
    tempoReportGraphManager
      .getAccounts()
      .then((accounts) => {
        res.json({
          message: "Tempo accounts data fetched successfully",
          data: JSON.stringify(accounts),
        });
      })
      .catch((error) => {
        console.error("Error fetching Tempo accounts:", error);
        res.json({
          message: "Error fetching Tempo accounts data",
          data: JSON.stringify([]),
        });
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
