import {
  GitLabProject,
  GitLabMergeRequest,
} from "../../server/GitLabRequester";

export interface ProjectProgress {
  project: GitLabProject;
  status: "pending" | "loading" | "completed" | "error";
  error?: string;
  mrCount?: number;
}

export interface GitLabMRsState {
  projects: GitLabProject[];
  isLoading: boolean;
  error: string | null;
  group: string;
  mergeRequests: Array<{
    project: GitLabProject;
    mergeRequests: GitLabMergeRequest[];
  }>;
  isLoadingMRs: boolean;
  mrsError: string | null;
  loadingProjectId: number | null;
  selectedProject: GitLabProject | null;
  mrsLastUpdated: number | null;
  isLoadingAllMRs: boolean;
  projectProgress: Map<string, ProjectProgress>;
}
