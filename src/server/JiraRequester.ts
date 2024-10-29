import Jira from './Jira';
export default class JiraRequester {
  jiraMap: Map<string, any>;
  queryMap: Map<string, any>;
  constructor() {
    this.jiraMap = new Map();
    this.queryMap = new Map();
  }

  async getJira(issueKey: string): Promise<Jira> {
    if (this.jiraMap.has(issueKey)) {
      return this.jiraMap.get(issueKey);
    }
    
    let jiraJSON = await this.requestIssueFromServer(issueKey);
    let jira = new Jira(jiraJSON);
    this.jiraMap.set(issueKey, jira);
    return jira;
  }

  async requestIssueFromServer(issueKey: string) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/issue/${issueKey}?expand=changelog`;
    return this.requestJiraDataFromServer(url);
  }


  async getQuery(query: string): Promise<Jira[]> {
    if (this.queryMap.has(query)) {
      return this.queryMap.get(query);
    }
    let jiraJSON = await this.requestQueryFromServer(query);
    this.queryMap.set(query, jiraJSON);

    let jiras = jiraJSON.issues.map((jira: any) => new Jira(jira));
    return jiras;
  }

  async requestQueryFromServer(query: string) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/search?jql=${query}&expand=changelog`;
    return this.requestJiraDataFromServer(url);
  }

  async requestJiraDataFromServer(url: string) {
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
