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
  status: string;
  priority?: string; // Add priority field
  account: string; // Account field for the issue (required)
  children: LiteJiraIssue[];
  childCount: number;
  url: string;
  originalEstimate?: number | null; // in days
  timeSpent?: number | null; // in days
  timeRemaining?: number | null; // in days
  hasChildren?: boolean | null; // true = has children, false = no children, null/undefined = unknown
  timeBookings?: Array<{ date: string; timeSpent: number }>; // Time bookings with dates
  timeBookingsJiraKeys?: string[]; // Array of all Jira keys in the workstream tree
  timeBookingsTotalIssues?: number; // Total number of issues in the workstream tree
  timeDataByKey?: Record<string, Array<{ date: string; timeSpent: number }>>; // Map from Jira key to time data array
};

export class JiraLite {
  key: string;
  summary: string;
  type: string;
  status: string;
  priority?: string; // Add priority field
  account: string; // Account field for the issue (required)
  children: JiraLite[];
  childCount: number;
  url: string;
  hasChildren?: boolean | null;

  constructor(
    key: string,
    summary: string,
    type: string,
    status: string,
    url: string,
    children: JiraLite[] = [],
    account: string,
    hasChildren?: boolean | null,
    priority?: string
  ) {
    this.key = key;
    this.summary = summary;
    this.type = type;
    this.status = status;
    this.priority = priority;
    this.account = account;
    this.children = children;
    this.childCount = children.length;
    this.url = url;
    this.hasChildren = hasChildren;
  }

  static fromLiteJiraIssue(issue: LiteJiraIssue): JiraLite {
    const children = issue.children.map((child) =>
      typeof child === "string"
        ? new JiraLite(child, "", "", "", "", [], "Unknown", undefined, undefined)
        : JiraLite.fromLiteJiraIssue(child)
    );
    return new JiraLite(
      issue.key,
      issue.summary,
      issue.type,
      issue.status,
      issue.url,
      children,
      issue.account,
      issue.hasChildren,
      issue.priority
    );
  }

  toLiteJiraIssue(): LiteJiraIssue {
    return {
      key: this.key,
      summary: this.summary,
      type: this.type,
      status: this.status,
      priority: this.priority,
      account: this.account,
      children: this.children.map((child) => child.toLiteJiraIssue()),
      childCount: this.childCount,
      url: this.url,
      hasChildren: this.hasChildren,
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

  async getTimeTrackingData(
    issueKeys: string[]
  ): Promise<Record<string, Array<{ date: string; timeSpent: number }>>> {
    if (issueKeys.length === 0) {
      return {};
    }

    try {
      console.log(
        `Fetching time tracking data for ${issueKeys.length} issues...`
      );

      // Get issues with changelog enabled to track time changes
      const issuesWithChangelog = await this.requestIssueFromServer(issueKeys);
      console.log(
        `Retrieved ${issuesWithChangelog.issues.length} issues with changelog`
      );

      const timeTrackingData: Record<
        string,
        Array<{ date: string; timeSpent: number }>
      > = {};

      for (const issue of issuesWithChangelog.issues) {
        const issueKey = issue.key;
        const timeEntries: Array<{ date: string; timeSpent: number }> = [];

        if (issue.changelog && issue.changelog.histories) {
          console.log(
            `Processing changelog for ${issueKey} with ${issue.changelog.histories.length} history entries`
          );

          // Process each history entry
          for (const history of issue.changelog.histories) {
            // Look for timespent field changes
            const timeSpentItems = history.items.filter(
              (item) => item.field === "timespent"
            );

            if (timeSpentItems.length > 0) {
              console.log(
                `Found ${timeSpentItems.length} timespent changes for ${issueKey} on ${history.created}`
              );
            }

            for (const item of timeSpentItems) {
              // Calculate time added in this change
              const fromTime = parseInt(item.fromString || "0");
              const toTime = parseInt(item.toString || "0");
              const timeAdded = toTime - fromTime;

              if (timeAdded > 0) {
                // Convert seconds to days (assuming 7.5 hours per day)
                const timeAddedInDays = timeAdded / (3600 * 7.5);
                const date = history.created.split("T")[0]; // YYYY-MM-DD format

                timeEntries.push({
                  date,
                  timeSpent: timeAddedInDays,
                });

                console.log(
                  `Added ${timeAddedInDays.toFixed(2)} days for ${issueKey} on ${date}`
                );
              }
            }
          }
        } else {
          console.log(`No changelog found for ${issueKey}`);
        }

        // Aggregate time entries by date (sum multiple entries on the same date)
        const timeByDate = timeEntries.reduce(
          (acc, entry) => {
            acc[entry.date] = (acc[entry.date] || 0) + entry.timeSpent;
            return acc;
          },
          {} as Record<string, number>
        );

        // Convert to expected format and sort by date
        timeTrackingData[issueKey] = Object.entries(timeByDate)
          .map(([date, timeSpent]) => ({ date, timeSpent }))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (timeTrackingData[issueKey].length > 0) {
          console.log(
            `Total time entries for ${issueKey}: ${timeTrackingData[issueKey].length} dates`
          );
        }
      }

      console.log(
        `Successfully processed time tracking data for ${Object.keys(timeTrackingData).length} issues`
      );
      return timeTrackingData;
    } catch (error) {
      console.error("Error fetching time tracking data:", error);
      throw error;
    }
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
      const url = `${domain}/rest/api/3/search?jql=${query}&fields=key,summary,issuetype,status,priority,customfield_10085`;
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

      // Return issues without children data for faster loading
      return topLevelIssues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        type: issue.fields.issuetype.name || "",
        status: issue.fields.status?.name || "",
        priority: issue.fields.priority?.name || "None",
        account: issue.fields.customfield_10085?.value || "None",
        children: [], // No children data
        childCount: 0, // No child count
        url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
      }));
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

