import JiraRequester from "../JiraRequester";
import Jira from "../Jira";
import { getWorkDaysBetween } from "../Utils";

export interface ResolutionTimeIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  createdDate: string;
  resolutionDate: string;
  url: string;
  timeInStates: { status: string; days: number }[];
}

export default class AverageResolutionTimeGraphManager {
  jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getResolutionTimeData(
    projectKeys: string[],
    resolutionDateAfter: Date
  ): Promise<ResolutionTimeIssue[]> {
    console.log(
      `AverageResolutionTimeGraphManager: Processing projects ${projectKeys.join(
        ", "
      )} with resolution date after ${resolutionDateAfter.toISOString()}`
    );

    // Build JQL query to get all issues in the projects that:
    // - Have resolved date after the specified date
    // - Status is "Resolved" or "Closed"
    const projectQuery = projectKeys
      .map((key) => `project = "${key}"`)
      .join(" OR ");
    const dateStr = resolutionDateAfter.toISOString().split("T")[0];
    const jqlQuery = `(${projectQuery}) AND resolved >= "${dateStr}" AND (status = "Resolved" OR status = "Closed") ORDER BY resolved DESC`;

    console.log(
      `AverageResolutionTimeGraphManager: Executing JQL query: ${jqlQuery}`
    );

    try {
      // Fetch issues from Jira with changelog
      const jiraIssues = await this.jiraRequester.getQuery(jqlQuery);

      console.log(
        `AverageResolutionTimeGraphManager: Found ${jiraIssues.length} issues`
      );

      // Convert to ResolutionTimeIssue format and calculate time in each state
      const resolutionTimeIssues: ResolutionTimeIssue[] = jiraIssues.map(
        (jira) => {
          const timeInStates = this.calculateTimeInStates(jira);
          return {
            key: jira.getKey(),
            summary: jira.getSummary(),
            type: jira.getType(),
            status: jira.getStatus(),
            createdDate: jira.getCreated() ? jira.getCreated().toISOString() : "",
            resolutionDate: jira.fields.resolutiondate || "",
            url: jira.getUrl(),
            timeInStates: timeInStates,
          };
        }
      );

      console.log(
        `AverageResolutionTimeGraphManager: Processed ${resolutionTimeIssues.length} issues`
      );
      return resolutionTimeIssues;
    } catch (error) {
      console.error(
        `AverageResolutionTimeGraphManager: Error fetching data:`,
        error
      );
      throw error;
    }
  }

  async getResolutionTimeDataFromJQL(
    jqlQuery: string
  ): Promise<ResolutionTimeIssue[]> {
    console.log(
      `AverageResolutionTimeGraphManager: Processing custom JQL query: ${jqlQuery}`
    );

    try {
      // Fetch issues from Jira with changelog using the custom JQL
      const jiraIssues = await this.jiraRequester.getQuery(jqlQuery);

      console.log(
        `AverageResolutionTimeGraphManager: Found ${jiraIssues.length} issues`
      );

      // Convert to ResolutionTimeIssue format and calculate time in each state
      const resolutionTimeIssues: ResolutionTimeIssue[] = jiraIssues.map(
        (jira) => {
          const timeInStates = this.calculateTimeInStates(jira);
          return {
            key: jira.getKey(),
            summary: jira.getSummary(),
            type: jira.getType(),
            status: jira.getStatus(),
            createdDate: jira.getCreated() ? jira.getCreated().toISOString() : "",
            resolutionDate: jira.fields.resolutiondate || "",
            url: jira.getUrl(),
            timeInStates: timeInStates,
          };
        }
      );

      console.log(
        `AverageResolutionTimeGraphManager: Processed ${resolutionTimeIssues.length} issues`
      );
      return resolutionTimeIssues;
    } catch (error) {
      console.error(
        `AverageResolutionTimeGraphManager: Error fetching data:`,
        error
      );
      throw error;
    }
  }

  private calculateTimeInStates(
    jira: Jira
  ): { status: string; days: number }[] {
    const statusChanges = jira.statusChanges;
    if (statusChanges.length === 0) {
      return [];
    }

    const statusMap = new Map<string, number>();
    const allStatuses = new Set<string>();

    // Initialize all statuses
    statusChanges.forEach((change) => {
      allStatuses.add(change.status);
    });

    // Calculate time spent in each state
    let previousTime = statusChanges[0].date;
    for (let i = 1; i < statusChanges.length; i++) {
      const status = statusChanges[i - 1].status;
      const time = statusChanges[i].date;
      const duration = getWorkDaysBetween(previousTime, time);
      const previousDuration = statusMap.get(status) || 0;
      statusMap.set(status, previousDuration + duration);
      previousTime = time;
    }

    // Handle the final state (from last status change to resolution date)
    if (statusChanges.length > 0 && jira.fields.resolutiondate) {
      const finalStatus = statusChanges[statusChanges.length - 1].status;
      const resolutionDate = jira.getResolved();
      const finalDuration = getWorkDaysBetween(previousTime, resolutionDate);
      const finalPreviousDuration = statusMap.get(finalStatus) || 0;
      statusMap.set(finalStatus, finalPreviousDuration + finalDuration);
    }

    // Convert to array and sort by status name
    return Array.from(statusMap.entries())
      .map(([status, days]) => ({ status, days }))
      .sort((a, b) => a.status.localeCompare(b.status));
  }
}

