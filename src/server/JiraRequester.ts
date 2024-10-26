import Jira from './Jira';
export default class JiraRequester {
  jiraMap: Map<string, any>;
  constructor() {
    this.jiraMap = new Map();
  }

  async getJira(issueKey: string): Promise<Jira> {
    if (this.jiraMap.has(issueKey)) {
      return this.jiraMap.get(issueKey);
    }
    
    let jiraJSON = await this.requestJiraDataFromServer(issueKey);
    let jira = new Jira(jiraJSON);
    this.jiraMap.set(issueKey, jira);
    return jira;
  }
  async requestJiraDataFromServer(issueKey: string) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/issue/${issueKey}?expand=changelog`;
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const response = await fetch(url, {
      method: 'GET', // or 'POST', 'PUT', etc. depending on your request
      headers: {
        Authorization: 'Basic ' + btoa(`${email}:${apiToken}`),
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch  data');
    }
    return response.json();
  }
}
