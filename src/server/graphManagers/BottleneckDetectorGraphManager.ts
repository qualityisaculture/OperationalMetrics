import JiraRequester from "../JiraRequester";
import { LiteJiraIssue } from "../../client/BottleneckDetector/types";

export default class BottleneckDetectorGraphManager {
  private jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getBottleneckData(
    project: string,
    jql: string
  ): Promise<LiteJiraIssue[]> {
    try {
      console.log(
        `BottleneckDetectorGraphManager: Executing JQL query for project ${project}: ${jql}`
      );

      // Execute real JQL query through Jira API
      const issues = await this.jiraRequester.getQuery(jql);

      // Transform the raw Jira API response to our LiteJiraIssue format
      return this.transformToLiteJiraIssues(issues);
    } catch (error) {
      console.error(
        "Error in BottleneckDetectorGraphManager.getBottleneckData:",
        error
      );
      throw error;
    }
  }

  private transformToLiteJiraIssues(issues: any[]): LiteJiraIssue[] {
    return issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary || "No Summary",
      status: issue.fields.status?.name || "Unknown",
      assignee: issue.fields.assignee?.displayName || "Unassigned",
      created: issue.fields.created || new Date().toISOString(),
      updated: issue.fields.updated || new Date().toISOString(),
      priority: issue.fields.priority?.name || "No Priority",
      issueType: issue.fields.issuetype?.name || "Unknown",
    }));
  }
}
