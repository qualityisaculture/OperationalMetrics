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

export interface TempoAnalyzerConfig {
  summaryViewMode: "category" | "name" | "issueType" | "ancestryType" | "sankey";
  secondarySplitMode: "account" | "issueType";
  excludeHolidayAbsence: boolean;
  excludeStartDate: string | null;
  excludeEndDate: string | null;
  showOtherTeams: boolean;
  selectedUserGroups: string[];
  sankeySelectors: Array<{
    id: string;
    name?: string;
    type: "Type" | "Label" | "Project" | "Key";
    selectedValues: string[];
  }>;
}

export interface DashboardMetric {
  id: string;
  type: "leadTime" | "bitbucketPR" | "bugsAnalysis" | "tempoAnalyzer";
  name: string;
  config: LeadTimeConfig | BitbucketPRConfig | BugsAnalysisConfig | TempoAnalyzerConfig;
}

export interface Dashboard {
  id: string;
  name: string;
  metrics: DashboardMetric[];
}

export interface DashboardConfig {
  dashboards: Dashboard[];
}

