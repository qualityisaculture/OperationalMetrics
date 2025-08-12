import React from "react";
import {
  Table,
  Card,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Tag,
  Breadcrumb,
  Tooltip,
} from "antd";
import { LoadingIndicator } from "./components";
import {
  JiraProject,
  JiraIssue,
} from "../server/graphManagers/JiraReportGraphManager";
import {
  ReloadOutlined,
  ProjectOutlined,
  InfoCircleOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  StarFilled,
  HomeOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

// Extended interface for JiraIssue with aggregated values
interface JiraIssueWithAggregated extends JiraIssue {
  aggregatedOriginalEstimate?: number;
  aggregatedTimeSpent?: number;
  aggregatedTimeRemaining?: number;
}

interface Props {}

interface State {
  projects: JiraProject[];
  isLoading: boolean;
  error: string | null;
  selectedProject: JiraProject | null;
  projectIssues: JiraIssue[];
  issuesLoading: boolean;
  issuesError: string | null;
  favoriteItems: Set<string>; // Changed from favoriteProjects to favoriteItems
  // New state for recursive navigation
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  currentIssues: JiraIssueWithAggregated[];
  currentIssuesLoading: boolean;
  currentIssuesError: string | null;
  // New state to track loaded workstream aggregated data
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >;
  // New state for progress tracking
  progressStatus: string;
  progressDetails?: {
    currentLevel: number;
    totalLevels: number;
    currentIssues: string[];
    totalIssues: number;
    apiCallsMade: number;
    totalApiCalls: number;
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
  };
  currentStep?: string;
}

// Utility function to recursively calculate aggregated estimates and time spent
const calculateAggregatedValues = (
  issue: JiraIssue
): {
  aggregatedOriginalEstimate: number;
  aggregatedTimeSpent: number;
  aggregatedTimeRemaining: number;
} => {
  let totalOriginalEstimate = issue.originalEstimate ?? 0;
  let totalTimeSpent = issue.timeSpent ?? 0;
  let totalTimeRemaining = issue.timeRemaining ?? 0;

  // Recursively sum up all children's values
  for (const child of issue.children) {
    const childValues = calculateAggregatedValues(child);
    totalOriginalEstimate += childValues.aggregatedOriginalEstimate;
    totalTimeSpent += childValues.aggregatedTimeSpent;
    totalTimeRemaining += childValues.aggregatedTimeRemaining;
  }

  return {
    aggregatedOriginalEstimate: totalOriginalEstimate,
    aggregatedTimeSpent: totalTimeSpent,
    aggregatedTimeRemaining: totalTimeRemaining,
  };
};

// Utility function to process workstream data and add aggregated values to Items
const processWorkstreamData = (
  workstreamData: JiraIssue
): JiraIssueWithAggregated => {
  const aggregatedValues = calculateAggregatedValues(workstreamData);
  return {
    ...workstreamData,
    aggregatedOriginalEstimate: aggregatedValues.aggregatedOriginalEstimate,
    aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
    aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
  };
};

export default class JiraReport extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      projects: [],
      isLoading: false,
      error: null,
      selectedProject: null,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      favoriteItems: new Set(this.loadFavoritesFromStorage()),
      // New state for recursive navigation
      navigationStack: [],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
      // New state to track loaded workstream aggregated data
      loadedWorkstreamData: new Map(),
      // New state for progress tracking
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
    };
  }

  // Helper method to determine cell spanning for workstream data columns
  private getWorkstreamDataCellSpan = (
    record: JiraIssueWithAggregated,
    isFirstColumn: boolean = false
  ) => {
    // At Project Workstreams level, check if we have no data
    if (this.state.navigationStack.length === 1) {
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
          // Span across all 6 columns (Baseline Estimate, Actual Days Logged, Estimate to Complete, Total Forecast, Variance Days, Variance %)
          return { colSpan: 6 };
        } else {
          // Hide this column when the first column spans across
          return { colSpan: 0 };
        }
      }
    }
    return {};
  };

  componentDidMount() {
    this.loadProjects();
  }

  loadFavoritesFromStorage = (): string[] => {
    try {
      const favorites = localStorage.getItem("jiraReport_favoriteItems");
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      return [];
    }
  };

  saveFavoritesToStorage = (favorites: string[]) => {
    try {
      localStorage.setItem(
        "jiraReport_favoriteItems",
        JSON.stringify(favorites)
      );
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  };

  toggleFavorite = (itemKey: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking star

    this.setState((prevState) => {
      const newFavorites = new Set(prevState.favoriteItems);

      if (newFavorites.has(itemKey)) {
        newFavorites.delete(itemKey);
      } else {
        newFavorites.add(itemKey);
      }

      // Save to localStorage
      this.saveFavoritesToStorage(Array.from(newFavorites));

      return { favoriteItems: newFavorites };
    });
  };

  getSortedProjects = () => {
    const { projects, favoriteItems } = this.state;

    // Create two arrays: favorites and non-favorites
    const favoriteProjectsList = projects.filter((project) =>
      favoriteItems.has(project.key)
    );
    const nonFavoriteProjectsList = projects.filter(
      (project) => !favoriteItems.has(project.key)
    );

    // Sort each group by project key
    favoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    nonFavoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));

    // Return favorites first, then non-favorites
    return [...favoriteProjectsList, ...nonFavoriteProjectsList];
  };

  // Generic sorting function that works for any items (projects or issues)
  getSortedItems = <T extends { key: string }>(items: T[]): T[] => {
    const { favoriteItems } = this.state;

    // Create two arrays: favorites and non-favorites
    const favoriteItemsList = items.filter((item) =>
      favoriteItems.has(item.key)
    );
    const nonFavoriteItemsList = items.filter(
      (item) => !favoriteItems.has(item.key)
    );

    // Sort each group by key
    favoriteItemsList.sort((a, b) => a.key.localeCompare(b.key));
    nonFavoriteItemsList.sort((a, b) => a.key.localeCompare(b.key));

    // Return favorites first, then non-favorites
    return [...favoriteItemsList, ...nonFavoriteItemsList];
  };

  getOptimalPageSize = () => {
    const { favoriteItems } = this.state;
    const favoriteCount = favoriteItems.size;

    // If there are favorites, ensure they all fit on the first page
    if (favoriteCount > 0) {
      return Math.max(10, favoriteCount + 5); // Show all favorites plus some extra
    }

    return 10; // Default page size
  };

  loadProjects = async () => {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/jiraReport/projects");
      const data = await response.json();

      if (response.ok) {
        const projects: JiraProject[] = JSON.parse(data.data);
        this.setState({ projects, isLoading: false });
      } else {
        this.setState({
          error: data.message || "Failed to load projects",
          isLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        error: "Network error while loading projects",
        isLoading: false,
      });
    }
  };

  loadProjectWorkstreams = async (projectKey: string) => {
    this.setState({ issuesLoading: true, issuesError: null });

    try {
      const response = await fetch(
        `/api/jiraReport/project/${projectKey}/workstreams`
      );
      const data = await response.json();

      if (response.ok) {
        const workstreams: JiraIssue[] = JSON.parse(data.data);
        this.setState({
          projectIssues: workstreams,
          issuesLoading: false,
          currentIssues: [], // Initialize as empty, will be set when navigating
        });
      } else {
        this.setState({
          issuesError: data.message || "Failed to load project workstreams",
          issuesLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        issuesError: "Network error while loading project workstreams",
        issuesLoading: false,
      });
    }
  };

  handleProjectClick = async (project: JiraProject) => {
    this.setState({
      selectedProject: project,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      // Initialize navigation stack with project
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
    });

    // Load the project workstreams
    await this.loadProjectWorkstreams(project.key);
  };

  // Simplified method to handle workstream click for navigation
  handleWorkstreamClick = async (workstream: JiraIssue) => {
    console.log(`\n=== FRONTEND: Clicking on workstream ${workstream.key} ===`);
    console.log(
      `Workstream: ${workstream.key} - ${workstream.summary} (${workstream.type})`
    );

    this.setState({
      currentIssuesLoading: true,
      currentIssuesError: null,
      progressStatus: "Starting to fetch workstream data...",
      progressDetails: undefined,
      currentStep: undefined,
    });

    try {
      // Use SSE to get real-time progress updates
      const eventSource = new EventSource(
        `/api/jiraReport/workstream/${workstream.key}/workstream`
      );

      eventSource.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.status === "processing") {
          this.setState({
            progressStatus: response.message || "Processing...",
            progressDetails: response.progress,
            currentStep: response.step,
          });
        } else if (response.status === "complete" && response.data) {
          const workstreamWithIssues: JiraIssue = JSON.parse(response.data);

          console.log(
            `\n=== FRONTEND: Received workstream data for ${workstream.key} ===`
          );
          console.log("Complete workstream tree:", workstreamWithIssues);

          // Check if the workstream has children
          if (workstreamWithIssues.children.length === 0) {
            console.log(
              `Workstream ${workstream.key} has no children, not navigating`
            );
            this.setState({
              currentIssuesLoading: false,
              progressStatus: "Idle",
              progressDetails: undefined,
              currentStep: undefined,
            });
            eventSource.close();
            return;
          }

          // Process the workstream data to add aggregated values to Items
          const processedWorkstreamData =
            processWorkstreamData(workstreamWithIssues);

          console.log(
            `\n=== FRONTEND: Processed workstream data with aggregated values ===`
          );
          console.log("Processed workstream tree:", processedWorkstreamData);

          // Store the aggregated workstream data for future display
          const workstreamAggregatedData = {
            aggregatedOriginalEstimate:
              processedWorkstreamData.aggregatedOriginalEstimate ?? 0,
            aggregatedTimeSpent:
              processedWorkstreamData.aggregatedTimeSpent ?? 0,
            aggregatedTimeRemaining:
              processedWorkstreamData.aggregatedTimeRemaining ?? 0,
          };

          // Process each child (Item) to add aggregated values
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

          // Add to navigation stack with the processed issues from the workstream
          const newNavigationItem = {
            type: "issue" as const,
            key: workstream.key,
            name: workstream.summary,
            data: processedChildren, // All issues in the workstream with aggregated values
          };

          console.log(
            `Adding workstream to navigation stack:`,
            newNavigationItem
          );

          this.setState((prevState) => ({
            navigationStack: [...prevState.navigationStack, newNavigationItem],
            currentIssues: processedChildren,
            currentIssuesLoading: false,
            // Store the aggregated workstream data
            loadedWorkstreamData: new Map(prevState.loadedWorkstreamData).set(
              workstream.key,
              workstreamAggregatedData
            ),
            // Reset progress tracking
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
          this.setState({
            currentIssuesError:
              response.message || "Failed to load workstream data",
            currentIssuesLoading: false,
            progressStatus: "Error occurred",
            progressDetails: undefined,
            currentStep: undefined,
          });
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        console.error(
          `FRONTEND: SSE connection error for workstream ${workstream.key}`
        );
        this.setState({
          currentIssuesError: "Connection error while loading workstream data",
          currentIssuesLoading: false,
          progressStatus: "Connection error",
          progressDetails: undefined,
          currentStep: undefined,
        });
        eventSource.close();
      };
    } catch (error) {
      console.error(
        `FRONTEND: Network error for workstream ${workstream.key}:`,
        error
      );
      this.setState({
        currentIssuesError: "Network error while loading workstream data",
        currentIssuesLoading: false,
        progressStatus: "Network error",
        progressDetails: undefined,
        currentStep: undefined,
      });
    }
  };

  // Handle issue clicks by navigating through existing tree data (no API calls)
  handleIssueClick = (issue: JiraIssueWithAggregated) => {
    // Only navigate if the issue has children
    if (issue.childCount === 0) {
      return; // No children, don't navigate
    }

    console.log(
      `\n=== FRONTEND: Clicking on issue ${issue.key} (using existing data) ===`
    );
    console.log(`Issue: ${issue.key} - ${issue.summary} (${issue.type})`);
    console.log(`Child count: ${issue.childCount}`);

    // Find the issue in the current level's data to get its children
    const issueWithChildren = this.findIssueInCurrentData(issue.key);

    if (
      issueWithChildren &&
      issueWithChildren.children &&
      issueWithChildren.children.length > 0
    ) {
      console.log(
        `Found children for issue ${issue.key} in existing data:`,
        issueWithChildren.children
      );

      // Process each child to add aggregated values
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

      // Add to navigation stack with the children from the existing data
      const newNavigationItem = {
        type: "issue" as const,
        key: issue.key,
        name: issue.summary,
        data: processedChildren,
      };

      console.log(`Adding issue to navigation stack:`, newNavigationItem);

      this.setState((prevState) => ({
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

  // Helper method to find an issue in the current data
  private findIssueInCurrentData(
    issueKey: string
  ): JiraIssueWithAggregated | null {
    for (const issue of this.state.currentIssues) {
      if (issue.key === issueKey) {
        return issue;
      }
    }
    return null;
  }

  handleBackToProjects = () => {
    this.setState({
      selectedProject: null,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
      navigationStack: [],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
      // Reset progress tracking
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
    });
  };

  // New method to handle breadcrumb navigation
  handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Home clicked - go back to projects
      this.handleBackToProjects();
      return;
    }

    if (index === 0) {
      // Project level clicked - show project issues
      this.setState((prevState) => ({
        navigationStack: [prevState.navigationStack[0]],
        currentIssues: [], // Reset to empty, will be populated when navigating to workstreams
        currentIssuesLoading: false,
        currentIssuesError: null,
        // Reset progress tracking
        progressStatus: "Idle",
        progressDetails: undefined,
        currentStep: undefined,
      }));
      return;
    }

    // Navigate to specific level
    const targetStack = this.state.navigationStack.slice(0, index + 1);
    const targetItem = targetStack[targetStack.length - 1];

    this.setState({
      navigationStack: targetStack,
      currentIssues: targetItem.data,
      currentIssuesLoading: false,
      currentIssuesError: null,
      // Reset progress tracking
      progressStatus: "Idle",
      progressDetails: undefined,
      currentStep: undefined,
    });
  };

  render() {
    const {
      projects,
      isLoading,
      error,
      selectedProject,
      projectIssues,
      issuesLoading,
      issuesError,
      favoriteItems,
      navigationStack,
      currentIssues,
      currentIssuesLoading,
      currentIssuesError,
    } = this.state;

    const sortedProjects = this.getSortedProjects();

    const projectColumns: ColumnsType<JiraProject> = [
      {
        title: "Favorite",
        key: "favorite",
        width: 60,
        render: (_, record) => (
          <Button
            type="text"
            icon={
              favoriteItems.has(record.key) ? (
                <StarFilled style={{ color: "#faad14" }} />
              ) : (
                <StarOutlined />
              )
            }
            onClick={(e) => this.toggleFavorite(record.key, e)}
            style={{ padding: 0, border: "none" }}
          />
        ),
      },
      {
        title: "Project Key",
        dataIndex: "key",
        key: "key",
        render: (key: string) => <Tag color="green">{key}</Tag>,
        sorter: (a, b) => a.key.localeCompare(b.key),
      },
      {
        title: "Project Name",
        dataIndex: "name",
        key: "name",
        render: (name: string) => <Text strong>{name}</Text>,
        sorter: (a, b) => a.name.localeCompare(b.name),
        onFilter: (value, record) =>
          record.name.toLowerCase().includes((value as string).toLowerCase()),
        filterSearch: true,
        filters: projects.map((project) => ({
          text: project.name,
          value: project.name,
        })),
      },
      {
        title: "Project ID",
        dataIndex: "id",
        key: "id",
        render: (id: string) => <Tag color="blue">{id}</Tag>,
        sorter: (a, b) => a.id.localeCompare(b.id),
      },
    ];

    const issueColumns: ColumnsType<JiraIssueWithAggregated> = [
      {
        title: "Favorite",
        key: "favorite",
        width: 60,
        render: (_, record) => (
          <Button
            type="text"
            icon={
              favoriteItems.has(record.key) ? (
                <StarFilled style={{ color: "#faad14" }} />
              ) : (
                <StarOutlined />
              )
            }
            onClick={(e) => this.toggleFavorite(record.key, e)}
            style={{ padding: 0, border: "none" }}
          />
        ),
      },
      {
        title: "Issue Key",
        dataIndex: "key",
        key: "key",
        render: (key: string, record: JiraIssueWithAggregated) => (
          <a
            href={`https://lendscape.atlassian.net/browse/${key}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking link
            style={{ fontWeight: "bold", color: "#1890ff" }}
          >
            <Tag color="orange">{key}</Tag>
          </a>
        ),
        sorter: (a, b) => a.key.localeCompare(b.key),
        onFilter: (value, record) =>
          record.key.toLowerCase().includes((value as string).toLowerCase()),
        filterSearch: true,
        filters: (() => {
          // Get unique issue keys from the current data
          const currentData =
            navigationStack.length > 1 ? currentIssues : projectIssues;
          const uniqueKeys = [
            ...new Set(currentData.map((issue) => issue.key)),
          ].sort();
          return uniqueKeys.map((key) => ({ text: key, value: key }));
        })(),
      },
      {
        title: "Issue Type",
        dataIndex: "type",
        key: "type",
        defaultSortOrder:
          this.state.navigationStack.length === 1 ? "descend" : undefined,
        render: (type: string, record: JiraIssueWithAggregated) => {
          // Only apply special styling at the project workstreams level (navigationStack.length === 1)
          if (this.state.navigationStack.length === 1) {
            const isWorkstream = type.toLowerCase().includes("workstream");

            if (isWorkstream) {
              return <Tag color="blue">{type}</Tag>;
            } else {
              return (
                <Tooltip
                  title="Only issues of type 'Workstream' should be at this level of the Project. You should probably move this issue inside an existing Workstream."
                  placement="top"
                >
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>
                    {type}
                  </Tag>
                </Tooltip>
              );
            }
          }

          // At other levels, show normal blue tags
          return <Tag color="blue">{type}</Tag>;
        },
        sorter: (a, b) => a.type.localeCompare(b.type),
        filters: (() => {
          // Get unique issue types from the current data
          const currentData =
            navigationStack.length > 1 ? currentIssues : projectIssues;
          const uniqueTypes = [
            ...new Set(currentData.map((issue) => issue.type)),
          ].sort();
          return uniqueTypes.map((type) => ({ text: type, value: type }));
        })(),
        onFilter: (value, record) => record.type === value,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status: string) => {
          // Handle undefined or empty status
          if (!status || status === "Unknown") {
            return <Tag color="default">Unknown</Tag>;
          }

          // Define color mapping for different statuses
          const getStatusColor = (status: string) => {
            const statusLower = status.toLowerCase();
            if (
              statusLower.includes("done") ||
              statusLower.includes("closed") ||
              statusLower.includes("resolved")
            ) {
              return "green";
            } else if (
              statusLower.includes("in progress") ||
              statusLower.includes("development")
            ) {
              return "blue";
            } else if (
              statusLower.includes("review") ||
              statusLower.includes("testing")
            ) {
              return "purple";
            } else if (
              statusLower.includes("blocked") ||
              statusLower.includes("on hold")
            ) {
              return "red";
            } else if (
              statusLower.includes("backlog") ||
              statusLower.includes("to do")
            ) {
              return "default";
            } else {
              return "orange";
            }
          };

          return <Tag color={getStatusColor(status)}>{status}</Tag>;
        },
        sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
        filters: (() => {
          // Get unique statuses from the current data
          const uniqueStatuses = [
            ...new Set(
              projectIssues.map((issue) => issue.status).filter(Boolean)
            ),
          ].sort();
          return uniqueStatuses.map((status) => ({
            text: status,
            value: status,
          }));
        })(),
        onFilter: (value, record) => record.status === value,
      },
      {
        title: "Summary",
        dataIndex: "summary",
        key: "summary",
        render: (summary: string) => <Text>{summary}</Text>,
        sorter: (a, b) => a.summary.localeCompare(b.summary),
      },
      // Only show Children column when not viewing workstreams (when we have child count data)
      ...(navigationStack.length > 1
        ? [
            {
              title: "Children",
              dataIndex: "childCount",
              key: "children",
              render: (childCount: number) => (
                <Text>
                  {childCount > 0 ? (
                    <Tag color="purple">{childCount}</Tag>
                  ) : (
                    <Text type="secondary">0</Text>
                  )}
                </Text>
              ),
              sorter: (a, b) => a.childCount - b.childCount,
            },
          ]
        : []),
      {
        title: "Baseline Estimate",
        dataIndex: "originalEstimate",
        key: "originalEstimate",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, true),
        render: (
          estimate: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          // Show aggregated values if available (either for workstreams or items)
          const hasAggregatedData =
            record.aggregatedOriginalEstimate !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedOriginalEstimate
            : estimate;

          // At Project Workstreams level, show message if no data
          if (
            this.state.navigationStack.length === 1 &&
            (valueToShow === null ||
              valueToShow === undefined ||
              valueToShow === 0)
          ) {
            return (
              <Text
                type="secondary"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                Click to request data for this workstream
              </Text>
            );
          }

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="green">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aValue =
            a.aggregatedOriginalEstimate !== undefined
              ? a.aggregatedOriginalEstimate
              : a.originalEstimate || 0;
          const bValue =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          return aValue - bValue;
        },
      },
      {
        title: "Actual Days Logged",
        dataIndex: "timeSpent",
        key: "timeSpent",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, false),
        render: (
          timeSpent: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          // Show aggregated values if available (either for workstreams or items)
          const hasAggregatedData = record.aggregatedTimeSpent !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedTimeSpent
            : timeSpent;

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="blue">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aValue =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const bValue =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          return aValue - bValue;
        },
      },
      {
        title: "Estimate to Complete",
        dataIndex: "timeRemaining",
        key: "timeRemaining",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, false),
        render: (
          timeRemaining: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          // Show aggregated values if available (either for workstreams or items)
          const hasAggregatedData =
            record.aggregatedTimeRemaining !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedTimeRemaining
            : timeRemaining;

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="red">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aValue =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const bValue =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          return aValue - bValue;
        },
      },
      {
        title: "Total Forecast (Actual + ETC)",
        key: "totalForecast",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          // Show aggregated values if available (either for workstreams or items)
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;

          return (
            <Text>
              {totalForecast > 0 ? (
                <Tag color="purple">
                  {totalForecast.toFixed(1)} days
                  {(record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aTotal = aTimeSpent + aTimeRemaining;

          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bTotal = bTimeSpent + bTimeRemaining;

          return aTotal - bTotal;
        },
      },
      {
        title: "Variance (Days)",
        key: "varianceDays",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          // Show aggregated values if available (either for workstreams or items)
          const originalEstimate =
            record.aggregatedOriginalEstimate !== undefined
              ? record.aggregatedOriginalEstimate
              : record.originalEstimate || 0;
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;
          const variance = totalForecast - originalEstimate;

          // Only show variance if we have both estimate and forecast
          if (originalEstimate > 0 || totalForecast > 0) {
            const color =
              variance > 0 ? "red" : variance < 0 ? "green" : "default";
            return (
              <Text>
                <Tag color={color}>
                  {variance > 0 ? "+" : ""}
                  {variance.toFixed(1)} days
                  {(record.aggregatedOriginalEstimate !== undefined ||
                    record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              </Text>
            );
          }

          return <Text type="secondary">-</Text>;
        },
        sorter: (a, b) => {
          const aOriginalEstimate =
            a.aggregatedOriginalEstimate !== undefined
              ? a.aggregatedOriginalEstimate
              : a.originalEstimate || 0;
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aVariance = aTimeSpent + aTimeRemaining - aOriginalEstimate;

          const bOriginalEstimate =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bVariance = bTimeSpent + bTimeRemaining - bOriginalEstimate;

          return aVariance - bVariance;
        },
      },
      {
        title: "Variance (%)",
        key: "variancePercent",
        onCell: (record: JiraIssueWithAggregated) =>
          this.getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          // Show aggregated values if available (either for workstreams or items)
          const originalEstimate =
            record.aggregatedOriginalEstimate !== undefined
              ? record.aggregatedOriginalEstimate
              : record.originalEstimate || 0;
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;
          const variance = totalForecast - originalEstimate;

          // Only show variance percentage if we have an original estimate
          if (originalEstimate > 0) {
            const variancePercent = (variance / originalEstimate) * 100;
            const color =
              variancePercent > 0
                ? "red"
                : variancePercent < 0
                  ? "green"
                  : "default";
            return (
              <Text>
                <Tag color={color}>
                  {variancePercent > 0 ? "+" : ""}
                  {variancePercent.toFixed(1)}%
                  {(record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              </Text>
            );
          }

          return <Text type="secondary">-</Text>;
        },
        sorter: (a, b) => {
          const aOriginalEstimate =
            a.aggregatedOriginalEstimate !== undefined
              ? a.aggregatedOriginalEstimate
              : a.originalEstimate || 0;
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aVariancePercent =
            aOriginalEstimate > 0
              ? ((aTimeSpent + aTimeRemaining - aOriginalEstimate) /
                  aOriginalEstimate) *
                100
              : 0;

          const bOriginalEstimate =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bVariancePercent =
            bOriginalEstimate > 0
              ? ((bTimeSpent + bTimeRemaining - bOriginalEstimate) /
                  bOriginalEstimate) *
                100
              : 0;

          return aVariancePercent - bVariancePercent;
        },
      },
    ];

    if (isLoading) {
      return (
        <LoadingIndicator
          loading={isLoading}
          message="Loading Jira projects..."
          size="large"
          style={{ padding: "50px" }}
          showProgressDetails={false}
        />
      );
    }

    if (error) {
      return (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ margin: "16px" }}
          action={
            <Button size="small" danger onClick={this.loadProjects}>
              Retry
            </Button>
          }
        />
      );
    }

    return (
      <div style={{ padding: "16px" }}>
        <div style={{ marginBottom: "16px" }}>
          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              <ProjectOutlined /> Jira Report
            </Title>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.loadProjects}
              loading={isLoading}
            >
              Refresh
            </Button>
            {favoriteItems.size > 0 && (
              <Text type="secondary">
                <StarFilled style={{ color: "#faad14", marginRight: "4px" }} />
                {favoriteItems.size} favorite
                {favoriteItems.size !== 1 ? "s" : ""}
              </Text>
            )}
          </Space>
        </div>

        {!selectedProject ? (
          // Projects View
          <Card
            title={
              <Space>
                <ProjectOutlined />
                Projects ({projects.length})
                {favoriteItems.size > 0 && (
                  <Text type="secondary">• {favoriteItems.size} starred</Text>
                )}
              </Space>
            }
            extra={
              <Text type="secondary">
                Last updated: {new Date().toLocaleString()}
              </Text>
            }
          >
            <Table
              key={`projects-table-${favoriteItems.size}`} // Force re-render when favorites change
              columns={projectColumns}
              dataSource={sortedProjects}
              rowKey="id"
              pagination={{
                pageSize: this.getOptimalPageSize(),
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} projects`,
                defaultCurrent: 1, // Always start on first page
              }}
              onRow={(record) => ({
                onClick: () => this.handleProjectClick(record),
                style: { cursor: "pointer" },
              })}
            />
          </Card>
        ) : (
          // Project Issues View with Navigation
          <div>
            <div style={{ marginBottom: "16px" }}>
              <Space align="center">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={this.handleBackToProjects}
                  style={{ marginRight: "16px" }}
                >
                  Back to Projects
                </Button>
                <Title level={4} style={{ margin: 0, flex: 1 }}>
                  <ProjectOutlined style={{ marginRight: "8px" }} />
                  {selectedProject.name} ({selectedProject.key}) - Workstreams
                </Title>
                <Button
                  type="text"
                  icon={
                    favoriteItems.has(selectedProject.key) ? (
                      <StarFilled style={{ color: "#faad14" }} />
                    ) : (
                      <StarOutlined />
                    )
                  }
                  onClick={(e) => this.toggleFavorite(selectedProject.key, e)}
                  style={{ padding: 0, border: "none" }}
                >
                  {favoriteItems.has(selectedProject.key) ? "Unstar" : "Star"}{" "}
                  Project
                </Button>
              </Space>
            </div>

            {/* Breadcrumb Navigation */}
            {navigationStack.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <Breadcrumb>
                  <Breadcrumb.Item>
                    <Button
                      type="link"
                      icon={<HomeOutlined />}
                      onClick={() => this.handleBreadcrumbClick(-1)}
                      style={{ padding: 0, height: "auto" }}
                    >
                      Projects
                    </Button>
                  </Breadcrumb.Item>
                  {navigationStack.map((item, index) => (
                    <Breadcrumb.Item key={item.key}>
                      <Button
                        type="link"
                        onClick={() => this.handleBreadcrumbClick(index)}
                        style={{ padding: 0, height: "auto" }}
                      >
                        {item.type === "project" ? (
                          <ProjectOutlined style={{ marginRight: "4px" }} />
                        ) : (
                          <InfoCircleOutlined style={{ marginRight: "4px" }} />
                        )}
                        {item.name}
                      </Button>
                    </Breadcrumb.Item>
                  ))}
                </Breadcrumb>
              </div>
            )}

            {/* Loading State for Issues */}
            <LoadingIndicator
              loading={issuesLoading}
              message="Loading project workstreams..."
              size="large"
              style={{ padding: "50px" }}
              showProgressDetails={false}
            />

            {/* Error State for Issues */}
            {issuesError && (
              <Alert
                message="Error"
                description={issuesError}
                type="error"
                showIcon
                style={{ margin: "16px" }}
                action={
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      this.loadProjectWorkstreams(selectedProject.key)
                    }
                  >
                    Retry
                  </Button>
                }
              />
            )}

            {/* Loading State for Current Issues */}
            <LoadingIndicator
              loading={currentIssuesLoading}
              message={this.state.progressStatus}
              progressDetails={this.state.progressDetails}
              size="default"
            />

            {/* Error State for Current Issues */}
            {currentIssuesError && (
              <Alert
                message="Error"
                description={currentIssuesError}
                type="error"
                showIcon
                style={{ margin: "16px" }}
              />
            )}

            {/* Issues Table */}
            {!issuesLoading && !issuesError && !currentIssuesLoading && (
              <Card
                title={
                  <Space>
                    <InfoCircleOutlined />
                    {navigationStack.length > 1
                      ? `Issues in ${navigationStack[navigationStack.length - 1].name}`
                      : `Project Workstreams (${projectIssues.length})`}
                  </Space>
                }
                extra={
                  <Text type="secondary">
                    Last updated: {new Date().toLocaleString()}
                  </Text>
                }
              >
                <Table
                  key={`issues-table-${favoriteItems.size}-${navigationStack.length}-${this.state.loadedWorkstreamData.size}`} // Force re-render when favorites change or aggregated data is loaded
                  columns={issueColumns}
                  dataSource={
                    navigationStack.length > 1
                      ? this.getSortedItems(currentIssues)
                      : this.getSortedItems(
                          projectIssues.map((issue) => {
                            // Check if we have loaded aggregated data for this workstream
                            const loadedData =
                              this.state.loadedWorkstreamData.get(issue.key);
                            return {
                              ...issue,
                              aggregatedOriginalEstimate:
                                loadedData?.aggregatedOriginalEstimate,
                              aggregatedTimeSpent:
                                loadedData?.aggregatedTimeSpent,
                              aggregatedTimeRemaining:
                                loadedData?.aggregatedTimeRemaining,
                            };
                          })
                        )
                  }
                  rowKey="key"
                  pagination={{
                    pageSize: 50,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} of ${total} ${navigationStack.length > 1 ? "issues" : "workstreams"}`,
                  }}
                  onRow={(record) => ({
                    onClick: () => {
                      // If we're at the project level (showing workstreams), use workstream handler
                      if (this.state.navigationStack.length === 1) {
                        this.handleWorkstreamClick(record);
                      } else {
                        // If we're at the workstream level or deeper (showing issues), use issue handler
                        this.handleIssueClick(
                          record as JiraIssueWithAggregated
                        );
                      }
                    },
                    style: {
                      // For workstreams (navigationStack.length === 1), always show as clickable
                      // For issues (navigationStack.length > 1), only show as clickable if they have children
                      cursor:
                        this.state.navigationStack.length === 1 ||
                        record.childCount > 0
                          ? "pointer"
                          : "default",
                      backgroundColor:
                        this.state.navigationStack.length === 1 ||
                        record.childCount > 0
                          ? "#fafafa"
                          : "transparent",
                    },
                  })}
                />
              </Card>
            )}

            {/* No Issues Found */}
            {!issuesLoading &&
              !issuesError &&
              projectIssues.length === 0 &&
              navigationStack.length === 1 && (
                <Alert
                  message="No Workstreams Found"
                  description="No workstreams were found for this project."
                  type="info"
                  showIcon
                />
              )}

            {/* No Children Found */}
            {!currentIssuesLoading &&
              !currentIssuesError &&
              currentIssues.length === 0 &&
              navigationStack.length > 1 && (
                <Alert
                  message="No Issues Found"
                  description="This workstream has no issues."
                  type="info"
                  showIcon
                />
              )}
          </div>
        )}
      </div>
    );
  }
}
