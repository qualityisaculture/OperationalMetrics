import JiraRequester, { LiteJiraIssue } from "../JiraRequester";

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

      // Execute real JQL query through Jira API using the faster LiteJira method
      const issues = await this.jiraRequester.getLiteQuery(jql);

      // The getLiteQuery already returns LiteJiraIssue format, so no transformation needed
      return issues;
    } catch (error) {
      console.error(
        "Error in BottleneckDetectorGraphManager.getBottleneckData:",
        error
      );
      throw error;
    }
  }
}
