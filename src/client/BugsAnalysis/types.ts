export interface BugsAnalysisIssue {
  key: string;
  summary: string;
  type: string;
  status: string;
  created: string;
  resolved: string | null;
  timeSpent: number | null; // in days
  url: string;
}

export interface QuarterData {
  quarter: string; // e.g., "2024-Q1"
  resolved: number;
  unresolved: number;
  resolvedIssues: BugsAnalysisIssue[];
  unresolvedIssues: BugsAnalysisIssue[];
  averageTimeSpent: number | null; // in days, only for resolved issues
}

export interface BugsAnalysisData {
  issues: BugsAnalysisIssue[];
  quarterlyData: QuarterData[];
}

export type ViewMode = "count" | "averageTimeSpent";

