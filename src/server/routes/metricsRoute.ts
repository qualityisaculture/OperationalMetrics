const express = require("express");
const metricsRoute = express.Router();
import { Request, Response } from "express";
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
import JiraReportGraphManager from "../graphManagers/JiraReportGraphManager";
import BottleneckDetectorGraphManager from "../graphManagers/BottleneckDetectorGraphManager";

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
const jiraReportGraphManager = new JiraReportGraphManager(jiraRequester);
const bottleneckDetectorGraphManager = new BottleneckDetectorGraphManager(
  jiraRequester
);

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
  "/tempoWorklogs/:accountKey",
  (req: Request, res: Response) => {
    const accountKey = req.params.accountKey;

    tempoReportGraphManager
      .getWorklogsByAccount(accountKey)
      .then((worklogs) => {
        res.json({
          message: "Tempo worklogs data fetched successfully",
          data: JSON.stringify(worklogs),
        });
      })
      .catch((error) => {
        console.error(
          `Error fetching Tempo worklogs for account ${accountKey}:`,
          error
        );
        res.json({
          message: `Error fetching Tempo worklogs data for account ${accountKey}`,
          data: JSON.stringify([]),
        });
      });
  }
);

metricsRoute.post("/tempoToJiraWorklog", (req: Request, res: Response) => {
  const { tempoWorklogId } = req.body;

  if (!tempoWorklogId) {
    res.status(400).json({
      message: "tempoWorklogId is required",
      data: JSON.stringify(null),
    });
    return;
  }

  tempoReportGraphManager
    .getJiraWorklogByTempoId(tempoWorklogId)
    .then((jiraWorklog) => {
      res.json({
        message: "Jira worklog data fetched successfully",
        data: JSON.stringify(jiraWorklog),
      });
    })
    .catch((error) => {
      console.error(
        `Error converting Tempo worklog ID ${tempoWorklogId} to Jira worklog:`,
        error
      );
      res.json({
        message: `Error converting Tempo worklog ID ${tempoWorklogId} to Jira worklog`,
        data: JSON.stringify(null),
      });
    });
});

metricsRoute.get("/jiraIssue/:issueId", (req: Request, res: Response) => {
  const issueId = req.params.issueId;

  if (!issueId) {
    res.status(400).json({
      message: "issueId is required",
      data: JSON.stringify(null),
    });
    return;
  }

  // Use the existing JiraRequester to fetch issue data by ID
  jiraRequester
    .getEssentialJiraDataFromKeys([issueId])
    .then((issues) => {
      if (issues && issues.length > 0) {
        res.json({
          message: "Jira issue data fetched successfully",
          data: JSON.stringify(issues[0]),
        });
      } else {
        res.json({
          message: `No Jira issue found with ID ${issueId}`,
          data: JSON.stringify(null),
        });
      }
    })
    .catch((error) => {
      console.error(`Error fetching Jira issue ${issueId}:`, error);
      res.json({
        message: `Error fetching Jira issue data for ID ${issueId}`,
        data: JSON.stringify(null),
      });
    });
});

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

