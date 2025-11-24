import { useState, useEffect, useCallback } from "react";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";
import { Release, ReleaseLeadTimeState } from "../types";
import { STORAGE_KEY_FAVORITES } from "../constants";

const initialState: ReleaseLeadTimeState = {
  projects: [],
  isLoadingProjects: false,
  projectsError: null,
  selectedProject: null,
  releases: [],
  isLoadingReleases: false,
  releasesError: null,
  favoriteProjects: new Set(loadFavoritesFromStorage()),
};

function loadFavoritesFromStorage(): string[] {
  try {
    const favorites = localStorage.getItem(STORAGE_KEY_FAVORITES);
    return favorites ? JSON.parse(favorites) : [];
  } catch (error) {
    console.error("Error loading favorites from localStorage:", error);
    return [];
  }
}

function saveFavoritesToStorage(favorites: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error("Error saving favorites to localStorage:", error);
  }
}

export const useReleaseLeadTime = () => {
  const [state, setState] = useState<ReleaseLeadTimeState>(initialState);

  const loadProjects = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoadingProjects: true, projectsError: null }));
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      const projects: JiraProject[] = JSON.parse(data.data);
      setState((prev) => ({
        ...prev,
        projects,
        isLoadingProjects: false,
      }));
    } catch (error) {
      console.error("Error loading projects:", error);
      setState((prev) => ({
        ...prev,
        isLoadingProjects: false,
        projectsError: error instanceof Error ? error.message : "Failed to load projects",
      }));
    }
  }, []);

  const loadReleases = useCallback(async (projectKey: string) => {
    setState((prev) => ({
      ...prev,
      isLoadingReleases: true,
      releasesError: null,
    }));
    try {
      const response = await fetch(`/api/releases?projectKey=${projectKey}`);
      if (!response.ok) {
        throw new Error("Failed to fetch releases");
      }
      const data = await response.json();
      const releases: Release[] = JSON.parse(data.data);
      setState((prev) => ({
        ...prev,
        releases,
        isLoadingReleases: false,
      }));
    } catch (error) {
      console.error("Error loading releases:", error);
      setState((prev) => ({
        ...prev,
        isLoadingReleases: false,
        releasesError: error instanceof Error ? error.message : "Failed to load releases",
      }));
    }
  }, []);

  const selectProject = useCallback(
    (project: JiraProject) => {
      setState((prev) => ({ ...prev, selectedProject: project }));
      loadReleases(project.key);
    },
    [loadReleases]
  );

  const toggleFavorite = useCallback((projectKey: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setState((prev) => {
      const newFavorites = new Set(prev.favoriteProjects);
      if (newFavorites.has(projectKey)) {
        newFavorites.delete(projectKey);
      } else {
        newFavorites.add(projectKey);
      }
      saveFavoritesToStorage(Array.from(newFavorites));
      return { ...prev, favoriteProjects: newFavorites };
    });
  }, []);

  const getSortedProjects = useCallback(() => {
    const { projects, favoriteProjects } = state;
    const favoriteProjectsList = projects.filter((project) =>
      favoriteProjects.has(project.key)
    );
    const nonFavoriteProjectsList = projects.filter(
      (project) => !favoriteProjects.has(project.key)
    );
    favoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    nonFavoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    return [...favoriteProjectsList, ...nonFavoriteProjectsList];
  }, [state.projects, state.favoriteProjects]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    state,
    loadProjects,
    selectProject,
    toggleFavorite,
    getSortedProjects,
  };
};

