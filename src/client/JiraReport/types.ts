import { JiraProject } from "../../server/graphManagers/JiraReportGraphManager";
import { LiteJiraIssue } from "../../server/JiraRequester";

// Extended interface for JiraIssue with aggregated values
export interface JiraIssueWithAggregated extends LiteJiraIssue {
  aggregatedOriginalEstimate?: number;
  aggregatedTimeSpent?: number;
  aggregatedTimeRemaining?: number;
}

// Interface for project-level aggregated data
export interface ProjectAggregatedData {
  totalOriginalEstimateDays: number;
  totalTimeSpentDays: number;
  totalTimeRemainingDays: number;
  loadedWorkstreamCount: number;
  totalWorkstreamCount: number;
}

export interface JiraReportState {
  projects: JiraProject[];
  isLoading: boolean;
  error: string | null;
  selectedProject: JiraProject | null;
  projectIssues: JiraIssueWithAggregated[];
  issuesLoading: boolean;
  issuesError: string | null;
  favoriteItems: Set<string>; // Changed from favoriteProjects to favoriteItems
  // New state for recursive navigation
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  currentIssues: JiraIssueWithAggregated[];
  currentIssuesLoading: boolean;
  currentIssuesError: string | null;
  // New state to track loaded workstream aggregated data
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >;
  // New state for project-level aggregation
  projectAggregatedData: ProjectAggregatedData | null;
  // New state for progress tracking
  progressStatus: string;
  progressDetails?: {
    currentLevel: number;
    totalLevels: number;
    currentIssues: string[];
    totalIssues: number;
    apiCallsMade: number;
    totalApiCalls: number;
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
  };
  currentStep?: string;
  // New state for "Request All" functionality
  isRequestAllModalVisible: boolean;
  requestAllProgress: number;
  requestAllDetails?: {
    currentLevel: number;
    totalLevels: number;
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
  };
}
