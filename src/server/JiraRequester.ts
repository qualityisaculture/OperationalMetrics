import Jira from "./Jira";
import { JiraIssuesResponse } from "./JiraAPITypes";

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
  baselineEstimate?: number | null; // in days - customfield_11753
  originalEstimate?: number | null; // in days
  timeSpent?: number | null; // in days
  timeRemaining?: number | null; // in days
  dueDate: string | null; // Due date field (always present)
  epicStartDate: string | null; // Epic Start Date (fallback) - always present
  epicEndDate: string | null; // Epic End Date (fallback) - always present
  hasChildren?: boolean | null; // true = has children, false = no children, null/undefined = unknown
  timeBookings?: Array<{ date: string; timeSpent: number }>; // Time bookings with dates
  timeBookingsJiraKeys?: string[]; // Array of all Jira keys in the workstream tree
  timeBookingsTotalIssues?: number; // Total number of issues in the workstream tree
  timeDataByKey?: Record<string, Array<{ date: string; timeSpent: number }>>; // Map from Jira key to time data array
  links?: Array<{
    type: string;
    linkedIssueKey: string;
    direction: "inward" | "outward";
  }>; // Issue links
  parent?: LiteJiraIssue | null; // Parent issue in the hierarchy
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
  baselineEstimate?: number | null; // in days - customfield_11753
  dueDate: string | null; // Due date field (always present)
  epicStartDate: string | null; // Epic Start Date (fallback) - always present
  epicEndDate: string | null; // Epic End Date (fallback) - always present
  hasChildren?: boolean | null;
  links?: Array<{
    type: string;
    linkedIssueKey: string;
    direction: "inward" | "outward";
  }>; // Issue links
  parent?: JiraLite | null; // Parent issue in the hierarchy

  constructor(
    key: string,
    summary: string,
    type: string,
    status: string,
    url: string,
    children: JiraLite[] = [],
    account: string,
    hasChildren?: boolean | null,
    priority?: string,
    baselineEstimate?: number | null,
    dueDate: string | null = null,
    epicStartDate: string | null = null,
    epicEndDate: string | null = null,
    links?: Array<{
      type: string;
      linkedIssueKey: string;
      direction: "inward" | "outward";
    }>,
    parent?: JiraLite | null
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
    this.baselineEstimate = baselineEstimate;
    this.dueDate = dueDate;
    this.epicStartDate = epicStartDate;
    this.epicEndDate = epicEndDate;
    this.links = links;
    this.parent = parent;
  }

  static fromLiteJiraIssue(issue: LiteJiraIssue): JiraLite {
    const children = issue.children.map((child) =>
      typeof child === "string"
        ? new JiraLite(
            child,
            "",
            "",
            "",
            "",
            [],
            "Unknown",
            undefined,
            undefined,
            undefined,
            null,
            null,
            null,
            undefined,
            null
          )
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
      issue.priority,
      issue.baselineEstimate,
      issue.dueDate,
      issue.epicStartDate,
      issue.epicEndDate,
      issue.links,
      issue.parent ? JiraLite.fromLiteJiraIssue(issue.parent) : null
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
      baselineEstimate: this.baselineEstimate,
      dueDate: this.dueDate,
      epicStartDate: this.epicStartDate,
      epicEndDate: this.epicEndDate,
      hasChildren: this.hasChildren,
      links: this.links,
      parent: this.parent ? this.parent.toLiteJiraIssue() : null,
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

    let jiraJSON: JiraIssuesResponse = (await this.requestIssueFromServer(
      uncachedKeys
    ).catch((error) => {
      throw error;
    })) as JiraIssuesResponse;
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
      const query = `${jql}&expand=changelog&fields=issuetype,components,created,customfield_10085,customfield_10022,fixVersions,customfield_10023,priority,resolution,customfield_11753,labels,duedate,updated,status,resolutiondate,summary,timespent,timeoriginalestimate,timeestimate`;
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
    const url = `${domain}/rest/api/3/search/jql?jql=${query}`;
    console.log(`Fetching data for ${url}`);

    let response = await this.fetchRequest(url);
    let allIssues = response.issues;
    let nextPageToken = response.nextPageToken;
    let isLast = response.isLast;

    // Keep fetching pages while there is a next page token
    while (!isLast) {
      let nextResponse = await this.fetchRequest(
        `${url}&nextPageToken=${nextPageToken}`
      );
      allIssues = allIssues.concat(nextResponse.issues);
      nextPageToken = nextResponse.nextPageToken;
      isLast = nextResponse.isLast;
    }

    // Update the response object with all collected issues
    response.issues = allIssues;
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
      url: `${domain}/browse/${project.key}`,
    }));
  }

  async getLiteQuery(query: string): Promise<LiteJiraIssue[]> {
    try {
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/search/jql?jql=${query}&fields=key,summary,issuetype,status,priority,customfield_10085,customfield_11753,duedate,customfield_10022,customfield_10023,timeoriginalestimate,timespent,timeestimate`;
      console.log(`Fetching lite data for ${url}`);

      let response = await this.fetchRequest(url);
      let allIssues = response.issues;
      let nextPageToken = response.nextPageToken;
      let isLast = response.isLast;

      // Keep fetching pages while there is a next page token
      while (!isLast) {
        let nextResponse = await this.fetchRequest(
          `${url}&nextPageToken=${nextPageToken}`
        );
        allIssues = allIssues.concat(nextResponse.issues);
        nextPageToken = nextResponse.nextPageToken;
        isLast = nextResponse.isLast;
      }

      // Get the top-level issues (those that are not children of other issues)
      const topLevelIssues = allIssues.filter((issue: any) => {
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
        baselineEstimate: issue.fields.customfield_11753
          ? issue.fields.customfield_11753
          : null,
        originalEstimate: issue.fields.timeoriginalestimate
          ? issue.fields.timeoriginalestimate / 3600 / 7.5
          : null,
        timeSpent: issue.fields.timespent
          ? issue.fields.timespent / 3600 / 7.5
          : null,
        timeRemaining: issue.fields.timeestimate
          ? issue.fields.timeestimate / 3600 / 7.5
          : null,
        dueDate: issue.fields.duedate || null, // Always include dueDate field
        epicStartDate: issue.fields.customfield_10022 || null, // Epic Start Date (fallback)
        epicEndDate: issue.fields.customfield_10023 || null, // Epic End Date (fallback)
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
          "key,summary,issuetype,parent,status,priority,timeoriginalestimate,timespent,timeestimate,customfield_10085,customfield_11753,duedate,customfield_10022,customfield_10023,issuelinks";
        const queryWithFields = `${jql}&fields=${fields}`;

        console.log(
          `Fetching children for batch of ${parentBatch.length} parent issues (total ${parentKeys.length})`
        );

        const response = await this.requestDataFromServer(queryWithFields);

        const children = response.issues.map((issue: any) => {
          // Process issue links
          const links: Array<{
            type: string;
            linkedIssueKey: string;
            direction: "inward" | "outward";
          }> = [];

          if (issue.fields.issuelinks) {
            for (const link of issue.fields.issuelinks) {
              // Handle both inward and outward links
              if (link.inwardIssue) {
                links.push({
                  type: link.type.name,
                  linkedIssueKey: link.inwardIssue.key,
                  direction: "inward",
                });
              }
              if (link.outwardIssue) {
                links.push({
                  type: link.type.name,
                  linkedIssueKey: link.outwardIssue.key,
                  direction: "outward",
                });
              }
            }
          }

          return {
            key: issue.key,
            summary: issue.fields.summary || "",
            type: issue.fields.issuetype.name || "",
            status: issue.fields.status?.name || "",
            priority: issue.fields.priority?.name || "None",
            account: issue.fields.customfield_10085?.value || "None",
            parentKey: issue.fields.parent?.key || "",
            url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
            baselineEstimate: issue.fields.customfield_11753
              ? issue.fields.customfield_11753
              : null,
            originalEstimate: issue.fields.timeoriginalestimate
              ? issue.fields.timeoriginalestimate / 3600 / 7.5
              : null,
            timeSpent: issue.fields.timespent
              ? issue.fields.timespent / 3600 / 7.5
              : null,
            timeRemaining: issue.fields.timeestimate
              ? issue.fields.timeestimate / 3600 / 7.5
              : null,
            dueDate: issue.fields.duedate || null, // Always include dueDate field
            epicStartDate: issue.fields.customfield_10022 || null, // Epic Start Date (fallback)
            epicEndDate: issue.fields.customfield_10023 || null, // Epic End Date (fallback)
            links: links, // Add links to the issue data
          };
        });

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
      const fields =
        "key,summary,issuetype,status,priority,timeoriginalestimate,timespent,timeestimate,customfield_10085,customfield_11753,duedate,customfield_10022,customfield_10023";
      const url = `${domain}/rest/api/3/search/jql?jql=${jql}&fields=${fields}`;

      let response = await this.fetchRequest(url);
      let allIssues = response.issues;
      let nextPageToken = response.nextPageToken;
      let isLast = response.isLast;

      // Keep fetching pages while there is a next page token
      while (!isLast) {
        let nextResponse = await this.fetchRequest(
          `${url}&nextPageToken=${nextPageToken}`
        );
        allIssues = allIssues.concat(nextResponse.issues);
        nextPageToken = nextResponse.nextPageToken;
        isLast = nextResponse.isLast;
      }

      // Transform children to LiteJiraIssue format (children don't have their own children in this context)
      return allIssues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary || "",
        type: issue.fields.issuetype.name || "",
        status: issue.fields.status?.name || "",
        priority: issue.fields.priority?.name || "None",
        account: issue.fields.customfield_10085?.value || "None",
        children: [], // Children don't have nested children in this implementation
        childCount: 0,
        url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
        baselineEstimate: issue.fields.customfield_11753
          ? issue.fields.customfield_11753
          : null,
        originalEstimate: issue.fields.timeoriginalestimate
          ? issue.fields.timeoriginalestimate / 3600 / 7.5
          : null,
        timeSpent: issue.fields.timespent
          ? issue.fields.timespent / 3600 / 7.5
          : null,
        timeRemaining: issue.fields.timeestimate
          ? issue.fields.timeestimate / 3600 / 7.5
          : null,
        dueDate: issue.fields.duedate || null, // Always include dueDate field
        epicStartDate: issue.fields.customfield_10022 || null, // Epic Start Date (fallback)
        epicEndDate: issue.fields.customfield_10023 || null, // Epic End Date (fallback)
      }));
    } catch (error) {
      console.error(`Error fetching children for issue ${parentKey}:`, error);
      return [];
    }
  }

  // New method to fetch issue links for a given issue
  async getIssueLinks(issueKey: string): Promise<
    Array<{
      type: string;
      inwardIssue: string;
      outwardIssue: string;
      direction: "inward" | "outward";
    }>
  > {
    try {
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/issue/${issueKey}?fields=issuelinks`;

      const response = await this.fetchRequest(url);
      const issueLinks = response.fields.issuelinks || [];

      const links: Array<{
        type: string;
        inwardIssue: string;
        outwardIssue: string;
        direction: "inward" | "outward";
      }> = [];

      for (const link of issueLinks) {
        // Handle both inward and outward links
        if (link.inwardIssue) {
          links.push({
            type: link.type.name,
            inwardIssue: link.inwardIssue.key,
            outwardIssue: issueKey,
            direction: "inward",
          });
        }
        if (link.outwardIssue) {
          links.push({
            type: link.type.name,
            inwardIssue: issueKey,
            outwardIssue: link.outwardIssue.key,
            direction: "outward",
          });
        }
      }

      return links;
    } catch (error) {
      console.error(`Error fetching links for issue ${issueKey}:`, error);
      return [];
    }
  }

  // New method to get parent information for an issue
  async getIssueParent(issueKey: string): Promise<{
    parentKey: string | null;
    parentSummary: string | null;
  }> {
    try {
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/issue/${issueKey}?fields=parent`;

      const response = await this.fetchRequest(url);
      const parent = response.fields?.parent || null;

      if (parent) {
        return {
          parentKey: parent.key,
          parentSummary: parent.fields.summary,
        };
      }

      return {
        parentKey: null,
        parentSummary: null,
      };
    } catch (error) {
      console.error(`Error fetching parent for issue ${issueKey}:`, error);
      return {
        parentKey: null,
        parentSummary: null,
      };
    }
  }

  // Method to get individual issues by their keys
  async getIssuesByKeys(issueKeys: string[]): Promise<LiteJiraIssue[]> {
    try {
      if (issueKeys.length === 0) {
        return [];
      }

      const allIssues: LiteJiraIssue[] = [];
      const batchSize = 50; // Process 50 issues at a time

      for (let i = 0; i < issueKeys.length; i += batchSize) {
        const batchKeys = issueKeys.slice(i, i + batchSize);

        const keyConditions = batchKeys
          .map((key) => `key = "${key}"`)
          .join(" OR ");

        const jql = `(${keyConditions}) ORDER BY created ASC`;
        const fields =
          "key,summary,issuetype,parent,status,priority,timeoriginalestimate,timespent,timeestimate,customfield_10085,customfield_11753,duedate,customfield_10022,customfield_10023,issuelinks";
        const queryWithFields = `${jql}&fields=${fields}`;

        console.log(
          `Fetching ${batchKeys.length} issues by keys (batch ${Math.floor(i / batchSize) + 1})`
        );

        const response = await this.requestDataFromServer(queryWithFields);

        const issues = response.issues.map((issue: any) => {
          // Process issue links
          const links: Array<{
            type: string;
            linkedIssueKey: string;
            direction: "inward" | "outward";
          }> = [];

          if (issue.fields.issuelinks) {
            for (const link of issue.fields.issuelinks) {
              // Handle both inward and outward links
              if (link.inwardIssue) {
                links.push({
                  type: link.type.name,
                  linkedIssueKey: link.inwardIssue.key,
                  direction: "inward",
                });
              }
              if (link.outwardIssue) {
                links.push({
                  type: link.type.name,
                  linkedIssueKey: link.outwardIssue.key,
                  direction: "outward",
                });
              }
            }
          }

          return {
            key: issue.key,
            summary: issue.fields.summary || "",
            type: issue.fields.issuetype.name || "",
            status: issue.fields.status?.name || "",
            priority: issue.fields.priority?.name || "None",
            account: issue.fields.customfield_10085?.value || "None",
            children: [], // We don't fetch children here
            childCount: 0,
            url: `${process.env.JIRA_DOMAIN}/browse/${issue.key}`,
            baselineEstimate: issue.fields.customfield_11753
              ? issue.fields.customfield_11753
              : null,
            originalEstimate: issue.fields.timeoriginalestimate
              ? issue.fields.timeoriginalestimate / 3600 / 7.5
              : null,
            timeSpent: issue.fields.timespent
              ? issue.fields.timespent / 3600 / 7.5
              : null,
            timeRemaining: issue.fields.timeestimate
              ? issue.fields.timeestimate / 3600 / 7.5
              : null,
            dueDate: issue.fields.duedate || null,
            epicStartDate: issue.fields.customfield_10022 || null,
            epicEndDate: issue.fields.customfield_10023 || null,
            links: links,
            parent: null, // Will be set later when building the tree
          };
        });

        allIssues.push(...issues);
      }

      return allIssues;
    } catch (error) {
      console.error(`Error fetching issues by keys:`, error);
      throw error;
    }
  }

  // New method to get all parents for a list of issues (breadth-first, batched)
  async getAllParentsForIssues(
    issueKeys: string[]
  ): Promise<Map<string, LiteJiraIssue>> {
    try {
      if (issueKeys.length === 0) {
        return new Map();
      }

      const allParents = new Map<string, LiteJiraIssue>();
      const issuesToProcess = new Set(issueKeys);
      const processedIssues = new Set<string>();
      let levelNumber = 0;

      console.log(
        `Starting recursive parent fetching for ${issueKeys.length} issues`
      );

      while (issuesToProcess.size > 0) {
        levelNumber++;
        const currentLevelKeys = Array.from(issuesToProcess);
        issuesToProcess.clear();

        console.log(
          `Level ${levelNumber}: Processing ${currentLevelKeys.length} issues for parents`
        );

        // Batch fetch parent information for all issues at this level
        const parentData = await this.getBatchedParentData(currentLevelKeys);

        for (const issueData of parentData) {
          if (
            issueData.parentKey &&
            !processedIssues.has(issueData.parentKey)
          ) {
            // Add the parent to the map
            allParents.set(issueData.parentKey, {
              key: issueData.parentKey,
              summary:
                issueData.parentSummary || `Issue ${issueData.parentKey}`,
              type: "Parent", // We don't know the type without fetching
              status: "Unknown",
              account: "Unknown",
              children: [],
              childCount: 0,
              url: `${process.env.JIRA_DOMAIN}/browse/${issueData.parentKey}`,
              originalEstimate: null,
              timeSpent: null,
              timeRemaining: null,
              dueDate: null,
              epicStartDate: null,
              epicEndDate: null,
              parent: null,
            });

            // Add to next level for further parent fetching
            issuesToProcess.add(issueData.parentKey);
          }

          processedIssues.add(issueData.issueKey);
        }

        // Safety check to prevent infinite loops
        if (levelNumber > 10) {
          console.warn(
            `Reached maximum parent level depth (10), stopping to prgetParentKeysForIssuesevent infinite loop`
          );
          break;
        }
      }

      console.log(
        `Completed parent fetching: found ${allParents.size} total parents across ${levelNumber} levels`
      );
      return allParents;
    } catch (error) {
      console.error(`Error fetching parents for issues:`, error);
      throw error;
    }
  }

  // Helper method to batch fetch parent data
  private async getBatchedParentData(issueKeys: string[]): Promise<
    Array<{
      issueKey: string;
      parentKey: string | null;
      parentSummary: string | null;
    }>
  > {
    const results: Array<{
      issueKey: string;
      parentKey: string | null;
      parentSummary: string | null;
    }> = [];

    // Process in batches of 50
    for (let i = 0; i < issueKeys.length; i += 50) {
      const batchKeys = issueKeys.slice(i, i + 50);

      // Create JQL query for this batch
      const jql = batchKeys.map((key) => `key = "${key}"`).join(" OR ");
      const fields = "key,parent";
      const query = `${jql}&fields=${fields}`;

      try {
        const response = await this.requestDataFromServer(query);

        for (const issue of response.issues) {
          const parent = issue.fields?.parent;
          results.push({
            issueKey: issue.key,
            parentKey: parent?.key || null,
            parentSummary: parent?.fields?.summary || null,
          });
        }
      } catch (error) {
        console.error(`Error fetching parent data for batch:`, error);
        // Add null results for this batch
        for (const key of batchKeys) {
          results.push({
            issueKey: key,
            parentKey: null,
            parentSummary: null,
          });
        }
      }
    }

    return results;
  }

  // Method to get worklogs for issues by Account and month
  async getWorklogsForAccountMonth(
    account: string,
    year: number,
    month: number
  ): Promise<
    {
      issueKey: string;
      worklogId: string;
      author: string;
      timeSpent: string;
      timeSpentSeconds: number;
      started: string;
      comment?: string;
    }[]
  > {
    try {
      console.log(
        `Fetching worklogs for account ${account} for ${year}-${month.toString().padStart(2, "0")}`
      );

      // Create date range for the month
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // Last day of the month

      // JQL query to find issues with worklogs in the specified month and account
      const jql = `"Account" = "${account}" AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

      console.log(`JQL Query: ${jql}`);

      // Get issues with worklogs in the specified month
      const issues = await this.getLiteQuery(jql);
      console.log(
        `Found ${issues.length} issues with worklogs for account ${account} in ${year}-${month.toString().padStart(2, "0")}`
      );

      // Log each issue found
      for (const issue of issues) {
        console.log(
          `Issue found: ${issue.key} (${issue.summary}) - Account: ${issue.account}`
        );
      }

      const allWorklogs: {
        issueKey: string;
        worklogId: string;
        author: string;
        timeSpent: string;
        timeSpentSeconds: number;
        started: string;
        comment?: string;
      }[] = [];

      // For each issue, get its worklogs
      for (const issue of issues) {
        try {
          console.log(`Fetching worklogs for issue ${issue.key}`);
          const worklogs = await this.getIssueWorklogs(issue.key);
          console.log(
            `Found ${worklogs.length} total worklogs for issue ${issue.key}`
          );

          // Filter worklogs to only include those from the specified month
          const monthWorklogs = worklogs.filter((worklog) => {
            const worklogDate = new Date(worklog.started);
            const isInMonth =
              worklogDate.getFullYear() === year &&
              worklogDate.getMonth() === month - 1; // month is 0-indexed in Date
            console.log(
              `Worklog ${worklog.id} started ${worklog.started}, in target month: ${isInMonth}`
            );
            return isInMonth;
          });

          console.log(
            `Filtered to ${monthWorklogs.length} worklogs in target month for issue ${issue.key}`
          );

          // Add to results with issue key
          for (const worklog of monthWorklogs) {
            console.log(
              `Adding worklog: ${worklog.id} by ${worklog.author.displayName} for ${worklog.timeSpent}`
            );
            allWorklogs.push({
              issueKey: issue.key,
              worklogId: worklog.id,
              author: worklog.author.displayName,
              timeSpent: worklog.timeSpent, // This is a string like "2h 30m"
              timeSpentSeconds: worklog.timeSpentSeconds,
              started: worklog.started,
              comment: worklog.comment,
            });
          }
        } catch (error) {
          console.error(
            `Error fetching worklogs for issue ${issue.key}:`,
            error
          );
        }
      }

      console.log(
        `Retrieved ${allWorklogs.length} worklogs for account ${account} for ${year}-${month.toString().padStart(2, "0")}`
      );
      return allWorklogs;
    } catch (error) {
      console.error(`Error fetching worklogs for account ${account}:`, error);
      throw error;
    }
  }

  // Method to get worklogs for a specific issue
  private async getIssueWorklogs(issueKey: string): Promise<
    {
      id: string;
      author: { displayName: string };
      timeSpent: string;
      timeSpentSeconds: number;
      started: string;
      comment?: string;
    }[]
  > {
    try {
      const domain = process.env.JIRA_DOMAIN;
      const url = `${domain}/rest/api/3/issue/${issueKey}/worklog`;

      const response = await this.fetchRequest(url);
      return response.worklogs || [];
    } catch (error) {
      console.error(`Error fetching worklogs for issue ${issueKey}:`, error);
      return [];
    }
  }
}
