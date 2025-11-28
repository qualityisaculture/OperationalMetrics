import { JiraProject } from "../../server/graphManagers/JiraReportGraphManager";

export interface Release {
  id: string;
  name: string;
  description?: string;
  released: boolean;
  releaseDate?: string;
  archived: boolean;
  projectId: number;
}

export interface StatusChange {
  date: string; // ISO string
  status: string;
}

export interface JiraWithStatusChanges {
  key: string;
  url: string;
  type: string;
  status: string;
  resolutionDate: string | null;
  statusChanges: StatusChange[];
}

export interface ReleaseLeadTimeState {
  projects: JiraProject[];
  isLoadingProjects: boolean;
  projectsError: string | null;
  selectedProject: JiraProject | null;
  releases: Release[];
  isLoadingReleases: boolean;
  releasesError: string | null;
  favoriteProjects: Set<string>;
  releaseJiraKeys: Map<string, string[]>; // Map of release name to Jira keys
  releaseJiraData: Map<string, JiraWithStatusChanges[]>; // Map of release name to full Jira data with status changes
  loadingJiraKeys: Set<string>; // Set of release names currently loading
  jiraKeysError: Map<string, string>; // Map of release name to error message
}