// Real API route for Jira Report projects
metricsRoute.get(
  "/jiraReport/projects",
  (req: TRQ<{}>, res: TR<{ message: string; data: string }>) => {
    console.log("Jira Report projects endpoint called - fetching from Jira");

    jiraReportGraphManager
      .getProjects()
      .then((projects) => {
        console.log(`Found ${projects.length} projects from Jira`);
        res.json({
          message: "Jira projects fetched successfully",
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

// API route for Jira Report project workstreams
metricsRoute.get(
  "/jiraReport/project/:projectKey/workstreams",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const projectKey = req.params.projectKey;
    console.log(
      `Jira Report project workstreams endpoint called for project: ${projectKey}`
    );

    jiraReportGraphManager
      .getProjectWorkstreams(projectKey)
      .then((workstreams) => {
        console.log(
          `Found ${workstreams.length} workstreams for project ${projectKey}`
        );
        res.json({
          message: `Workstreams for project ${projectKey} fetched successfully`,
          data: JSON.stringify(workstreams),
        });
      })
      .catch((error) => {
        console.error(
          `Error fetching workstreams for project ${projectKey}:`,
          error
        );
        res.json({
          message: `Error fetching workstreams for project ${projectKey}`,
          data: JSON.stringify([]),
        });
      });
  }
);

// API route for getting all issues in a workstream (with complete recursive data)
metricsRoute.get(
  "/jiraReport/workstream/:workstreamKey/workstream",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const workstreamKey = req.params.workstreamKey;
    console.log(
      `Jira Report workstream endpoint called for workstream: ${workstreamKey}`
    );

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial processing message
    res.write(
      `data: ${JSON.stringify({
        status: "processing",
        step: "initializing",
        message: `Starting to fetch complete issue tree for workstream ${workstreamKey}...`,
        progress: {
          currentLevel: 0,
          totalLevels: 0,
          currentIssues: [],
          totalIssues: 0,
          apiCallsMade: 0,
          totalApiCalls: 0,
          currentPhase: "initializing",
          phaseProgress: 0,
          phaseTotal: 1,
        },
      })}\n\n`
    );

    jiraReportGraphManager
      .getWorkstreamIssues(workstreamKey, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      })
      .then((workstreamWithIssues) => {
        console.log(
          `Fetched complete issue tree for workstream ${workstreamKey}`
        );

        // Log the structure being sent to frontend
        console.log(
          `\n=== SENDING WORKSTREAM DATA TO FRONTEND FOR ${workstreamKey} ===`
        );
        console.log(
          `Workstream: ${workstreamWithIssues.key} - ${workstreamWithIssues.summary}`
        );
        console.log(
          `Total issues in workstream: ${workstreamWithIssues.children.length}`
        );
        console.log(`=== END WORKSTREAM DATA ===\n`);

        // Send completion message with data
        res.write(
          `data: ${JSON.stringify({
            status: "complete",
            data: JSON.stringify(workstreamWithIssues),
            hasData: workstreamWithIssues.children.length > 0,
          })}\n\n`
        );
        res.end();
      })
      .catch((error) => {
        console.error(
          `Error fetching issues for workstream ${workstreamKey}:`,
          error
        );

        // Send error message
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            message: `Error fetching issues for workstream ${workstreamKey}: ${error.message}`,
          })}\n\n`
        );
        res.end();
      });
  }
);

// New API route for getting issue children (Phase 3)
metricsRoute.get(
  "/jiraReport/issue/:issueKey/children",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const issueKey = req.params.issueKey;
    console.log(
      `Jira Report issue children endpoint called for issue: ${issueKey}`
    );

    jiraReportGraphManager
      .getIssueChildren(issueKey)
      .then((children) => {
        console.log(`Found ${children.length} children for issue ${issueKey}`);
        res.json({
          message: `Children for issue ${issueKey} fetched successfully`,
          data: JSON.stringify(children),
        });
      })
      .catch((error) => {
        console.error(`Error fetching children for issue ${issueKey}:`, error);
        res.json({
          message: `Error fetching children for issue ${issueKey}: ${error.message}`,
          data: JSON.stringify([]),
        });
      });
  }
);

// New API route for getting issue with all descendants (Phase 3)
metricsRoute.get(
  "/jiraReport/issue/:issueKey/with-children",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const issueKey = req.params.issueKey;
    console.log(
      `Jira Report issue with all children endpoint called for issue: ${issueKey}`
    );

    jiraReportGraphManager
      .getIssueWithAllChildren(issueKey, (progress) => {
        // In a non-SSE context, you might log this or handle it differently
        console.log("Progress update:", progress);
      })
      .then((issueWithChildren) => {
        console.log(`Fetched issue ${issueKey} with all descendants`);

        // Log the structure being sent to frontend
        console.log(`\n=== SENDING TO FRONTEND FOR ${issueKey} ===`);
        console.log(
          `Root issue: ${issueWithChildren.key} - ${issueWithChildren.summary}`
        );
        console.log(
          `Total children at root level: ${issueWithChildren.children.length}`
        );

        // Count total issues in the tree
        const countIssuesInTree = (issue: any): number => {
          let count = 1; // Count this issue
          if (issue.children && issue.children.length > 0) {
            for (const child of issue.children) {
              count += countIssuesInTree(child);
            }
          }
          return count;
        };

        const totalIssuesInTree = countIssuesInTree(issueWithChildren);
        console.log(`Total issues in complete tree: ${totalIssuesInTree}`);
        console.log(`=== END FRONTEND DATA ===\n`);

        res.json({
          message: `Issue ${issueKey} with all descendants fetched successfully`,
          data: JSON.stringify(issueWithChildren),
        });
      })
      .catch((error) => {
        console.error(
          `Error fetching issue ${issueKey} with all children:`,
          error
        );
        res.json({
          message: `Error fetching issue ${issueKey} with all children: ${error.message}`,
          data: JSON.stringify(null),
        });
      });
  }
);

// Bottleneck Detector API route
metricsRoute.get(
  "/bottleneck-detector",
  (
    req: TRQ<{ project: string; jql: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    const project = req.query.project;
    const jql = req.query.jql;

    console.log(
      `Bottleneck Detector endpoint called for project: ${project} with JQL: ${jql}`
    );

    bottleneckDetectorGraphManager
      .getBottleneckData(project, jql)
      .then((data) => {
        res.json({
          message: "Bottleneck Detector data fetched successfully",
          data: JSON.stringify(data),
        });
      })
      .catch((error) => {
        console.error("Error in Bottleneck Detector API:", error);
        res.json({
          message: `Error fetching Bottleneck Detector data: ${error.message}`,
          data: JSON.stringify([]),
        });
      });
  }
);

// Time Bookings API route for workstreams
metricsRoute.get(
  "/jiraReport/workstream/:workstreamKey/timeBookings",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const workstreamKey = req.params.workstreamKey;
    console.log(
      `Time Bookings endpoint called for workstream: ${workstreamKey}`
    );

    // TODO: This will eventually call Jira API to get actual time booking data
    // For now, return mock data
    const mockTimeBookings = [
      { date: "2024-01-15", timeSpent: 2.5 },
      { date: "2024-01-16", timeSpent: 1.0 },
      { date: "2024-01-17", timeSpent: 3.0 },
      { date: "2024-01-18", timeSpent: 0.5 },
      { date: "2024-01-19", timeSpent: 2.0 },
      { date: "2024-01-22", timeSpent: 1.5 },
      { date: "2024-01-23", timeSpent: 2.5 },
      { date: "2024-01-24", timeSpent: 1.0 },
      { date: "2024-01-25", timeSpent: 3.5 },
      { date: "2024-01-26", timeSpent: 0.5 },
    ];

    // Simulate some delay to mimic real API call
    setTimeout(() => {
      res.json({
        message: `Time bookings for workstream ${workstreamKey} fetched successfully`,
        data: JSON.stringify(mockTimeBookings),
      });
    }, 1000);
  }
);

export { metricsRoute };
