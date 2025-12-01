import { useState, useCallback, useRef, useEffect } from "react";
import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../../server/BitBucketRequester";
import { BitBucketPRsState } from "../types";

const loadWorkspaceFromStorage = (): string => {
  try {
    return localStorage.getItem("bitbucketWorkspace") || "";
  } catch (error) {
    console.error("Error loading workspace from storage:", error);
    return "";
  }
};

const saveWorkspaceToStorage = (workspace: string): void => {
  try {
    localStorage.setItem("bitbucketWorkspace", workspace);
  } catch (error) {
    console.error("Error saving workspace to storage:", error);
  }
};

export const useBitBucketRepositories = () => {
  const [state, setState] = useState<BitBucketPRsState>({
    repositories: [],
    isLoading: false,
    error: null,
    workspace: loadWorkspaceFromStorage(),
    pullRequests: [],
    isLoadingPRs: false,
    prsError: null,
    loadingRepoId: null,
    selectedRepository: null,
    prsLastUpdated: null,
  });

  // Use ref to always get the latest workspace value
  const workspaceRef = useRef(state.workspace);
  useEffect(() => {
    workspaceRef.current = state.workspace;
  }, [state.workspace]);

  const loadRepositories = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const workspaceParam = workspaceRef.current
        ? `?workspace=${encodeURIComponent(workspaceRef.current)}`
        : "";
      const response = await fetch(`/api/bitbucket/repositories${workspaceParam}`);

      if (!response.ok) {
        throw new Error("Failed to fetch repositories");
      }

      const data = await response.json();
      const repositories: BitBucketRepository[] = JSON.parse(data.data);

      setState((prev) => ({
        ...prev,
        repositories,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading repositories:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load repositories",
      }));
    }
  }, []);

  const setWorkspace = useCallback((workspace: string) => {
    setState((prev) => ({ ...prev, workspace }));
    saveWorkspaceToStorage(workspace);
  }, []);

  const loadPullRequestsForRepository = useCallback(
    async (repository: BitBucketRepository, refresh: boolean = false) => {
      // Use full_name as primary identifier since it's unique (workspace/repo)
      const repoId = repository.full_name || repository.uuid || repository.slug;

      setState((prev) => ({
        ...prev,
        isLoadingPRs: true,
        loadingRepoId: repoId,
        prsError: null,
      }));

      try {
        const response = await fetch("/api/bitbucket/pull-requests", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repositories: [repository],
            refresh,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch pull requests");
        }

        const data = await response.json();
        const results: Array<{
          repository: BitBucketRepository;
          pullRequests: BitBucketPullRequest[];
        }> = JSON.parse(data.data);

        // Update or add PRs for this repository
        setState((prev) => {
          const existingIndex = prev.pullRequests.findIndex(
            (r) =>
              (r.repository.full_name || r.repository.uuid || r.repository.slug) ===
              repoId
          );

          const newPullRequests = [...prev.pullRequests];
          if (existingIndex >= 0) {
            // Update existing entry
            newPullRequests[existingIndex] = results[0];
          } else {
            // Add new entry
            newPullRequests.push(results[0]);
          }

          return {
            ...prev,
            pullRequests: newPullRequests,
            isLoadingPRs: false,
            loadingRepoId: null,
            selectedRepository: repository, // Set as selected for modal
            prsLastUpdated: data.lastUpdated || Date.now(),
          };
        });
      } catch (error) {
        console.error("Error loading pull requests:", error);
        setState((prev) => ({
          ...prev,
          isLoadingPRs: false,
          loadingRepoId: null,
          prsError:
            error instanceof Error
              ? error.message
              : "Failed to load pull requests",
        }));
      }
    },
    []
  );

  const setSelectedRepository = useCallback(
    (repository: BitBucketRepository | null) => {
      setState((prev) => ({ ...prev, selectedRepository: repository }));
    },
    []
  );

  return {
    state,
    loadRepositories,
    setWorkspace,
    loadPullRequestsForRepository,
    setSelectedRepository,
  };
};

