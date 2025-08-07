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
} from "antd";
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
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

interface Props {}

interface State {
  projects: JiraProject[];
  isLoading: boolean;
  error: string | null;
  selectedProject: JiraProject | null;
  projectIssues: JiraIssue[];
  issuesLoading: boolean;
  issuesError: string | null;
  favoriteProjects: Set<string>;
  // New state for recursive navigation
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssue[];
  }>;
  currentIssues: JiraIssue[];
  currentIssuesLoading: boolean;
  currentIssuesError: string | null;
}

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
      favoriteProjects: new Set(this.loadFavoritesFromStorage()),
      // New state for recursive navigation
      navigationStack: [],
      currentIssues: [],
      currentIssuesLoading: false,
      currentIssuesError: null,
    };
  }

  componentDidMount() {
    this.loadProjects();
  }

  loadFavoritesFromStorage = (): string[] => {
    try {
      const favorites = localStorage.getItem("jiraReport_favorites");
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      return [];
    }
  };

  saveFavoritesToStorage = (favorites: string[]) => {
    try {
      localStorage.setItem("jiraReport_favorites", JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  };

  toggleFavorite = (projectKey: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click when clicking star

    this.setState((prevState) => {
      const newFavorites = new Set(prevState.favoriteProjects);

      if (newFavorites.has(projectKey)) {
        newFavorites.delete(projectKey);
      } else {
        newFavorites.add(projectKey);
      }

      // Save to localStorage
      this.saveFavoritesToStorage(Array.from(newFavorites));

      return { favoriteProjects: newFavorites };
    });
  };

  getSortedProjects = () => {
    const { projects, favoriteProjects } = this.state;

    // Create two arrays: favorites and non-favorites
    const favoriteProjectsList = projects.filter((project) =>
      favoriteProjects.has(project.key)
    );
    const nonFavoriteProjectsList = projects.filter(
      (project) => !favoriteProjects.has(project.key)
    );

    // Sort each group by project key
    favoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));
    nonFavoriteProjectsList.sort((a, b) => a.key.localeCompare(b.key));

    // Return favorites first, then non-favorites
    return [...favoriteProjectsList, ...nonFavoriteProjectsList];
  };

  getOptimalPageSize = () => {
    const { favoriteProjects } = this.state;
    const favoriteCount = favoriteProjects.size;

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
          currentIssues: workstreams, // Set current issues to workstreams initially
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
    // Only navigate if the workstream has children
    if (workstream.childCount === 0) {
      return; // No children, don't navigate
    }

    console.log(`\n=== FRONTEND: Clicking on workstream ${workstream.key} ===`);
    console.log(
      `Workstream: ${workstream.key} - ${workstream.summary} (${workstream.type})`
    );
    console.log(`Child count: ${workstream.childCount}`);

    this.setState({ currentIssuesLoading: true, currentIssuesError: null });

    try {
      // Get all issues for this workstream (with complete recursive data)
      const response = await fetch(
        `/api/jiraReport/workstream/${workstream.key}/issues`
      );
      const data = await response.json();

      if (response.ok) {
        const workstreamWithIssues: JiraIssue = JSON.parse(data.data);

        console.log(
          `\n=== FRONTEND: Received workstream data for ${workstream.key} ===`
        );
        console.log("Complete workstream tree:", workstreamWithIssues);

        // Add to navigation stack with the issues from the workstream
        const newNavigationItem = {
          type: "issue" as const,
          key: workstream.key,
          name: workstream.summary,
          data: workstreamWithIssues.children, // All issues in the workstream
        };

        console.log(
          `Adding workstream to navigation stack:`,
          newNavigationItem
        );

        this.setState((prevState) => ({
          navigationStack: [...prevState.navigationStack, newNavigationItem],
          currentIssues: workstreamWithIssues.children,
          currentIssuesLoading: false,
        }));

        console.log(
          `=== FRONTEND: Workstream navigation complete for ${workstream.key} ===\n`
        );
      } else {
        console.error(
          `FRONTEND: API error for workstream ${workstream.key}:`,
          data.message
        );
        this.setState({
          currentIssuesError:
            data.message || "Failed to load workstream issues",
          currentIssuesLoading: false,
        });
      }
    } catch (error) {
      console.error(
        `FRONTEND: Network error for workstream ${workstream.key}:`,
        error
      );
      this.setState({
        currentIssuesError: "Network error while loading workstream issues",
        currentIssuesLoading: false,
      });
    }
  };

  // Handle issue clicks by navigating through existing tree data (no API calls)
  handleIssueClick = (issue: JiraIssue) => {
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

      // Add to navigation stack with the children from the existing data
      const newNavigationItem = {
        type: "issue" as const,
        key: issue.key,
        name: issue.summary,
        data: issueWithChildren.children,
      };

      console.log(`Adding issue to navigation stack:`, newNavigationItem);

      this.setState((prevState) => ({
        navigationStack: [...prevState.navigationStack, newNavigationItem],
        currentIssues: issueWithChildren.children,
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
  private findIssueInCurrentData(issueKey: string): JiraIssue | null {
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
        currentIssues: prevState.projectIssues,
        currentIssuesLoading: false,
        currentIssuesError: null,
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
      favoriteProjects,
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
              favoriteProjects.has(record.key) ? (
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

    const issueColumns: ColumnsType<JiraIssue> = [
      {
        title: "Issue Key",
        dataIndex: "key",
        key: "key",
        render: (key: string, record: JiraIssue) => (
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
      },
      {
        title: "Issue Type",
        dataIndex: "type",
        key: "type",
        render: (type: string) => <Tag color="blue">{type}</Tag>,
        sorter: (a, b) => a.type.localeCompare(b.type),
        filters: (() => {
          // Get unique issue types from the current data
          const uniqueTypes = [
            ...new Set(projectIssues.map((issue) => issue.type)),
          ].sort();
          return uniqueTypes.map((type) => ({ text: type, value: type }));
        })(),
        onFilter: (value, record) => record.type === value,
      },
      {
        title: "Summary",
        dataIndex: "summary",
        key: "summary",
        render: (summary: string) => <Text>{summary}</Text>,
        sorter: (a, b) => a.summary.localeCompare(b.summary),
      },
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
      {
        title: "Original Estimate",
        dataIndex: "originalEstimate",
        key: "originalEstimate",
        render: (estimate: number | null | undefined) => (
          <Text>
            {estimate !== null && estimate !== undefined ? (
              <Tag color="green">{estimate.toFixed(1)} days</Tag>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Text>
        ),
        sorter: (a, b) => (a.originalEstimate || 0) - (b.originalEstimate || 0),
      },
      {
        title: "Time Spent",
        dataIndex: "timeSpent",
        key: "timeSpent",
        render: (timeSpent: number | null | undefined) => (
          <Text>
            {timeSpent !== null && timeSpent !== undefined ? (
              <Tag color="blue">{timeSpent.toFixed(1)} days</Tag>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Text>
        ),
        sorter: (a, b) => (a.timeSpent || 0) - (b.timeSpent || 0),
      },
    ];

    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>Loading Jira projects...</div>
        </div>
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
            {favoriteProjects.size > 0 && (
              <Text type="secondary">
                <StarFilled style={{ color: "#faad14", marginRight: "4px" }} />
                {favoriteProjects.size} favorite
                {favoriteProjects.size !== 1 ? "s" : ""}
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
                {favoriteProjects.size > 0 && (
                  <Text type="secondary">
                    • {favoriteProjects.size} starred
                  </Text>
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
              key={`projects-table-${favoriteProjects.size}`} // Force re-render when favorites change
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
                    favoriteProjects.has(selectedProject.key) ? (
                      <StarFilled style={{ color: "#faad14" }} />
                    ) : (
                      <StarOutlined />
                    )
                  }
                  onClick={(e) => this.toggleFavorite(selectedProject.key, e)}
                  style={{ padding: 0, border: "none" }}
                >
                  {favoriteProjects.has(selectedProject.key)
                    ? "Unstar"
                    : "Star"}{" "}
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
            {issuesLoading && (
              <div style={{ textAlign: "center", padding: "50px" }}>
                <Spin size="large" />
                <div style={{ marginTop: "16px" }}>
                  Loading project workstreams...
                </div>
              </div>
            )}

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
            {currentIssuesLoading && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin />
                <div style={{ marginTop: "8px" }}>
                  Loading workstream issues...
                </div>
              </div>
            )}

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
            {!issuesLoading && !issuesError && (
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
                  columns={issueColumns}
                  dataSource={
                    navigationStack.length > 1 ? currentIssues : projectIssues
                  }
                  rowKey="key"
                  pagination={{
                    pageSize: 10,
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
                        this.handleIssueClick(record);
                      }
                    },
                    style: {
                      cursor: record.childCount > 0 ? "pointer" : "default",
                      backgroundColor:
                        record.childCount > 0 ? "#fafafa" : "transparent",
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
