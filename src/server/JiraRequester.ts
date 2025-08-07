import Jira from "./Jira";

export type lastUpdatedKey = {
  key: string;
  updated?: string;
};

export type EssentialJiraData = {
  key: string;
  fields: {
    fixVersions: { name: string }[];
    summary: string;
    resolutiondate: string;
  };
}[];

export type LiteJiraIssue = {
  key: string;
  summary: string;
  type: string;
  children: LiteJiraIssue[];
  childCount: number;
};

export class JiraLite {
  key: string;
  summary: string;
  type: string;
  children: JiraLite[];
  childCount: number;

  constructor(
    key: string,
    summary: string,
    type: string,
    children: JiraLite[] = []
  ) {
    this.key = key;
    this.summary = summary;
    this.type = type;
    this.children = children;
    this.childCount = children.length;
  }

  static fromLiteJiraIssue(issue: LiteJiraIssue): JiraLite {
    const children = issue.children.map((child) =>
      typeof child === "string"
        ? new JiraLite(child, "", "", [])
        : JiraLite.fromLiteJiraIssue(child)
    );
    return new JiraLite(issue.key, issue.summary, issue.type, children);
  }

  toLiteJiraIssue(): LiteJiraIssue {
    return {
      key: this.key,
      summary: this.summary,
      type: this.type,
      children: this.children.map((child) => child.toLiteJiraIssue()),
      childCount: this.childCount,
    };
  }
}

export default class JiraRequester {
  jiraMap: Map<string, Jira>;
  constructor() {
    this.jiraMap = new Map();
  }

  async getAdditionalHistory(key: string) {
    let values: any[] = [];
    while (true) {
      let changelog = await this.requestChangelogFromServer(key, values.length);
      values = values.concat(changelog.values);
      if (changelog.values.length !== 100) {
        break;
      }
    }
    return values;
  }

