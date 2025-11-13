import { useState, useEffect, useCallback } from "react";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";
import { LiteJiraIssue } from "../../../server/JiraRequester";
import { JiraIssueWithAggregated, JiraReportState } from "../types";
import {
  calculateAggregatedValues,
  processWorkstreamData,
  calculateProjectAggregatedData,
} from "../utils";

export const useJiraReport = () => {
  const [state, setState] = useState<JiraReportState>({
    projects: [],
    isLoading: false,
    error: null,
    selectedProject: null,
    projectIssues: [],
    issuesLoading: false,
    issuesError: null,
    favoriteItems: new Set(loadFavoritesFromStorage()),
    navigationStack: [],
    currentIssues: [],
    currentIssuesLoading: false,
    currentIssuesError: null,
    loadedWorkstreamData: new Map(),
    projectAggregatedData: null,
    progressStatus: "Idle",
    progressDetails: undefined,
    currentStep: undefined,
    isRequestAllModalVisible: false,
    requestAllProgress: 0,
    requestAllDetails: undefined,
    // New state for defect history functionality
    defectHistoryData: null,
    defectHistoryLoading: false,
    defectHistoryError: null,
    // New state for orphan detection functionality
    orphanData: null,
    orphanLoading: false,
    orphanError: null,
  });

  const getWorkstreamDataCellSpan = useCallback(
    (record: JiraIssueWithAggregated, isFirstColumn: boolean = false) => {
      if (state.navigationStack.length === 1) {
        const hasAggregatedData =
          record.aggregatedOriginalEstimate !== undefined;
        const valueToShow = hasAggregatedData
          ? record.aggregatedOriginalEstimate
          : record.originalEstimate;

        // Check if this workstream has been requested and has no data
        const hasBeenRequested = record.hasBeenRequested;
        const hasData = record.hasData;
        const hasChildren = record.hasChildren;

        // If we know the workstream has no children, or if it was requested and has no data,
        // we should span the cells to show the message
        if (
          valueToShow === null ||
          valueToShow === undefined ||
          valueToShow === 0 ||
          hasChildren === false ||
          (hasBeenRequested && hasData === false)
        ) {
          if (isFirstColumn) {
            return { colSpan: 6 };
          } else {
            return { colSpan: 0 };
          }
        }
      }
      return {};
    },
    [state.navigationStack.length]
  );

  function loadFavoritesFromStorage(): string[] {
    try {
      const favorites = localStorage.getItem("jiraReport_favoriteItems");
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      return [];
    }
  }

  const saveFavoritesToStorage = (favorites: string[]) => {
    try {
      localStorage.setItem(
        "jiraReport_favoriteItems",
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  };

  const toggleFavorite = (itemKey: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setState((prevState) => {
      const newFavorites = new Set(prevState.favoriteItems);
      if (newFavorites.has(itemKey)) {
        newFavorites.delete(itemKey);
      } else {
        newFavorites.add(itemKey);
      }
      saveFavoritesToStorage(Array.from(newFavorites));
      return { ...prevState, favoriteItems: newFavorites };
    });
  };

  const getSortedProjects = useCallback(() => {
    const { projects, favoriteItems } = state;
    const favoriteProjectsList = projects.filter((project) =>
      favoriteItems.has(project.key)
    );
    const nonFavoriteProjectsList = projects.filter(
      (project) => !favoriteItems.has(project.key)
    );
    favoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    nonFavoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    return [...favoriteProjectsList, ...nonFavoriteProjectsList];
  }, [state.projects, state.favoriteItems]);

  const getSortedItems = useCallback(
    <T extends { key: string }>(items: T[]): T[] => {
      const { favoriteItems } = state;
      const favoriteItemsList = items.filter((item) =>
        favoriteItems.has(item.key)
      );
      const nonFavoriteItemsList = items.filter(
        (item) => !favoriteItems.has(item.key)
      );
      favoriteItemsList.sort((a, b) => a.key.localeCompare(b.key));
      nonFavoriteItemsList.sort((a, b) => a.key.localeCompare(b.key));
      return [...favoriteItemsList, ...nonFavoriteItemsList];
    },
    [state.favoriteItems]
  );

  const getOptimalPageSize = useCallback(() => {
    const { favoriteItems } = state;
    const favoriteCount = favoriteItems.size;
    if (favoriteCount > 0) {
      return Math.max(10, favoriteCount + 5);
    }
    return 10;
  }, [state.favoriteItems]);

  const loadProjects = async () => {
    setState((prevState) => ({ ...prevState, isLoading: true, error: null }));
    try {
      const response = await fetch("/api/jiraReport/projects");
      const data = await response.json();
      if (response.ok) {
        const projects: JiraProject[] = JSON.parse(data.data);
        setState((prevState) => ({ ...prevState, projects, isLoading: false }));
      } else {
        setState((prevState) => ({
          ...prevState,
          error: data.message || "Failed to load projects",
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        error: "Network error while loading projects",
        isLoading: false,
      }));
    }
  };

  const clearCacheAndReload = async () => {
    // Reset all local state to return to clean projects table view
    setState((prevState) => ({
      ...prevState,
      isLoading: true,
      error: null,
      selectedProject: null,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      navigationStack: [],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
      loadedWorkstreamData: new Map(),
      projectAggregatedData: null,
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
      isRequestAllModalVisible: false,
      requestAllProgress: 0,
      requestAllDetails: undefined,
      defectHistoryData: null,
      defectHistoryLoading: false,
      defectHistoryError: null,
      orphanData: null,
      orphanLoading: false,
      orphanError: null,
    }));

    try {
      // First, clear the server cache
      const clearCacheResponse = await fetch("/api/jiraReport/cache", {
        method: "DELETE",
      });
      if (!clearCacheResponse.ok) {
        console.warn("Failed to clear cache, but continuing to load projects");
      }

      // Then, load fresh projects
      const response = await fetch("/api/jiraReport/projects");
      const data = await response.json();
      if (response.ok) {
        const projects: JiraProject[] = JSON.parse(data.data);
        setState((prevState) => ({ ...prevState, projects, isLoading: false }));
      } else {
        setState((prevState) => ({
          ...prevState,
          error: data.message || "Failed to load projects",
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        error: "Network error while loading projects",
        isLoading: false,
      }));
    }
  };

  const processCachedWorkstreams = (workstreams: LiteJiraIssue[]) => {
    console.log("processCachedWorkstreams called with:", {
      workstreamsCount: workstreams.length,
      sampleWorkstream: workstreams[0],
      workstreamsWithChildren: workstreams.filter(
        (w) => w.children && w.children.length > 0
      ).length,
    });

    const processedWorkstreams: JiraIssueWithAggregated[] = workstreams.map(
      (workstream) => {
        if (workstream.children && workstream.children.length > 0) {
          const aggregatedValues = calculateAggregatedValues(workstream);
          console.log(
            `Calculated aggregated values for ${workstream.key}:`,
            aggregatedValues
          );
          return {
            ...workstream,
            aggregatedOriginalEstimate:
              aggregatedValues.aggregatedOriginalEstimate,
            aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
            aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
            hasChildren: true,
          };
        }
        console.log(
          `No children for workstream ${workstream.key}, skipping aggregated values`
        );
        return {
          ...workstream,
          aggregatedOriginalEstimate: undefined,
          aggregatedTimeSpent: undefined,
          aggregatedTimeRemaining: undefined,
          hasChildren: workstream.hasChildren,
        };
      }
    );

    // Also populate the loadedWorkstreamData state with the aggregated values
    // Merge with existing loadedWorkstreamData instead of replacing it
    const newLoadedWorkstreamData = new Map(state.loadedWorkstreamData);
    processedWorkstreams.forEach((workstream) => {
      if (
        workstream.aggregatedOriginalEstimate !== undefined &&
        workstream.aggregatedTimeSpent !== undefined &&
        workstream.aggregatedTimeRemaining !== undefined
      ) {
        newLoadedWorkstreamData.set(workstream.key, {
          aggregatedOriginalEstimate: workstream.aggregatedOriginalEstimate,
          aggregatedTimeSpent: workstream.aggregatedTimeSpent,
          aggregatedTimeRemaining: workstream.aggregatedTimeRemaining,
          hasData: workstream.children && workstream.children.length > 0,
        });
      } else if (
        workstream.hasChildren !== null &&
        workstream.hasChildren !== undefined
      ) {
        // Include workstreams where we know their children status
        newLoadedWorkstreamData.set(workstream.key, {
          aggregatedOriginalEstimate: 0,
          aggregatedTimeSpent: 0,
          aggregatedTimeRemaining: 0,
          hasData: workstream.hasChildren,
        });
      }
    });

    // Calculate project-level aggregation
    const projectAggregatedData = calculateProjectAggregatedData(
      processedWorkstreams,
      newLoadedWorkstreamData
    );

    console.log("processCachedWorkstreams result:", {
      processedWorkstreamsCount: processedWorkstreams.length,
      existingLoadedWorkstreamDataSize: state.loadedWorkstreamData.size,
      newLoadedWorkstreamDataSize: newLoadedWorkstreamData.size,
      newLoadedWorkstreamDataKeys: Array.from(newLoadedWorkstreamData.keys()),
      mergedDataSize: newLoadedWorkstreamData.size,
      projectAggregatedData,
    });

    setState((prevState) => ({
      ...prevState,
      projectIssues: processedWorkstreams,
      loadedWorkstreamData: newLoadedWorkstreamData,
      projectAggregatedData,
      issuesLoading: false,
    }));
  };

  const loadProjectWorkstreams = async (projectKey: string) => {
    setState((prevState) => ({
      ...prevState,
      issuesLoading: true,
      issuesError: null,
    }));
    try {
      const response = await fetch(
        `/api/jiraReport/project/${projectKey}/workstreams`
      );
      const data = await response.json();
      if (response.ok) {
        const workstreams: LiteJiraIssue[] = JSON.parse(data.data);
        console.log(
          "loadProjectWorkstreams: Received workstreams from backend:",
          {
            workstreamsCount: workstreams.length,
            sampleWorkstream: workstreams[0],
            workstreamsWithChildren: workstreams.filter(
              (w) => w.children && w.children.length > 0
            ).length,
            workstreamsWithChildrenDetails: workstreams
              .filter((w) => w.children && w.children.length > 0)
              .map((w) => ({
                key: w.key,
                childrenCount: w.children.length,
                hasChildren: w.hasChildren,
              })),
          }
        );
        processCachedWorkstreams(workstreams);
      } else {
        setState((prevState) => ({
          ...prevState,
          issuesError: data.message || "Failed to load project workstreams",
          issuesLoading: false,
        }));
      }
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        issuesError: "Network error while loading project workstreams",
        issuesLoading: false,
      }));
    }
  };

  const handleProjectClick = async (project: JiraProject) => {
    setState((prevState) => ({
      ...prevState,
      selectedProject: project,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      navigationStack: [
        {
          type: "project",
          key: project.key,
          name: project.name,
          data: [],
        },
      ],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
      loadedWorkstreamData: new Map(),
      projectAggregatedData: null,
    }));
    await loadProjectWorkstreams(project.key);
  };

  const handleWorkstreamClick = async (workstream: LiteJiraIssue) => {
    console.log(`\n=== FRONTEND: Clicking on workstream ${workstream.key} ===`);
    console.log(
      `Workstream: ${workstream.key} - ${workstream.summary} (${workstream.type})`
    );

    setState((prevState) => ({
      ...prevState,
      currentIssuesLoading: true,
      currentIssuesError: null,
      progressStatus: "Starting to fetch workstream data...",
      progressDetails: undefined,
      currentStep: undefined,
    }));

    try {
      const eventSource = new EventSource(
        `/api/jiraReport/workstream/${workstream.key}/workstream`
      );

      eventSource.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.status === "processing") {
          setState((prevState) => ({
            ...prevState,
            progressStatus: response.message || "Processing...",
            progressDetails: response.progress,
            currentStep: response.step,
          }));
        } else if (response.status === "complete" && response.data) {
          const workstreamWithIssues: LiteJiraIssue = JSON.parse(response.data);
          const hasData =
            response.hasData || workstreamWithIssues.children.length > 0;

          console.log(
            `\n=== FRONTEND: Received workstream data for ${workstream.key} ===`
          );
          console.log("Complete workstream tree:", workstreamWithIssues);
          console.log("Has data:", hasData);

          if (!hasData) {
            console.log(`Workstream ${workstream.key} has no data available`);

            // Update the workstream data to indicate it was requested but has no data
            const workstreamAggregatedData = {
              aggregatedOriginalEstimate: 0,
              aggregatedTimeSpent: 0,
              aggregatedTimeRemaining: 0,
              hasData: false,
            };

            setState((prevState) => {
              const newLoadedWorkstreamData = new Map(
                prevState.loadedWorkstreamData
              ).set(workstream.key, workstreamAggregatedData);

              // Update projectIssues with the new aggregated values for this workstream
              const updatedProjectIssues = prevState.projectIssues.map((ws) => {
                if (ws.key === workstream.key) {
                  return {
                    ...ws,
                    aggregatedOriginalEstimate: 0,
                    aggregatedTimeSpent: 0,
                    aggregatedTimeRemaining: 0,
                    hasBeenRequested: true,
                    hasData: false,
                    hasChildren: false,
                  };
                }
                return ws;
              });

              // Calculate project-level aggregation
              const projectAggregatedData = calculateProjectAggregatedData(
                updatedProjectIssues,
                newLoadedWorkstreamData
              );

              return {
                ...prevState,
                projectIssues: updatedProjectIssues,
                loadedWorkstreamData: newLoadedWorkstreamData,
                projectAggregatedData,
                currentIssuesLoading: false,
                progressStatus: "Idle",
                progressDetails: undefined,
                currentStep: undefined,
              };
            });

            eventSource.close();
            return;
          }

          const processedWorkstreamData =
            processWorkstreamData(workstreamWithIssues);

          console.log(
            `\n=== FRONTEND: Processed workstream data with aggregated values ===`
          );
          console.log("Processed workstream tree:", processedWorkstreamData);

          const workstreamAggregatedData = {
            aggregatedOriginalEstimate:
              processedWorkstreamData.aggregatedOriginalEstimate ?? 0,
            aggregatedTimeSpent:
              processedWorkstreamData.aggregatedTimeSpent ?? 0,
            aggregatedTimeRemaining:
              processedWorkstreamData.aggregatedTimeRemaining ?? 0,
            hasData: true,
          };

          const processedChildren = workstreamWithIssues.children.map(
            (item) => {
              const aggregatedValues = calculateAggregatedValues(item);
              return {
                ...item,
                aggregatedOriginalEstimate:
                  aggregatedValues.aggregatedOriginalEstimate,
                aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
                aggregatedTimeRemaining:
                  aggregatedValues.aggregatedTimeRemaining,
              };
            }
          );

          const newNavigationItem = {
            type: "issue" as const,
            key: workstream.key,
            name: workstream.summary,
            data: processedChildren,
          };

          console.log(
            `Adding workstream to navigation stack:`,
            newNavigationItem
          );

          setState((prevState) => {
            const newLoadedWorkstreamData = new Map(
              prevState.loadedWorkstreamData
            ).set(workstream.key, workstreamAggregatedData);

            // Update projectIssues with the new aggregated values and children for this workstream
            const updatedProjectIssues = prevState.projectIssues.map((ws) => {
              if (ws.key === workstream.key) {
                return {
                  ...ws,
                  ...processedWorkstreamData, // Include all properties including children
                  aggregatedOriginalEstimate:
                    processedWorkstreamData.aggregatedOriginalEstimate,
                  aggregatedTimeSpent:
                    processedWorkstreamData.aggregatedTimeSpent,
                  aggregatedTimeRemaining:
                    processedWorkstreamData.aggregatedTimeRemaining,
                  hasBeenRequested: true,
                  hasData: true,
                  hasChildren: true,
                };
              }
              return ws;
            });

            // Calculate project-level aggregation
            const projectAggregatedData = calculateProjectAggregatedData(
              updatedProjectIssues,
              newLoadedWorkstreamData
            );

            return {
              ...prevState,
              projectIssues: updatedProjectIssues,
              navigationStack: [
                ...prevState.navigationStack,
                newNavigationItem,
              ],
              currentIssues: processedChildren,
              currentIssuesLoading: false,
              loadedWorkstreamData: newLoadedWorkstreamData,
              projectAggregatedData,
              progressStatus: "Idle",
              progressDetails: undefined,
              currentStep: undefined,
            };
          });

          console.log(
            `=== FRONTEND: Workstream navigation complete for ${workstream.key} ===\n`
          );

          // Automatically trigger orphan detection for workstreams
          console.log(
            `Auto-triggering orphan detection for workstream ${workstream.key}`
          );
          requestOrphanDetection(workstream.key);

          eventSource.close();
        } else if (response.status === "error") {
          console.error(
            `FRONTEND: API error for workstream ${workstream.key}:`,
            response.message
          );
          setState((prevState) => ({
            ...prevState,
            currentIssuesError:
              response.message || "Failed to load workstream data",
            currentIssuesLoading: false,
            progressStatus: "Error occurred",
            progressDetails: undefined,
            currentStep: undefined,
          }));
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        console.error(
          `FRONTEND: SSE connection error for workstream ${workstream.key}`
        );
        setState((prevState) => ({
          ...prevState,
          currentIssuesError: "Connection error while loading workstream data",
          currentIssuesLoading: false,
          progressStatus: "Connection error",
          progressDetails: undefined,
          currentStep: undefined,
        }));
        eventSource.close();
      };
    } catch (error) {
      console.error(
        `FRONTEND: Network error for workstream ${workstream.key}:`,
        error
      );
      setState((prevState) => ({
        ...prevState,
        currentIssuesError: "Network error while loading workstream data",
        currentIssuesLoading: false,
        progressStatus: "Network error",
        progressDetails: undefined,
        currentStep: undefined,
      }));
    }
  };

  const findIssueInCurrentData = (
    issueKey: string
  ): JiraIssueWithAggregated | null => {
    for (const issue of state.currentIssues) {
      if (issue.key === issueKey) {
        return issue;
      }
    }
    return null;
  };

  const handleIssueClick = (issue: JiraIssueWithAggregated) => {
    if (issue.childCount === 0) {
      return;
    }

    console.log(
      `\n=== FRONTEND: Clicking on issue ${issue.key} (using existing data) ===`
    );
    console.log(`Issue: ${issue.key} - ${issue.summary} (${issue.type})`);
    console.log(`Child count: ${issue.childCount}`);

    const issueWithChildren = findIssueInCurrentData(issue.key);

    if (
      issueWithChildren &&
      issueWithChildren.children &&
      issueWithChildren.children.length > 0
    ) {
      console.log(
        `Found children for issue ${issue.key} in existing data:`,
        issueWithChildren.children
      );

      const processedChildren = issueWithChildren.children.map((child) => {
        const aggregatedValues = calculateAggregatedValues(child);
        return {
          ...child,
          aggregatedOriginalEstimate:
            aggregatedValues.aggregatedOriginalEstimate,
          aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
          aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
        };
      });

      const newNavigationItem = {
        type: "issue" as const,
        key: issue.key,
        name: issue.summary,
        data: processedChildren,
      };

      console.log(`Adding issue to navigation stack:`, newNavigationItem);

      setState((prevState) => ({
        ...prevState,
        navigationStack: [...prevState.navigationStack, newNavigationItem],
        currentIssues: processedChildren,
        currentIssuesLoading: false,
        currentIssuesError: null,
      }));

      // Automatically trigger orphan detection for workstreams
      if (issue.type === "Workstream" || issue.type === "Epic") {
        console.log(`Auto-triggering orphan detection for ${issue.key}`);
        requestOrphanDetection(issue.key);
      }

      console.log(
        `=== FRONTEND: Issue navigation complete for ${issue.key} (using existing data) ===\n`
      );
    } else {
      console.log(`No children found for issue ${issue.key} in existing data`);
    }
  };

  const handleBackToProjects = () => {
    setState((prevState) => ({
      ...prevState,
      selectedProject: null,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      navigationStack: [],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
      loadedWorkstreamData: new Map(),
      projectAggregatedData: null,
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
    }));
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      handleBackToProjects();
      return;
    }

    if (index === 0) {
      // When going back to workstreams level, ensure loadedWorkstreamData is populated
      console.log(
        "handleBreadcrumbClick: Going back to workstreams level, repopulating loadedWorkstreamData"
      );

      // Start with existing loadedWorkstreamData to preserve individual workstream data
      const newLoadedWorkstreamData = new Map(state.loadedWorkstreamData);

      // Add aggregated values from projectIssues if they exist
      state.projectIssues.forEach((workstream) => {
        if (
          workstream.aggregatedOriginalEstimate !== undefined &&
          workstream.aggregatedTimeSpent !== undefined &&
          workstream.aggregatedTimeRemaining !== undefined
        ) {
          newLoadedWorkstreamData.set(workstream.key, {
            aggregatedOriginalEstimate: workstream.aggregatedOriginalEstimate,
            aggregatedTimeSpent: workstream.aggregatedTimeSpent,
            aggregatedTimeRemaining: workstream.aggregatedTimeRemaining,
            hasData: workstream.children && workstream.children.length > 0,
          });
        } else if (
          workstream.hasChildren !== null &&
          workstream.hasChildren !== undefined
        ) {
          // Include workstreams where we know their children status
          newLoadedWorkstreamData.set(workstream.key, {
            aggregatedOriginalEstimate: 0,
            aggregatedTimeSpent: 0,
            aggregatedTimeRemaining: 0,
            hasData: workstream.hasChildren,
          });
        }
      });

      console.log("handleBreadcrumbClick: Repopulated loadedWorkstreamData:", {
        existingLoadedWorkstreamDataSize: state.loadedWorkstreamData.size,
        projectIssuesWithAggregatedValues: state.projectIssues.filter(
          (w) => w.aggregatedOriginalEstimate !== undefined
        ).length,
        newLoadedWorkstreamDataSize: newLoadedWorkstreamData.size,
        newLoadedWorkstreamDataKeys: Array.from(newLoadedWorkstreamData.keys()),
        preservedIndividualWorkstreamData: Array.from(
          state.loadedWorkstreamData.keys()
        ).filter(
          (key) =>
            !state.projectIssues.some(
              (w) => w.key === key && w.aggregatedOriginalEstimate !== undefined
            )
        ),
      });

      setState((prevState) => ({
        ...prevState,
        navigationStack: [prevState.navigationStack[0]],
        currentIssues: [],
        currentIssuesLoading: false,
        currentIssuesError: null,
        loadedWorkstreamData: newLoadedWorkstreamData,
        projectAggregatedData: calculateProjectAggregatedData(
          prevState.projectIssues,
          newLoadedWorkstreamData
        ),
        progressStatus: "Idle",
        progressDetails: undefined,
        currentStep: undefined,
      }));
      return;
    }

    const targetStack = state.navigationStack.slice(0, index + 1);
    const targetItem = targetStack[targetStack.length - 1];

    setState((prevState) => {
      return {
        ...prevState,
        navigationStack: targetStack,
        currentIssues: targetItem.data,
        currentIssuesLoading: false,
        currentIssuesError: null,
        progressStatus: "Idle",
        progressDetails: undefined,
        currentStep: undefined,
      };
    });
  };

  const showRequestAllModal = () => {
    setState((prevState) => ({
      ...prevState,
      isRequestAllModalVisible: true,
      requestAllProgress: 0,
      requestAllDetails: undefined,
    }));
  };

  const hideRequestAllModal = () => {
    setState((prevState) => ({
      ...prevState,
      isRequestAllModalVisible: false,
      requestAllProgress: 0,
      requestAllDetails: undefined,
    }));
  };

  const requestAllWorkstreams = async () => {
    if (!state.selectedProject || state.projectIssues.length === 0) {
      return;
    }

    const totalWorkstreams = state.projectIssues.length;
    let completed = 0;

    setState((prevState) => ({
      ...prevState,
      requestAllProgress: 0,
      requestAllDetails: {
        currentLevel: 1,
        totalLevels: 1,
        currentPhase: "Requesting workstreams",
        phaseProgress: 0,
        phaseTotal: totalWorkstreams,
      },
    }));

    try {
      for (let i = 0; i < totalWorkstreams; i++) {
        const workstream = state.projectIssues[i];

        setState((prevState) => ({
          ...prevState,
          requestAllProgress: Math.round(((i + 1) / totalWorkstreams) * 100),
          requestAllDetails: prevState.requestAllDetails
            ? {
                ...prevState.requestAllDetails,
                currentPhase: `Requesting: ${workstream.key} - ${workstream.summary}`,
                phaseProgress: i + 1,
                phaseTotal: totalWorkstreams,
              }
            : undefined,
        }));

        try {
          const eventSource = new EventSource(
            `/api/jiraReport/workstream/${workstream.key}/workstream`
          );

          await new Promise<void>((resolve, reject) => {
            eventSource.onmessage = (event) => {
              const response = JSON.parse(event.data);

              if (response.status === "complete" && response.data) {
                const workstreamWithIssues: LiteJiraIssue = JSON.parse(
                  response.data
                );

                const aggregatedValues =
                  calculateAggregatedValues(workstreamWithIssues);

                setState((prevState) => {
                  const newLoadedWorkstreamData = new Map(
                    prevState.loadedWorkstreamData
                  ).set(workstream.key, aggregatedValues);

                  // Update projectIssues with the new aggregated values and children for this workstream
                  const updatedProjectIssues = prevState.projectIssues.map(
                    (ws) => {
                      if (ws.key === workstream.key) {
                        return {
                          ...ws,
                          ...workstreamWithIssues, // Include all properties including children
                          aggregatedOriginalEstimate:
                            aggregatedValues.aggregatedOriginalEstimate,
                          aggregatedTimeSpent:
                            aggregatedValues.aggregatedTimeSpent,
                          aggregatedTimeRemaining:
                            aggregatedValues.aggregatedTimeRemaining,
                          hasBeenRequested: true,
                          hasData: workstreamWithIssues.children.length > 0,
                          hasChildren: workstreamWithIssues.children.length > 0,
                        };
                      }
                      return ws;
                    }
                  );

                  return {
                    ...prevState,
                    projectIssues: updatedProjectIssues,
                    loadedWorkstreamData: newLoadedWorkstreamData,
                  };
                });

                eventSource.close();
                resolve();
              } else if (response.status === "error") {
                eventSource.close();
                reject(
                  new Error(response.message || "Failed to load workstream")
                );
              }
            };

            eventSource.onerror = () => {
              eventSource.close();
              reject(new Error("EventSource error"));
            };

            setTimeout(() => {
              eventSource.close();
              reject(new Error("Request timeout"));
            }, 300000);
          });

          completed++;
        } catch (error) {
          console.error(`Failed to load workstream ${workstream.key}:`, error);
        }
      }

      setState((prevState) => ({
        ...prevState,
        requestAllProgress: 100,
        requestAllDetails: {
          currentLevel: 1,
          totalLevels: 1,
          currentPhase: "Complete",
          phaseProgress: totalWorkstreams,
          phaseTotal: totalWorkstreams,
        },
      }));

      // Calculate project-level aggregation after all workstreams are loaded
      setState((prevState) => {
        const projectAggregatedData = calculateProjectAggregatedData(
          prevState.projectIssues,
          prevState.loadedWorkstreamData
        );
        return {
          ...prevState,
          projectAggregatedData,
        };
      });

      setTimeout(() => {
        hideRequestAllModal();
      }, 2000);
    } catch (error) {
      console.error("Error in requestAllWorkstreams:", error);
      setState((prevState) => ({
        ...prevState,
        requestAllDetails: {
          currentLevel: 1,
          totalLevels: 1,
          currentPhase: "Error occurred",
          phaseProgress: completed,
          phaseTotal: totalWorkstreams,
        },
      }));
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const requestDefectHistory = async (projectKey: string) => {
    setState((prevState) => ({
      ...prevState,
      defectHistoryLoading: true,
      defectHistoryError: null,
    }));

    try {
      // Generate JQL query for incidents and faults
      const query = `project = "${projectKey}" AND type IN (Incident, Fault)`;

      // Use current date as both start and end date - let the CFD manager handle the date logic
      const currentDate = new Date();

      const response = await fetch(
        `/api/cumulativeFlowDiagram?query=${encodeURIComponent(query)}&startDate=${currentDate.toISOString()}&endDate=${currentDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const defectHistoryData = JSON.parse(result.data);

      setState((prevState) => ({
        ...prevState,
        defectHistoryData,
        defectHistoryLoading: false,
        defectHistoryError: null,
      }));
    } catch (error) {
      console.error(
        `Error requesting defect history for ${projectKey}:`,
        error
      );
      setState((prevState) => ({
        ...prevState,
        defectHistoryLoading: false,
        defectHistoryError:
          error instanceof Error
            ? error.message
            : "Failed to load defect history",
      }));
    }
  };

  const requestOrphanDetection = async (workstreamKey: string) => {
    console.log(
      `\n=== FRONTEND: Starting Orphan Detection for ${workstreamKey} ===`
    );

    setState((prevState) => ({
      ...prevState,
      orphanLoading: true,
      orphanError: null,
    }));

    try {
      const response = await fetch(
        `/api/jiraReport/workstream/${workstreamKey}/orphan-detector`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.status === "processing") {
                setState((prevState) => ({
                  ...prevState,
                  progressStatus: data.message || "Processing...",
                  progressDetails: data.progress,
                }));
                console.log(`Progress: ${data.message}`, data.progress);
              } else if (data.status === "complete") {
                const orphanData = JSON.parse(data.data);
                console.log(
                  `\n=== ORPHAN DETECTION RESULTS FOR ${workstreamKey} ===`
                );
                console.log("Raw orphan data:", orphanData);
                console.log("Workstream:", orphanData.workstream);
                console.log(
                  "Linked issues with parents:",
                  orphanData.linkedIssuesWithParents
                );
                console.log(`=== END ORPHAN DETECTION RESULTS ===\n`);

                setState((prevState) => ({
                  ...prevState,
                  orphanData: orphanData,
                  orphanLoading: false,
                  orphanError: null,
                }));
              } else if (data.status === "error") {
                throw new Error(
                  data.message || "Unknown error during orphan detection"
                );
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error in orphan detection for ${workstreamKey}:`, error);
      setState((prevState) => ({
        ...prevState,
        orphanLoading: false,
        orphanError:
          error instanceof Error ? error.message : "Failed to detect orphans",
      }));
    }
  };

  // Function to identify orphans based on the definition
  const getOrphans = useCallback((): Array<{
    key: string;
    summary: string;
    url: string;
  }> => {
    console.log("\n=== ORPHAN ANALYSIS START ===");
    console.log("Orphan data available:", !!state.orphanData);
    console.log(
      "Linked issues count:",
      state.orphanData?.linkedIssuesWithParents?.length || 0
    );

    if (!state.orphanData?.linkedIssuesWithParents) {
      console.log("No orphan data available");
      return [];
    }

    const orphans: Array<{ key: string; summary: string; url: string }> = [];

    // Helper function to check if a key matches the valid parent pattern
    const isValidParentKey = (key: string): boolean => {
      const isHPD = key.startsWith("HPD");
      const isDPattern = /^D[0-9]+.*$/.test(key);
      const isValid = isHPD || isDPattern;
      console.log(
        `  Key "${key}" - HPD: ${isHPD}, D Pattern: ${isDPattern}, Valid: ${isValid}`
      );
      return isValid;
    };

    // Helper function to check if an issue has a valid parent in its chain
    const hasValidParentInChain = (issue: LiteJiraIssue): boolean => {
      console.log(`\nAnalyzing issue: ${issue.key} - ${issue.summary}`);
      console.log(`  Has parent: ${!!issue.parent}`);

      let current = issue.parent;
      let level = 1;
      const parentChain: string[] = [];

      while (current) {
        parentChain.push(current.key);
        console.log(
          `  Level ${level} parent: ${current.key} - ${current.summary}`
        );

        if (isValidParentKey(current.key)) {
          console.log(`  ✓ Found valid parent: ${current.key}`);
          return true;
        }

        current = current.parent;
        level++;

        // Safety check to prevent infinite loops
        if (level > 10) {
          console.log(`  ⚠️ Reached maximum parent level (10), stopping`);
          break;
        }
      }

      console.log(
        `  ✗ No valid parent found in chain: [${parentChain.join(" -> ")}]`
      );
      return false;
    };

    // Filter to only analyze issues that start with "LEN"
    const lenIssues = state.orphanData.linkedIssuesWithParents.filter((issue) =>
      issue.key.startsWith("LEN")
    );

    console.log(
      `\nAnalyzing ${lenIssues.length} LEN issues out of ${state.orphanData.linkedIssuesWithParents.length} total linked issues:`
    );

    for (const linkedIssue of lenIssues) {
      console.log(`\n--- Analyzing ${linkedIssue.key} ---`);

      // First check if the issue itself matches the valid pattern
      if (isValidParentKey(linkedIssue.key)) {
        console.log(
          `  ✓ Issue itself is valid parent (${linkedIssue.key}) - not an orphan`
        );
        continue;
      }

      // Then check if it has a valid parent in its chain
      if (!hasValidParentInChain(linkedIssue)) {
        console.log(`  🚨 ORPHAN FOUND: ${linkedIssue.key}`);
        orphans.push({
          key: linkedIssue.key,
          summary: linkedIssue.summary,
          url: linkedIssue.url,
        });
      } else {
        console.log(`  ✓ Not an orphan: ${linkedIssue.key}`);
      }
    }

    console.log(`\n=== ORPHAN ANALYSIS COMPLETE ===`);
    console.log(`Total orphans found: ${orphans.length}`);
    console.log(`Orphans:`, orphans);
    console.log("=== END ORPHAN ANALYSIS ===\n");

    return orphans;
  }, [state.orphanData]);

  const requestWorkstreamWithTimeSpentDetail = async (
    workstreamKey: string
  ): Promise<void> => {
    console.log(
      `\n=== FRONTEND: Requesting workstream ${workstreamKey} with time spent detail ===`
    );

    setState((prevState) => ({
      ...prevState,
      currentIssuesLoading: true,
      currentIssuesError: null,
      progressStatus: "Fetching time spent detail...",
      progressDetails: undefined,
      currentStep: undefined,
    }));

    try {
      const eventSource = new EventSource(
        `/api/jiraReport/workstream/${workstreamKey}/workstream?withTimeSpentDetail=true`
      );

      await new Promise<void>((resolve, reject) => {
        eventSource.onmessage = (event) => {
          const response = JSON.parse(event.data);

          if (response.status === "processing") {
            setState((prevState) => ({
              ...prevState,
              progressStatus: response.message || "Processing...",
              progressDetails: response.progress,
              currentStep: response.step,
            }));
          } else if (response.status === "complete" && response.data) {
            const workstreamWithIssues: LiteJiraIssue = JSON.parse(
              response.data
            );

            console.log(
              `\n=== FRONTEND: Received workstream data with time spent detail for ${workstreamKey} ===`
            );

            // Recursively update all issues in the navigation stack and projectIssues
            // This function takes a tree structure and updates all matching issues
            const updateIssueWithTimeSpentDetail = (
              issues: JiraIssueWithAggregated[],
              updatedTree: LiteJiraIssue
            ): JiraIssueWithAggregated[] => {
              // Create a map of all issues in the updated tree for quick lookup
              const issueMap = new Map<string, LiteJiraIssue>();
              const buildMap = (issue: LiteJiraIssue) => {
                issueMap.set(issue.key, issue);
                if (issue.children && issue.children.length > 0) {
                  issue.children.forEach(buildMap);
                }
              };
              buildMap(updatedTree);

              console.log("updateIssueWithTimeSpentDetail:", {
                issuesCount: issues.length,
                mapSize: issueMap.size,
                sampleIssueKey: issues[0]?.key,
                hasInMap: issues[0] ? issueMap.has(issues[0].key) : false,
              });

              // Now update the issues array using the map
              const updated = issues.map((issue) => {
                const updatedIssue = issueMap.get(issue.key);
                if (updatedIssue) {
                  // Found a match, update it with timeSpentDetail
                  const result = {
                    ...issue,
                    timeSpentDetail: updatedIssue.timeSpentDetail,
                    children:
                      issue.children && issue.children.length > 0
                        ? updateIssueWithTimeSpentDetail(
                            issue.children,
                            updatedTree
                          )
                        : updatedIssue.children || [],
                  };
                  console.log(
                    `Updated issue ${issue.key} with timeSpentDetail:`,
                    {
                      hasTimeSpentDetail: !!result.timeSpentDetail,
                      timeSpentDetailLength:
                        result.timeSpentDetail?.length || 0,
                    }
                  );
                  return result;
                }
                // No match found, but still recursively check children
                if (issue.children && issue.children.length > 0) {
                  return {
                    ...issue,
                    children: updateIssueWithTimeSpentDetail(
                      issue.children,
                      updatedTree
                    ),
                  };
                }
                return issue;
              });
              return updated;
            };

            setState((prevState) => {
              // Update projectIssues
              const updatedProjectIssues = updateIssueWithTimeSpentDetail(
                prevState.projectIssues,
                workstreamWithIssues
              );

              // Update currentIssues if we're viewing this workstream
              // When viewing inside a workstream, currentIssues contains the children
              // So we need to update them from workstreamWithIssues.children
              let updatedCurrentIssues = prevState.currentIssues;
              if (
                prevState.navigationStack.length > 0 &&
                prevState.navigationStack[prevState.navigationStack.length - 1]
                  .key === workstreamKey
              ) {
                // If we're viewing the workstream itself, currentIssues should be the children
                // So we update from workstreamWithIssues.children
                if (
                  workstreamWithIssues.children &&
                  workstreamWithIssues.children.length > 0
                ) {
                  updatedCurrentIssues = updateIssueWithTimeSpentDetail(
                    prevState.currentIssues,
                    workstreamWithIssues
                  );
                } else {
                  // No children, but still update if there's a direct match
                  updatedCurrentIssues = updateIssueWithTimeSpentDetail(
                    prevState.currentIssues,
                    workstreamWithIssues
                  );
                }
              }

              // Update navigation stack data
              const updatedNavigationStack = prevState.navigationStack.map(
                (item) => {
                  if (item.key === workstreamKey) {
                    const updatedData = updateIssueWithTimeSpentDetail(
                      item.data,
                      workstreamWithIssues
                    );
                    return {
                      ...item,
                      data: updatedData,
                    };
                  }
                  return item;
                }
              );

              return {
                ...prevState,
                projectIssues: updatedProjectIssues,
                currentIssues: updatedCurrentIssues,
                navigationStack: updatedNavigationStack,
                currentIssuesLoading: false,
                progressStatus: "Idle",
                progressDetails: undefined,
                currentStep: undefined,
              };
            });

            eventSource.close();
            resolve();
          } else if (response.status === "error") {
            eventSource.close();
            reject(new Error(response.message || "Failed to load workstream"));
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error("EventSource error"));
        };

        setTimeout(() => {
          eventSource.close();
          reject(new Error("Request timeout"));
        }, 600000); // 10 minutes timeout for time spent detail
      });
    } catch (error) {
      console.error(
        `Error requesting workstream ${workstreamKey} with time spent detail:`,
        error
      );
      setState((prevState) => ({
        ...prevState,
        currentIssuesLoading: false,
        currentIssuesError:
          error instanceof Error ? error.message : String(error),
        progressStatus: "Idle",
        progressDetails: undefined,
        currentStep: undefined,
      }));
      throw error;
    }
  };

  return {
    state,
    getWorkstreamDataCellSpan,
    toggleFavorite,
    getSortedProjects,
    getSortedItems,
    getOptimalPageSize,
    loadProjects,
    clearCacheAndReload,
    loadProjectWorkstreams,
    handleProjectClick,
    handleWorkstreamClick,
    handleIssueClick,
    handleBackToProjects,
    handleBreadcrumbClick,
    showRequestAllModal,
    hideRequestAllModal,
    requestAllWorkstreams,
    requestDefectHistory,
    requestOrphanDetection,
    getOrphans,
    requestWorkstreamWithTimeSpentDetail,
  };
};
