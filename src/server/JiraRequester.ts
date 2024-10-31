import Jira from './Jira';
export default class JiraRequester {
  jiraMap: Map<string, any>;
  constructor() {
    this.jiraMap = new Map();
  }

  async getJiras(issueKey: string[]): Promise<Jira[]> {
    let uncachedKeys: string[] = [];
    issueKey.forEach((key) => {
      if (!this.jiraMap.has(key)) {
        uncachedKeys.push(key);
      }
    });

    let jiraJSON = await this.requestIssueFromServer(uncachedKeys);
    jiraJSON.issues.forEach((jira: any) => {
      this.jiraMap.set(jira.key, new Jira(jira));
    });
    return issueKey.map((key) => {
      return this.jiraMap.get(key);
    });
  }

  async requestIssueFromServer(issueKeys: string[]) {
    if (issueKeys.length === 0) {
      return { issues: [] };
    }
    const domain = process.env.JIRA_DOMAIN;
    let jql = issueKeys.map((key) => `key=${key}`).join(' OR ');
    const query = `${jql}&expand=changelog`;
    let data = await this.requestDataFromServer(query);
    return data;
  }

  async getQuery(query: string): Promise<Jira[]> {
    let jiraKeys = await this.requestQueryFromServer(query);
    let jiras = await this.getJiras(jiraKeys);
    return jiras;
  }

  async requestQueryFromServer(query: string) {
    const url = `${query}&fields=key`;
    let data = await this.requestDataFromServer(url).catch((error) => {
      throw error;
    });
    return data.issues.map((jira: any) => jira.key);
  }

  async requestDataFromServer(query: string) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/search?jql=${query}`;
    let response = await this.fetchRequest(url);
    if (response.total > 5000) {
      throw new Error('Query returned too many results');
    }
    if (response.total > 50) {
      console.log('Fetching more data');
      let startAt = 50;
      while (startAt < response.total) {
        let nextResponse = await this.fetchRequest(
          `${url}&startAt=${startAt}`
        );
        response.issues = response.issues.concat(nextResponse.issues);
        startAt += 50;
      }
    }
    return response;
  }

  async fetchRequest(url: string) {
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
      throw new Error(
        'Failed to fetch  data: ' + url + ' ' + response.statusText
      );
    }
    return response.json();
  }
}
