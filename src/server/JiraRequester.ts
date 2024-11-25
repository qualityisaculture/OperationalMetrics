import Jira from "./Jira";
export type lastUpdatedKey = {
  key: string;
  updated?: string;
};
export default class JiraRequester {
  jiraMap: Map<string, Jira>;
  constructor() {
    this.jiraMap = new Map();
  }

  async getFullJiraDataFromKeys(
    lastUpdatedKeys: lastUpdatedKey[]
  ): Promise<Jira[]> {
    let uncachedKeys: string[] = [];
    lastUpdatedKeys.forEach((issueRequest) => {
      if (
        this.jiraMap.has(issueRequest.key) &&
        this.jiraMap.get(issueRequest.key)?.fields.updated ===
          issueRequest.updated
      ) {
        //do nothing
      } else {
        uncachedKeys.push(issueRequest.key);
      }
    });

    let jiraJSON = await this.requestIssueFromServer(uncachedKeys).catch(
      (error) => {
        throw error;
      }
    );
    for (let jira of jiraJSON.issues) {
      this.jiraMap.set(
        jira.key,
        await this.getJiraWithInitiative(jira).catch((error) => {
          throw error;
        })
      );
    }
    return lastUpdatedKeys
      .map((issueRequest) => {
        return this.jiraMap.get(issueRequest.key);
      })
      .filter((jira): jira is Jira => jira !== undefined);
  }

  async getJiraWithInitiative(json: any) {
    let jira = new Jira(json);
    let epicKey = jira.getEpicKey();

    let parentKey = jira.getParentKey();
    if (parentKey) {
      let parents = await this.getFullJiraDataFromKeys([{ key: parentKey }]);
      let parentjira = parents[0];
      epicKey = parentjira.getEpicKey();
    }

    if (epicKey) {
      let epics = await this.getFullJiraDataFromKeys([{ key: epicKey }]);
      let epicjira = epics[0];
      let initiativeKey = epicjira.getInitiativeKey();
      let initiativeName = epicjira.getInitiativeName();
      if (initiativeKey !== null && initiativeName !== null) {
        jira.fields.initiativeKey = initiativeKey;
        jira.fields.initiativeName = initiativeName;
      }
    }

    return jira;
  }

  async requestIssueFromServer(issueKeys: string[]) {
    if (issueKeys.length === 0) {
      return { issues: [] };
    }
    let allIssues: { issues: any[] } = { issues: [] };
    for (let i = 0; i < issueKeys.length; i += 50) {
      let keys = issueKeys.slice(i, i + 50);
      let jql = keys.map((key) => `key=${key}`).join(" OR ");
      const query = `${jql}&expand=changelog`;
      let data = await this.requestDataFromServer(query);
      console.log("Fetched " + data.issues.length + " issues");
      allIssues.issues = allIssues.issues.concat(data.issues);
    }
    return allIssues;
  }

  async getQuery(query: string): Promise<Jira[]> {
    let lastUpdatedKeys = await this.getJiraKeysInQuery(query);
    let jiras = await this.getFullJiraDataFromKeys(lastUpdatedKeys);
    return jiras;
  }

  async getJiraKeysInQuery(query: string): Promise<lastUpdatedKey[]> {
    const url = `${query}&fields=key,updated`;
    let data = await this.requestDataFromServer(url).catch((error) => {
      throw error;
    });
    return data.issues.map((jira: any) => {
      return { key: jira.key, updated: jira.fields.updated };
    });
  }

  async requestDataFromServer(query: string) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/search?jql=${query}`;
    console.log("Fetching " + url);
    let response = await this.fetchRequest(url);
    if (response.total > 5000) {
      throw new Error("Query returned too many results");
    }
    if (response.total > 50) {
      let startAt = 50;
      while (startAt < response.total) {
        console.log("Fetching " + startAt + " of " + response.total);
        let nextResponse = await this.fetchRequest(`${url}&startAt=${startAt}`);
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
      method: "GET", // or 'POST', 'PUT', etc. depending on your request
      headers: {
        Authorization: "Basic " + btoa(`${email}:${apiToken}`),
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(
        "Failed to fetch  data: " + url + " " + response.statusText
      );
    }
    return response.json();
  }
}
