import { useState, useCallback, useRef, useEffect } from "react";
import { BitBucketRepository } from "../../../server/BitBucketRequester";
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

  return {
    state,
    loadRepositories,
    setWorkspace,
  };
};

