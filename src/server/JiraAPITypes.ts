export type historyItem = {
  field: string;
  fromString: string;
  toString: string;
};

export type omHistoryItem = historyItem & {
  created: Date;
};

export type history = {
  created: string;
  items: historyItem[];
};

// New Jira API v3 types based on the updated response structure
export type JiraIssueResponse = {
  expand: string;
  id: string;
  self: string;
  key: string;
  changelog: JiraChangelog;
  fields: JiraFields;
};

export type JiraIssuesResponse = {
  issues: JiraIssueResponse[];
};

export type JiraChangelog = {
  startAt: number;
  maxResults: number;
  total: number;
  histories: JiraHistory[];
};

export type JiraHistory = {
  id: string;
  author: JiraUser;
  created: string;
  items: JiraHistoryItem[];
};

export type JiraUser = {
  self: string;
  accountId: string;
  emailAddress: string;
  avatarUrls: {
    "16x16": string;
    "24x24": string;
    "32x32": string;
    "48x48": string;
  };
  displayName: string;
  active: boolean;
  timeZone: string;
  accountType: string;
};

export type JiraHistoryItem = {
  field: string;
  fieldtype: string;
  from?: string;
  fromString?: string;
  to?: string;
  toString?: string;
};

// Jira Fields types based on the expanded response
export type JiraFields = {
  issuetype: JiraIssueType;
  components: JiraComponent[];
  created: string;
  customfield_10085: JiraCustomField10085 | null;
  customfield_10022: string | null; // Epic Start Date
  fixVersions: JiraFixVersion[];
  customfield_10023: string | null; // Epic End Date
  priority: JiraPriority;
  resolution: JiraResolution | null;
  customfield_11753: number | null; // Baseline Estimate
  labels: string[];
  duedate: string | null;
  updated: string;
  status: JiraStatus;
  resolutiondate: string | null;
  summary: string;
};

export type JiraIssueType = {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  hierarchyLevel: number;
};

export type JiraCustomField10085 = {
  id: number;
  value: string;
};

export type JiraPriority = {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
};

export type JiraStatus = {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  id: string;
  statusCategory: JiraStatusCategory;
};

export type JiraStatusCategory = {
  self: string;
  id: number;
  key: string;
  colorName: string;
  name: string;
};

export type JiraComponent = {
  self: string;
  id: string;
  name: string;
  description: string;
};

export type JiraFixVersion = {
  self: string;
  id: string;
  description: string;
  name: string;
  archived: boolean;
  released: boolean;
  releaseDate: string;
};

export type JiraResolution = {
  self: string;
  id: string;
  description: string;
  name: string;
};