  async getFullJiraDataFromKeys(
    lastUpdatedKeys: lastUpdatedKey[]
  ): Promise<Jira[]> {
    let uncachedKeys: string[] = [];
    lastUpdatedKeys.forEach((issueRequest) => {
      if (this.jiraMap.has(issueRequest.key)) {
        let lastUpdated = this.jiraMap.get(issueRequest.key)?.fields.updated;
        if (issueRequest.updated && issueRequest.updated !== lastUpdated) {
          uncachedKeys.push(issueRequest.key);
        }
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
      let histories = jira.changelog?.histories;
      if (histories) {
        if (histories.length === 100) {
          let historyValues = await this.getAdditionalHistory(jira.key);
          jira.changelog.histories = historyValues;
        }
      }

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

  async getEssentialJiraDataFromKeys(
    keys: string[]
  ): Promise<EssentialJiraData> {
    if (keys.length === 0) {
      return [];
    }
    const fields = ["key", "summary", "resolutiondate", "fixVersions"];
    return await this.getBatchedJiraData(keys, fields);
  }

  async getBatchedJiraData(keys: string[], fields: string[]): Promise<any[]> {
    if (keys.length === 0) {
      return [];
    }

    let allIssues: any[] = [];
    for (let i = 0; i < keys.length; i += 50) {
      let batchKeys = keys.slice(i, i + 50);
      let jql = batchKeys.map((key) => `key=${key}`).join(" OR ");
      const fieldsString = fields.join(",");
      const query = `${jql}&fields=${fieldsString}`;
      let data = await this.requestDataFromServer(query);
      allIssues = allIssues.concat(data.issues);
    }
    return allIssues;
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
      let epicLabels = epicjira.getLabels(); // Fetch Epic labels
      if (initiativeKey !== null && initiativeName !== null) {
        jira.fields.initiativeKey = initiativeKey;
        jira.fields.initiativeName = initiativeName;
      }
      jira.fields.epicLabels = epicLabels; // Add Epic labels to the Jira fields
    }

    return jira;
  }

  async requestChangelogFromServer(key: string, startAt = 0) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/issue/${key}/changelog?startAt=${startAt}`;
    let response = await this.fetchRequest(url);
    return response;
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
    console.log(`Fetching data for ${url}`);
    let response = await this.fetchRequest(url);
    if (response.total > 5000) {
      throw new Error("Query returned too many results");
    }
    if (response.total > 50) {
      let startAt = 50;
      while (startAt < response.total) {
        console.log(
          `Fetching for next 50 issues of ${response.total}, startAt: ${startAt}`
        );
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

  async getReleasesFromProject(projectKey: string, count: number = 10) {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/project/${projectKey}/versions`;
    let response = await this.fetchRequest(url);
    let releasedReleases = response.filter((release) => release.released);
    return releasedReleases.slice(-count);
  }

  async getProjects() {
    const domain = process.env.JIRA_DOMAIN;
    const url = `${domain}/rest/api/3/project/search`;
    console.log(`Fetching projects from ${url}`);

    let response = await this.fetchRequest(url);

    // Handle pagination if there are more than 50 projects
    if (response.total > 50) {
      let startAt = 50;
      while (startAt < response.total) {
        console.log(
          `Fetching next 50 projects of ${response.total}, startAt: ${startAt}`
        );
        let nextResponse = await this.fetchRequest(`${url}?startAt=${startAt}`);
        response.values = response.values.concat(nextResponse.values);
        startAt += 50;
      }
    }

    // Return simplified project data with just the fields we need
    return response.values.map((project: any) => ({
      id: project.id,
      key: project.key,
      name: project.name,
    }));
  }

  async getLiteQuery(query: string): Promise<LiteJiraIssue[]> {
    try {
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/search?jql=${query}&fields=key,summary,issuetype`;
      console.log(`Fetching lite data for ${url}`);

      let response = await this.fetchRequest(url);

      // Handle pagination if there are more than 50 issues
      if (response.total > 50) {
        let startAt = 50;
        while (startAt < response.total) {
          console.log(
            `Fetching next 50 issues of ${response.total}, startAt: ${startAt}`
          );
          let nextResponse = await this.fetchRequest(
            `${url}&startAt=${startAt}`
          );
          response.issues = response.issues.concat(nextResponse.issues);
          startAt += 50;
        }
      }

      // Get the top-level issues (those that are not children of other issues)
      const topLevelIssues = response.issues.filter((issue: any) => {
        // Filter out subtasks and issues that have parents
        return (
          issue.fields.issuetype.name !== "Sub-task" && !issue.fields.parent
        );
      });

      // Get all children for all top-level issues in a single request
      const topLevelKeys = topLevelIssues.map((issue: any) => issue.key);
      const allChildren = await this.getAllChildrenForIssues(topLevelKeys);

      // Allocate children to their correct parents
      const issuesWithChildren = topLevelIssues.map((issue: any) => {
        const children = allChildren
          .filter((child: any) => child.parentKey === issue.key)
          .map((child: any) => ({
            key: child.key,
            summary: child.summary,
            type: child.type,
            children: [], // Children don't have nested children in this implementation
            childCount: 0,
          }));

        return {
          key: issue.key,
          summary: issue.fields.summary || "",
          type: issue.fields.issuetype.name || "",
          children: children,
          childCount: children.length,
        };
      });

      return issuesWithChildren;
    } catch (error) {
      console.error("Error in getLiteQuery:", error);
      throw error;
    }
  }

  async getAllChildrenForIssues(parentKeys: string[]): Promise<any[]> {
    try {
      if (parentKeys.length === 0) {
        return [];
      }

      const domain = process.env.JIRA_DOMAIN;
      // Create a single JQL query to get all children for all parent keys
      const parentConditions = parentKeys
        .map((key) => `parent = "${key}"`)
        .join(" OR ");
      const jql = `(${parentConditions}) ORDER BY created ASC`;
      const url = `${domain}/rest/api/3/search?jql=${jql}&fields=key,summary,issuetype,parent`;

      console.log(
        `Fetching all children for ${parentKeys.length} parent issues`
      );

      let response = await this.fetchRequest(url);

      // Handle pagination if there are more than 50 children
      if (response.total > 50) {
        let startAt = 50;
        while (startAt < response.total) {
          console.log(
            `Fetching next 50 children of ${response.total}, startAt: ${startAt}`
          );
          let nextResponse = await this.fetchRequest(
            `${url}&startAt=${startAt}`
          );
          response.issues = response.issues.concat(nextResponse.issues);
          startAt += 50;
        }
      }

      // Transform children and include parent key for allocation
      return response.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        type: issue.fields.issuetype.name || "",
        parentKey: issue.fields.parent?.key || "",
      }));
    } catch (error) {
      console.error(`Error fetching children for issues:`, error);
      return [];
    }
  }

  async getChildrenForIssue(parentKey: string): Promise<LiteJiraIssue[]> {
    try {
      const domain = process.env.JIRA_DOMAIN;
      // Query for issues where the parent field matches the parentKey
      const jql = `parent = "${parentKey}" ORDER BY created ASC`;
      const url = `${domain}/rest/api/3/search?jql=${jql}&fields=key,summary,issuetype`;

      let response = await this.fetchRequest(url);

      // Handle pagination if there are more than 50 children
      if (response.total > 50) {
        let startAt = 50;
        while (startAt < response.total) {
          console.log(
            `Fetching next 50 children of ${response.total}, startAt: ${startAt}`
          );
          let nextResponse = await this.fetchRequest(
            `${url}&startAt=${startAt}`
          );
          response.issues = response.issues.concat(nextResponse.issues);
          startAt += 50;
        }
      }

      // Transform children to LiteJiraIssue format (children don't have their own children in this context)
      return response.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        type: issue.fields.issuetype.name || "",
        children: [], // Children don't have nested children in this implementation
        childCount: 0,
      }));
    } catch (error) {
      console.error(`Error fetching children for issue ${parentKey}:`, error);
      return [];
    }
  }
}
