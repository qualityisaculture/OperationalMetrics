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

export interface ReleaseLeadTimeState {
  projects: JiraProject[];
  isLoadingProjects: boolean;
  projectsError: string | null;
  selectedProject: JiraProject | null;
  releases: Release[];
  isLoadingReleases: boolean;
  releasesError: string | null;
  favoriteProjects: Set<string>;
}

