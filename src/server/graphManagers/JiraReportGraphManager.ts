import JiraRequester from "../JiraRequester";

export interface JiraProject {
  id: string;
  key: string;
  name: string;
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
}
