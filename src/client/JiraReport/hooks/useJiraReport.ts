import { useState, useEffect, useCallback } from "react";
import { JiraProject, JiraIssue } from "../../../server/graphManagers/JiraReportGraphManager";
import { JiraIssueWithAggregated, JiraReportState } from "../types";
import { calculateAggregatedValues, processWorkstreamData } from "../utils";

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
    progressStatus: "Idle",
    progressDetails: undefined,
    currentStep: undefined,
    isRequestAllModalVisible: false,
    requestAllProgress: 0,
    requestAllDetails: undefined,
  });

  const getWorkstreamDataCellSpan = useCallback(
    (record: JiraIssueWithAggregated, isFirstColumn: boolean = false) => {
      if (state.navigationStack.length === 1) {
        const hasAggregatedData = record.aggregatedOriginalEstimate !== undefined;
        const valueToShow = hasAggregatedData
          ? record.aggregatedOriginalEstimate
          : record.originalEstimate;

        if (
          valueToShow === null ||
          valueToShow === undefined ||
          valueToShow === 0
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

  const processCachedWorkstreams = (workstreams: JiraIssue[]) => {
    const processedWorkstreams = workstreams.map((workstream) => {
      if (workstream.children && workstream.children.length > 0) {
        const aggregatedValues = calculateAggregatedValues(workstream);
        return {
          ...workstream,
          aggregatedOriginalEstimate:
            aggregatedValues.aggregatedOriginalEstimate,
          aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
          aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
        };
      }
      return workstream;
    });
    setState((prevState) => ({
      ...prevState,
      projectIssues: processedWorkstreams,
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
        const workstreams: JiraIssue[] = JSON.parse(data.data);
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
    }));
    await loadProjectWorkstreams(project.key);
  };

  const handleWorkstreamClick = async (workstream: JiraIssue) => {
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
          const workstreamWithIssues: JiraIssue = JSON.parse(response.data);

          console.log(
            `\n=== FRONTEND: Received workstream data for ${workstream.key} ===`
          );
          console.log("Complete workstream tree:", workstreamWithIssues);

          if (workstreamWithIssues.children.length === 0) {
            console.log(
              `Workstream ${workstream.key} has no children, not navigating`
            );
            setState((prevState) => ({
              ...prevState,
              currentIssuesLoading: false,
              progressStatus: "Idle",
              progressDetails: undefined,
              currentStep: undefined,
            }));
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

          setState((prevState) => ({
            ...prevState,
            navigationStack: [...prevState.navigationStack, newNavigationItem],
            currentIssues: processedChildren,
            currentIssuesLoading: false,
            loadedWorkstreamData: new Map(prevState.loadedWorkstreamData).set(
              workstream.key,
              workstreamAggregatedData
            ),
            progressStatus: "Idle",
            progressDetails: undefined,
            currentStep: undefined,
          }));

          console.log(
            `=== FRONTEND: Workstream navigation complete for ${workstream.key} ===\n`
          );

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
  }

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
      setState((prevState) => ({
        ...prevState,
        navigationStack: [prevState.navigationStack[0]],
        currentIssues: [],
        currentIssuesLoading: false,
        currentIssuesError: null,
        progressStatus: "Idle",
        progressDetails: undefined,
        currentStep: undefined,
      }));
      return;
    }

    const targetStack = state.navigationStack.slice(0, index + 1);
    const targetItem = targetStack[targetStack.length - 1];

    setState((prevState) => ({
      ...prevState,
      navigationStack: targetStack,
      currentIssues: targetItem.data,
      currentIssuesLoading: false,
      currentIssuesError: null,
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
    }));
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
                const workstreamWithIssues: JiraIssue = JSON.parse(
                  response.data
                );

                const aggregatedValues =
                  calculateAggregatedValues(workstreamWithIssues);
                setState((prevState) => ({
                  ...prevState,
                  loadedWorkstreamData: new Map(
                    prevState.loadedWorkstreamData
                  ).set(workstream.key, aggregatedValues),
                }));

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

  return {
    state,
    getWorkstreamDataCellSpan,
    toggleFavorite,
    getSortedProjects,
    getSortedItems,
    getOptimalPageSize,
    loadProjects,
    handleProjectClick,
    handleWorkstreamClick,
    handleIssueClick,
    handleBackToProjects,
    handleBreadcrumbClick,
    showRequestAllModal,
    hideRequestAllModal,
    requestAllWorkstreams,
  };
};