      const allChildren: any[] = [];
      const batchSize = 50; // Process 50 parents at a time

      for (let i = 0; i < parentKeys.length; i += batchSize) {
        const parentBatch = parentKeys.slice(i, i + batchSize);

        const parentConditions = parentBatch
          .map((key) => `parent = "${key}"`)
          .join(" OR ");

        const jql = `(${parentConditions}) ORDER BY created ASC`;
        const fields =
          "key,summary,issuetype,parent,status,priority,timeoriginalestimate,timespent,timeestimate,customfield_10085";
        const queryWithFields = `${jql}&fields=${fields}`;

        console.log(
          `Fetching children for batch of ${parentBatch.length} parent issues (total ${parentKeys.length})`
        );

        const response = await this.requestDataFromServer(queryWithFields);

        const children = response.issues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary || "",
          type: issue.fields.issuetype.name || "",
          status: issue.fields.status?.name || "",
          priority: issue.fields.priority?.name || "None",
          account: issue.fields.customfield_10085?.value || "None",
          parentKey: issue.fields.parent?.key || "",
          url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
          originalEstimate: issue.fields.timeoriginalestimate
            ? issue.fields.timeoriginalestimate / 3600 / 7.5
            : null,
          timeSpent: issue.fields.timespent
            ? issue.fields.timespent / 3600 / 7.5
            : null,
          timeRemaining: issue.fields.timeestimate
            ? issue.fields.timeestimate / 3600 / 7.5
            : null,
        }));

        allChildren.push(...children);
      }

      return allChildren;
    } catch (error) {
      console.error(`Error fetching children for issues:`, error);
      throw error;
    }
  }

  async getChildrenForIssue(parentKey: string): Promise<LiteJiraIssue[]> {
    try {
      const domain = process.env.JIRA_DOMAIN;
      // Query for issues where the parent field matches the parentKey
      const jql = `parent = "${parentKey}" ORDER BY created ASC`;
      const url = `${domain}/rest/api/3/search?jql=${jql}&fields=key,summary,issuetype,status,priority,timeoriginalestimate,timespent,timeestimate,customfield_10085`;

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
        status: issue.fields.status?.name || "",
        priority: issue.fields.priority?.name || "None",
        account: issue.fields.customfield_10085?.value || "None",
        children: [], // Children don't have nested children in this implementation
        childCount: 0,
        url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
        originalEstimate: issue.fields.timeoriginalestimate
          ? issue.fields.timeoriginalestimate / 3600 / 7.5
          : null,
        timeSpent: issue.fields.timespent
          ? issue.fields.timespent / 3600 / 7.5
          : null,
        timeRemaining: issue.fields.timeestimate
          ? issue.fields.timeestimate / 3600 / 7.5
          : null,
      }));
    } catch (error) {
      console.error(`Error fetching children for issue ${parentKey}:`, error);
      return [];
    }
  }
}
