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
import WorkstreamOrphanDetectorGraphManager from "../graphManagers/WorkstreamOrphanDetectorGraphManager";

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
const workstreamOrphanDetectorGraphManager =
  new WorkstreamOrphanDetectorGraphManager(jiraRequester);

metricsRoute.get(
  "/cumulativeFlowDiagram",
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    cfdm
      .getCumulativeFlowDiagramData(query)
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
    const withTimeSpentDetail = req.query.withTimeSpentDetail === "true";
    console.log(
      `Jira Report workstream endpoint called for workstream: ${workstreamKey}, withTimeSpentDetail: ${withTimeSpentDetail}`
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
      }, withTimeSpentDetail)
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

// Type Breakdown Analyser API route
metricsRoute.get(
  "/typeBreakdownAnalyser",
  (req: TRQ<{ query: string }>, res: TR<{ message: string; data: string }>) => {
    const query = req.query.query;
    console.log(`Type Breakdown Analyser endpoint called with query: ${query}`);

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send initial processing message
    res.write(
      `data: ${JSON.stringify({
        status: "processing",
        step: "initializing",
        message: `Starting to fetch and analyse data for query: ${query}`,
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

    // Use JiraRequester to fetch issues from JQL query, then recursively fetch children
    jiraRequester
      .getLiteQuery(query)
      .then(async (issues) => {
        console.log(
          `Type Breakdown Analyser: Found ${issues.length} issues for query: ${query}`
        );

        if (issues.length === 0) {
          res.write(
            `data: ${JSON.stringify({
              status: "complete",
              data: JSON.stringify({
                key: "query-results",
                summary: `Query Results: ${query}`,
                type: "Query",
                status: "Complete",
                children: [],
                childCount: 0,
                url: "",
                originalEstimate: null,
                timeSpent: null,
                timeRemaining: null,
                dueDate: null,
                epicStartDate: null,
                epicEndDate: null,
              }),
              hasData: false,
            })}\n\n`
          );
          res.end();
          return;
        }

        // Send progress update
        res.write(
          `data: ${JSON.stringify({
            status: "processing",
            step: "fetching_children",
            message: `Found ${issues.length} issues, now fetching children recursively...`,
            progress: {
              currentLevel: 1,
              totalLevels: 1,
              currentIssues: issues.map((i) => i.key),
              totalIssues: issues.length,
              apiCallsMade: 1,
              totalApiCalls: 1,
              currentPhase: "fetching_children",
              phaseProgress: 0,
              phaseTotal: 1,
            },
          })}\n\n`
        );

        // For each issue, fetch its children recursively using the JiraReportGraphManager
        const issuesWithChildren: any[] = [];
        for (let i = 0; i < issues.length; i++) {
          const issue = issues[i];
          try {
            // Use the existing recursive fetching method for each issue
            const issueWithChildren =
              await jiraReportGraphManager.getWorkstreamIssues(
                issue.key,
                (progress) => {
                  // Forward progress updates
                  res.write(`data: ${JSON.stringify(progress)}\n\n`);
                }
              );
            issuesWithChildren.push(issueWithChildren);
          } catch (error) {
            console.error(
              `Error fetching children for issue ${issue.key}:`,
              error
            );
            // Add the issue without children if fetching fails
            issuesWithChildren.push({
              ...issue,
              children: [],
              childCount: 0,
            });
          }
        }

        // Create a root container with all the issues as children
        const rootData = {
          key: "query-results",
          summary: `Query Results: ${query}`,
          type: "Query",
          status: "Complete",
          children: issuesWithChildren,
          childCount: issuesWithChildren.length,
          url: "",
          originalEstimate: null,
          timeSpent: null,
          timeRemaining: null,
          dueDate: null,
          epicStartDate: null,
          epicEndDate: null,
        };

        console.log(
          `Type Breakdown Analyser: Completed fetching data for query: ${query}`
        );
        console.log(`Root data:`, rootData);

        // Send completion message with data
        res.write(
          `data: ${JSON.stringify({
            status: "complete",
            data: JSON.stringify(rootData),
            hasData: issuesWithChildren.length > 0,
          })}\n\n`
        );
        res.end();
      })
      .catch((error) => {
        console.error(
          `Error in Type Breakdown Analyser for query ${query}:`,
          error
        );

        // Send error message
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            message: `Error analysing data for query ${query}: ${error.message}`,
          })}\n\n`
        );
        res.end();
      });
  }
);

