import { useState, useCallback, useRef, useEffect } from "react";
import {
  GitLabProject,
  GitLabMergeRequest,
} from "../../../server/GitLabRequester";
import { GitLabMRsState, ProjectProgress } from "../types";

const loadGroupFromStorage = (): string => {
  try {
    return localStorage.getItem("gitlabGroup") || "";
  } catch (error) {
    console.error("Error loading GitLab group from storage:", error);
    return "";
  }
};

const saveGroupToStorage = (group: string): void => {
  try {
    localStorage.setItem("gitlabGroup", group);
  } catch (error) {
    console.error("Error saving GitLab group to storage:", error);
  }
};

export const useGitLabProjects = () => {
  const [state, setState] = useState<GitLabMRsState>({
    projects: [],
    isLoading: false,
    error: null,
    group: loadGroupFromStorage(),
    mergeRequests: [],
    isLoadingMRs: false,
    mrsError: null,
    loadingProjectId: null,
    selectedProject: null,
    mrsLastUpdated: null,
    isLoadingAllMRs: false,
    projectProgress: new Map(),
  });

  const groupRef = useRef(state.group);
  const projectsRef = useRef(state.projects);
  useEffect(() => {
    groupRef.current = state.group;
    projectsRef.current = state.projects;
  }, [state.group, state.projects]);

  const loadProjects = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const groupParam = groupRef.current
        ? `?group=${encodeURIComponent(groupRef.current)}`
        : "";
      const response = await fetch(`/api/gitlab/projects${groupParam}`);

      if (!response.ok) {
        throw new Error("Failed to fetch GitLab projects");
      }

      const data = await response.json();
      const projects: GitLabProject[] = JSON.parse(data.data);

      setState((prev) => ({
        ...prev,
        projects,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading GitLab projects:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load GitLab projects",
      }));
    }
  }, []);

  const setGroup = useCallback((group: string) => {
    setState((prev) => ({ ...prev, group }));
    saveGroupToStorage(group);
  }, []);

  const loadMergeRequestsForProject = useCallback(
    async (project: GitLabProject, refresh: boolean = false) => {
      setState((prev) => ({
        ...prev,
        isLoadingMRs: true,
        loadingProjectId: project.id,
        mrsError: null,
      }));

      try {
        const response = await fetch("/api/gitlab/merge-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projects: [project], refresh }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch merge requests");
        }

        const data = await response.json();
        const results: Array<{
          project: GitLabProject;
          mergeRequests: GitLabMergeRequest[];
        }> = JSON.parse(data.data);

        setState((prev) => {
          const existingIndex = prev.mergeRequests.findIndex(
            (r) => r.project.id === project.id
          );
          const newMergeRequests = [...prev.mergeRequests];
          if (existingIndex >= 0) {
            newMergeRequests[existingIndex] = results[0];
          } else {
            newMergeRequests.push(results[0]);
          }

          return {
            ...prev,
            mergeRequests: newMergeRequests,
            isLoadingMRs: false,
            loadingProjectId: null,
            selectedProject: project,
            mrsLastUpdated: data.lastUpdated || Date.now(),
          };
        });
      } catch (error) {
        console.error("Error loading merge requests:", error);
        setState((prev) => ({
          ...prev,
          isLoadingMRs: false,
          loadingProjectId: null,
          mrsError:
            error instanceof Error
              ? error.message
              : "Failed to load merge requests",
        }));
      }
    },
    []
  );

  const setSelectedProject = useCallback(
    (project: GitLabProject | null) => {
      setState((prev) => ({ ...prev, selectedProject: project }));
    },
    []
  );

  const loadMergeRequestsForAllProjects = useCallback(
    async (refresh: boolean = false) => {
      const projectsToLoad = [...projectsRef.current];

      if (projectsToLoad.length === 0) {
        console.warn("No projects to load MRs for");
        return;
      }

      console.log(`Loading MRs for ${projectsToLoad.length} projects`);

      setState((prev) => ({
        ...prev,
        isLoadingAllMRs: true,
        projectProgress: new Map(
          projectsToLoad.map((project) => [
            String(project.id),
            { project, status: "pending" as const },
          ])
        ),
      }));

      const promises = projectsToLoad.map(async (project) => {
        const projectId = String(project.id);

        setState((prev) => {
          const newProgress = new Map(prev.projectProgress);
          newProgress.set(projectId, { project, status: "loading" });
          return { ...prev, projectProgress: newProgress };
        });

        try {
          const response = await fetch("/api/gitlab/merge-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projects: [project], refresh }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch merge requests");
          }

          const data = await response.json();
          const results: Array<{
            project: GitLabProject;
            mergeRequests: GitLabMergeRequest[];
          }> = JSON.parse(data.data);

          const mrCount = results[0]?.mergeRequests.length || 0;

          setState((prev) => {
            const existingIndex = prev.mergeRequests.findIndex(
              (r) => r.project.id === project.id
            );
            const newMergeRequests = [...prev.mergeRequests];
            if (existingIndex >= 0) {
              newMergeRequests[existingIndex] = results[0];
            } else {
              newMergeRequests.push(results[0]);
            }

            const newProgress = new Map(prev.projectProgress);
            newProgress.set(projectId, {
              project,
              status: "completed",
              mrCount,
            });

            return {
              ...prev,
              mergeRequests: newMergeRequests,
              projectProgress: newProgress,
              mrsLastUpdated: data.lastUpdated || Date.now(),
            };
          });
        } catch (error) {
          console.error(
            `Error loading MRs for ${project.path_with_namespace}:`,
            error
          );
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load merge requests";

          setState((prev) => {
            const newProgress = new Map(prev.projectProgress);
            newProgress.set(projectId, {
              project,
              status: "error",
              error: errorMessage,
            });
            return { ...prev, projectProgress: newProgress };
          });
        }
      });

      await Promise.allSettled(promises);

      setState((prev) => ({ ...prev, isLoadingAllMRs: false }));
    },
    []
  );

  return {
    state,
    loadProjects,
    setGroup,
    loadMergeRequestsForProject,
    setSelectedProject,
    loadMergeRequestsForAllProjects,
  };
};
