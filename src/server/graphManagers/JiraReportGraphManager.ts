import JiraRequester, { LiteJiraIssue } from "../JiraRequester";

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
  children: string[];
}

export default class JiraReportGraphManager {
  jiraRequester: JiraRequester;

  constructor(jiraRequester: JiraRequester) {
    this.jiraRequester = jiraRequester;
  }

  async getProjects(): Promise<JiraProject[]> {
    try {
      const projects = await this.jiraRequester.getProjects();
      return projects;
    } catch (error) {
      console.error("Error fetching projects from Jira:", error);
      throw error;
    }
  }

  async getProjectIssues(projectKey: string): Promise<JiraIssue[]> {
    try {
      // Create a minimal JQL query to get issues for the specific project
      const jql = `project = "${projectKey}" ORDER BY created DESC`;

      // Use the new lite query method to get minimal data
      const issues = await this.jiraRequester.getLiteQuery(jql);

      // The data is already in the correct format, just return it
      return issues;
    } catch (error) {
      console.error(`Error fetching issues for project ${projectKey}:`, error);
      throw error;
    }
  }
}
