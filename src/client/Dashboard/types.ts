export interface LeadTimeConfig {
  query: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  splitMode: "timebooked" | "statuses";
  viewMode: "sprint" | "combined";
  filterNoTimeBooked: boolean;
  statusesSelected: string[];
  ticketTypesSelected: string[];
}

export interface BitbucketPRConfig {
  workspace?: string;
  selectedGroup?: string;
}

export interface BugsAnalysisConfig {
  query: string;
  viewMode: "count" | "averageTimeSpent";
  savedQueryId?: string; // ID of saved query if one was selected
}

export interface DashboardMetric {
  id: string;
  type: "leadTime" | "bitbucketPR" | "bugsAnalysis";
  name: string;
  config: LeadTimeConfig | BitbucketPRConfig | BugsAnalysisConfig;
}

export interface Dashboard {
  id: string;
  name: string;
  metrics: DashboardMetric[];
}

export interface DashboardConfig {
  dashboards: Dashboard[];
}

