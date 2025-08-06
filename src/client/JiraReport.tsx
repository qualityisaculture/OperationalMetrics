import React from "react";
import { Table, Card, Spin, Alert, Button, Space, Typography, Tag } from "antd";
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

  loadProjectIssues = async (projectKey: string) => {
    this.setState({ issuesLoading: true, issuesError: null });

    try {
      const response = await fetch(
        `/api/jiraReport/project/${projectKey}/issues`
      );
      const data = await response.json();

      if (response.ok) {
        const issues: JiraIssue[] = JSON.parse(data.data);
        this.setState({ projectIssues: issues, issuesLoading: false });
      } else {
        this.setState({
          issuesError: data.message || "Failed to load project issues",
          issuesLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        issuesError: "Network error while loading project issues",
        isLoading: false,
      });
    }
  };

  handleProjectClick = async (project: JiraProject) => {
    this.setState({
      selectedProject: project,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
    });

    // Load the project issues
    await this.loadProjectIssues(project.key);
  };

  handleBackToProjects = () => {
    this.setState({
      selectedProject: null,
      projectIssues: [],
      issuesLoading: false,
      issuesError: null,
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
        filterable: true,
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
        render: (key: string) => <Tag color="orange">{key}</Tag>,
        sorter: (a, b) => a.key.localeCompare(b.key),
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
        dataIndex: "children",
        key: "children",
        render: (children: string[]) => (
          <Space>
            {children.length > 0 ? (
              children.map((child) => (
                <Tag key={child} color="purple">
                  {child}
                </Tag>
              ))
            ) : (
              <Text type="secondary">No children</Text>
            )}
          </Space>
        ),
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
          // Project Issues View
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
                  {selectedProject.name} ({selectedProject.key}) - Issues
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

            {issuesLoading && (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <Spin size="large" />
                <div style={{ marginTop: "16px" }}>
                  <Text>Loading project issues...</Text>
                </div>
              </div>
            )}

            {issuesError && (
              <Alert
                message="Error"
                description={issuesError}
                type="error"
                showIcon
                style={{ marginBottom: "16px" }}
              />
            )}

            {!issuesLoading && !issuesError && (
              <Card
                title={
                  <Space>
                    <InfoCircleOutlined />
                    Project Issues ({projectIssues.length})
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
                  dataSource={projectIssues}
                  rowKey="key"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} of ${total} issues`,
                  }}
                />
              </Card>
            )}

            {!issuesLoading && !issuesError && projectIssues.length === 0 && (
              <Alert
                message="No Issues Found"
                description="No issues were found for this project."
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
