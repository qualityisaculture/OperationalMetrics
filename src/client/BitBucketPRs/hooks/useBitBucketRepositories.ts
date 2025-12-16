import { useState, useCallback, useRef, useEffect } from "react";
import {
  BitBucketRepository,
  BitBucketPullRequest,
} from "../../../server/BitBucketRequester";
import { BitBucketPRsState, RepositoryProgress } from "../types";

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
    isLoadingAllPRs: false,
    repositoryProgress: new Map(),
  });

  // Use ref to always get the latest workspace value
  const workspaceRef = useRef(state.workspace);
  const repositoriesRef = useRef(state.repositories);
  useEffect(() => {
    workspaceRef.current = state.workspace;
    repositoriesRef.current = state.repositories;
  }, [state.workspace, state.repositories]);

  const loadRepositories = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const workspaceParam = workspaceRef.current
        ? `?workspace=${encodeURIComponent(workspaceRef.current)}`
        : "";
      const response = await fetch(
        `/api/bitbucket/repositories${workspaceParam}`
      );

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
        error:
          error instanceof Error
            ? error.message
            : "Failed to load repositories",
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
              (r.repository.full_name ||
                r.repository.uuid ||
                r.repository.slug) === repoId
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

  const loadPullRequestsForAllRepositories = useCallback(
    async (refresh: boolean = false) => {
      // Get current repositories from ref (always up-to-date)
      const repositoriesToLoad = [...repositoriesRef.current];

      // Ensure we have repositories to load
      if (repositoriesToLoad.length === 0) {
        console.warn("No repositories to load PRs for");
        return;
      }

      console.log(`Loading PRs for ${repositoriesToLoad.length} repositories`);

      // Initialize progress tracking
      setState((prev) => ({
        ...prev,
        isLoadingAllPRs: true,
        repositoryProgress: new Map(
          repositoriesToLoad.map((repo) => {
            const repoId = repo.full_name || repo.uuid || repo.slug;
            return [
              repoId,
              {
                repository: repo,
                status: "pending" as const,
              },
            ];
          })
        ),
      }));

      // Load PRs for all repositories in parallel
      const promises = repositoriesToLoad.map(async (repository) => {
        const repoId =
          repository.full_name || repository.uuid || repository.slug;

        // Update status to loading
        setState((prev) => {
          const newProgress = new Map(prev.repositoryProgress);
          newProgress.set(repoId, {
            repository,
            status: "loading",
          });
          return { ...prev, repositoryProgress: newProgress };
        });

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

          const prCount = results[0]?.pullRequests.length || 0;

          // Update state with the new PRs
          setState((prev) => {
            const existingIndex = prev.pullRequests.findIndex(
              (r) =>
                (r.repository.full_name ||
                  r.repository.uuid ||
                  r.repository.slug) === repoId
            );

            const newPullRequests = [...prev.pullRequests];
            if (existingIndex >= 0) {
              newPullRequests[existingIndex] = results[0];
            } else {
              newPullRequests.push(results[0]);
            }

            // Update progress to completed
            const newProgress = new Map(prev.repositoryProgress);
            newProgress.set(repoId, {
              repository,
              status: "completed",
              prCount,
            });

            return {
              ...prev,
              pullRequests: newPullRequests,
              repositoryProgress: newProgress,
              prsLastUpdated: data.lastUpdated || Date.now(),
            };
          });
        } catch (error) {
          console.error(
            `Error loading pull requests for ${repository.full_name || repository.name}:`,
            error
          );
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to load pull requests";

          // Update progress to error
          setState((prev) => {
            const newProgress = new Map(prev.repositoryProgress);
            newProgress.set(repoId, {
              repository,
              status: "error",
              error: errorMessage,
            });
            return { ...prev, repositoryProgress: newProgress };
          });
        }
      });

      // Wait for all requests to complete
      await Promise.allSettled(promises);

      // Mark loading as complete
      setState((prev) => ({
        ...prev,
        isLoadingAllPRs: false,
      }));
    },
    []
  );

  return {
    state,
    loadRepositories,
    setWorkspace,
    loadPullRequestsForRepository,
    setSelectedRepository,
    loadPullRequestsForAllRepositories,
  };
};