// Account Worklogs by Month API route
metricsRoute.get(
  "/jiraReport/account/:account/worklogs/:year/:month",
  async (req: Request, res: TR<{ message: string; data: string }>) => {
    const account = req.params.account;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    console.log(
      `Account worklogs endpoint called for account: ${account}, year: ${year}, month: ${month}`
    );

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.json({
        message: "Invalid year or month parameter",
        data: JSON.stringify({
          error: "Year must be a number and month must be between 1 and 12",
        }),
      });
      return;
    }

    try {
      console.log(
        `Starting worklog fetch for account: ${account}, year: ${year}, month: ${month}`
      );

      const worklogs = await jiraRequester.getWorklogsForAccountMonth(
        account,
        year,
        month
      );

      console.log(`Retrieved ${worklogs.length} worklogs from JiraRequester`);

      // Calculate summary statistics
      const totalTimeSpent = worklogs.reduce(
        (sum, worklog) => sum + worklog.timeSpentSeconds,
        0
      );
      const uniqueIssues = new Set(worklogs.map((w) => w.issueKey)).size;
      const uniqueAuthors = new Set(worklogs.map((w) => w.author)).size;

      console.log(
        `Summary: ${worklogs.length} worklogs, ${uniqueIssues} unique issues, ${uniqueAuthors} unique authors, ${totalTimeSpent} total seconds`
      );

      const summary = {
        totalWorklogs: worklogs.length,
        totalTimeSpentSeconds: totalTimeSpent,
        totalTimeSpentHours: Math.round((totalTimeSpent / 3600) * 100) / 100,
        uniqueIssues,
        uniqueAuthors,
        worklogs,
      };

      res.json({
        message: `Worklogs for account ${account} for ${year}-${month.toString().padStart(2, "0")} fetched successfully`,
        data: JSON.stringify(summary),
      });
    } catch (error) {
      console.error(`Error fetching worklogs for account ${account}:`, error);
      res.json({
        message: `Error fetching worklogs for account ${account}: ${error.message}`,
        data: JSON.stringify({ error: error.message }),
      });
    }
  }
);

// Workstream Orphan Detector API route
metricsRoute.get(
  "/jiraReport/workstream/:workstreamKey/orphan-detector",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    const workstreamKey = req.params.workstreamKey;
    console.log(
      `Workstream Orphan Detector endpoint called for workstream: ${workstreamKey}`
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
        message: `Starting orphan detection for workstream ${workstreamKey}...`,
        progress: {
          currentPhase: "initializing",
          phaseProgress: 0,
          phaseTotal: 4,
          issuesProcessed: 0,
          totalIssues: 0,
          orphansFound: 0,
          linksProcessed: 0,
        },
      })}\n\n`
    );

    workstreamOrphanDetectorGraphManager
      .detectOrphans(workstreamKey, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      })
      .then((result) => {
        console.log(
          `Orphan detection completed for workstream ${workstreamKey}`
        );

        // Log the structure being sent to frontend
        console.log(
          `\n=== SENDING ORPHAN DETECTOR DATA TO FRONTEND FOR ${workstreamKey} ===`
        );
        console.log(
          `Workstream: ${result.workstream.key} - ${result.workstream.summary}`
        );
        console.log(
          `Total issues in workstream: ${result.workstream.children.length}`
        );
        console.log(
          `Total linked issues with parents: ${result.linkedIssuesWithParents.length}`
        );

        console.log(`=== END ORPHAN DETECTOR DATA ===\n`);

        // Send completion message with data
        res.write(
          `data: ${JSON.stringify({
            status: "complete",
            data: JSON.stringify({
              workstream: result.workstream,
              linkedIssuesWithParents: result.linkedIssuesWithParents,
            }),
            hasData: result.workstream.children.length > 0,
          })}\n\n`
        );
        res.end();
      })
      .catch((error) => {
        console.error(
          `Error in orphan detection for workstream ${workstreamKey}:`,
          error
        );

        // Send error message
        res.write(
          `data: ${JSON.stringify({
            status: "error",
            message: `Error in orphan detection for workstream ${workstreamKey}: ${error.message}`,
          })}\n\n`
        );
        res.end();
      });
  }
);

// Orphan Detector Cache Management API routes
metricsRoute.get(
  "/jiraReport/orphan-detector/cache/stats",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    try {
      const cacheStats = workstreamOrphanDetectorGraphManager.getCacheStats();
      res.json({
        message: "Cache stats retrieved successfully",
        data: JSON.stringify(cacheStats),
      });
    } catch (error) {
      console.error("Error getting cache stats:", error);
      res.json({
        message: "Failed to get cache stats",
        data: JSON.stringify({ error: error.message }),
      });
    }
  }
);

metricsRoute.delete(
  "/jiraReport/cache",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    try {
      jiraReportGraphManager.clearCache();
      res.json({
        message: "Jira Report cache cleared successfully",
        data: JSON.stringify({ success: true }),
      });
    } catch (error) {
      console.error("Error clearing Jira Report cache:", error);
      res.json({
        message: "Failed to clear cache",
        data: JSON.stringify({ error: (error as Error).message }),
      });
    }
  }
);

metricsRoute.delete(
  "/jiraReport/orphan-detector/cache",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    try {
      workstreamOrphanDetectorGraphManager.clearCache();
      res.json({
        message: "Cache cleared successfully",
        data: JSON.stringify({ success: true }),
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.json({
        message: "Failed to clear cache",
        data: JSON.stringify({ error: error.message }),
      });
    }
  }
);

metricsRoute.delete(
  "/jiraReport/orphan-detector/cache/:workstreamKey",
  (req: Request, res: TR<{ message: string; data: string }>) => {
    try {
      const workstreamKey = req.params.workstreamKey;
      workstreamOrphanDetectorGraphManager.invalidateCache(workstreamKey);
      res.json({
        message: `Cache invalidated for workstream ${workstreamKey}`,
        data: JSON.stringify({ workstreamKey, success: true }),
      });
    } catch (error) {
      console.error("Error invalidating cache:", error);
      res.json({
        message: "Failed to invalidate cache",
        data: JSON.stringify({ error: error.message }),
      });
    }
  }
);

export { metricsRoute };
