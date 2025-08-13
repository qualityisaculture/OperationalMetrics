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
  Modal,
  Progress,
} from "antd";
import { LoadingIndicator } from "../components";
import {
  JiraProject,
  JiraIssue,
} from "../../server/graphManagers/JiraReportGraphManager";
import { JiraIssueWithAggregated, JiraReportState } from "./types";
import { useJiraReport } from "./hooks/useJiraReport";
import { getProjectColumns } from "./components/tables/projectColumns";
import { getIssueColumns } from "./components/tables/issueColumns";
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

const { Title, Text } = Typography;

const JiraReport: React.FC = () => {
  const {
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
  } = useJiraReport();

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
    isRequestAllModalVisible,
    requestAllProgress,
    requestAllDetails,
    progressStatus,
    progressDetails,
  } = state;

  const sortedProjects = getSortedProjects();
  const projectColumns = getProjectColumns(
    favoriteItems,
    toggleFavorite,
    projects
  );
  const issueColumns = getIssueColumns(
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    projectIssues,
    getWorkstreamDataCellSpan
  );

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
          <Button size="small" danger onClick={loadProjects}>
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
            onClick={loadProjects}
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
              pageSize: getOptimalPageSize(),
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} projects`,
              defaultCurrent: 1, // Always start on first page
            }}
            onRow={(record) => ({
              onClick: () => handleProjectClick(record),
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
                onClick={handleBackToProjects}
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
                onClick={(e) => toggleFavorite(selectedProject.key, e)}
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
                    onClick={() => handleBreadcrumbClick(-1)}
                    style={{ padding: 0, height: "auto" }}
                  >
                    Projects
                  </Button>
                </Breadcrumb.Item>
                {navigationStack.map((item, index) => (
                  <Breadcrumb.Item key={item.key}>
                    <Button
                      type="link"
                      onClick={() => handleBreadcrumbClick(index)}
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
                    loadProjectWorkstreams(selectedProject.key)
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
            message={progressStatus}
            progressDetails={progressDetails}
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
                  {navigationStack.length > 1 ? (
                    `Issues in ${navigationStack[navigationStack.length - 1].name}`
                  ) : (
                    <Space>
                      <span>
                        Project Workstreams ({projectIssues.length})
                      </span>
                      {navigationStack.length === 1 && (
                        <Button
                          type="primary"
                          onClick={showRequestAllModal}
                          size="small"
                        >
                          Request All
                        </Button>
                      )}
                    </Space>
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
                key={`issues-table-${favoriteItems.size}-${navigationStack.length}-${state.loadedWorkstreamData.size}`} // Force re-render when favorites change or aggregated data is loaded
                columns={issueColumns}
                dataSource={
                  navigationStack.length > 1
                    ? getSortedItems(currentIssues)
                    : getSortedItems(
                        projectIssues.map((issue) => {
                          const loadedData =
                            state.loadedWorkstreamData.get(issue.key);

                          return loadedData
                            ? {
                                ...issue,
                                aggregatedOriginalEstimate:
                                  loadedData.aggregatedOriginalEstimate,
                                aggregatedTimeSpent:
                                  loadedData.aggregatedTimeSpent,
                                aggregatedTimeRemaining:
                                  loadedData.aggregatedTimeRemaining,
                              }
                            : issue;
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
                    if (navigationStack.length === 1) {
                      handleWorkstreamClick(record);
                    } else {
                      handleIssueClick(
                        record as JiraIssueWithAggregated
                      );
                    }
                  },
                  style: {
                    cursor:
                      navigationStack.length === 1 ||
                      record.childCount > 0
                        ? "pointer"
                        : "default",
                    backgroundColor:
                      navigationStack.length === 1 ||
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

      {/* Request All Workstreams Modal */}
      <Modal
        title="Request All Workstreams"
        open={isRequestAllModalVisible}
        onCancel={hideRequestAllModal}
        footer={[
          <Button key="cancel" onClick={hideRequestAllModal}>
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            onClick={requestAllWorkstreams}
            disabled={requestAllProgress > 0 && requestAllProgress < 100}
          >
            {requestAllProgress === 0 ? "Start Requesting" : "Processing..."}
          </Button>,
        ]}
        width={600}
      >
        <div style={{ marginBottom: "20px" }}>
          <Alert
            message="Warning"
            description={
              <div>
                <p>
                  This action will request data for{" "}
                  <strong>{projectIssues.length}</strong> workstreams.
                </p>
                <p>
                  This could take a very long time and may impact system
                  performance.
                </p>
                <p>Are you sure you want to continue?</p>
              </div>
            }
            type="warning"
            showIcon
            style={{ marginBottom: "16px" }}
          />
        </div>

        {requestAllProgress > 0 && (
          <div>
            <Progress
              percent={requestAllProgress}
              status={requestAllProgress === 100 ? "success" : "active"}
              style={{ marginBottom: "16px" }}
            />

            {requestAllDetails && (
              <div style={{ marginBottom: "16px" }}>
                <Text strong>Progress:</Text>
                <br />
                <Text type="secondary">{requestAllDetails.currentPhase}</Text>
                <br />
                <Text type="secondary">
                  {requestAllDetails.phaseProgress} of{" "}
                  {requestAllDetails.phaseTotal} workstreams
                </Text>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default JiraReport;
