import React, { useState } from "react";
import { Alert, Button, Space, Typography } from "antd";
import { LoadingIndicator } from "../components";
import { useJiraReport } from "./hooks/useJiraReport";
import {
  ReloadOutlined,
  ProjectOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  StarFilled,
} from "@ant-design/icons";
import { ProjectsTable } from "./components/ProjectsTable";
import { WorkstreamTable } from "./components/WorkstreamTable";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { RequestAllModal } from "./components/RequestAllModal";
import { DynamicProjectSummary } from "./components/DynamicProjectSummary";
import { TimeBookingsModal } from "./components/TimeBookingsModal";
import { JiraProject } from "../../server/graphManagers/JiraReportGraphManager";

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
    loadProjectWorkstreams,
    requestTimeBookings,
  } = useJiraReport();

  // State for time bookings modal
  const [timeBookingsModal, setTimeBookingsModal] = useState<{
    isVisible: boolean;
    workstreamKey: string;
    workstreamSummary: string;
  }>({
    isVisible: false,
    workstreamKey: "",
    workstreamSummary: "",
  });

  // State for time bookings date
  const [timeBookingsDate, setTimeBookingsDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });

  // State for tracking which workstreams have loaded time data
  const [timeDataLoaded, setTimeDataLoaded] = useState<Set<string>>(new Set());

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

  const showTimeBookingsModal = (fromDate: string) => {
    // Update the date state with the selected date
    setTimeBookingsDate(fromDate);

    // If we're viewing a specific workstream, use that information
    if (navigationStack.length > 1) {
      const currentWorkstream = navigationStack[navigationStack.length - 1];
      setTimeBookingsModal({
        isVisible: true,
        workstreamKey: currentWorkstream.key,
        workstreamSummary: currentWorkstream.name,
      });
    } else {
      // Fallback for project level
      setTimeBookingsModal({
        isVisible: true,
        workstreamKey: "Multiple Workstreams",
        workstreamSummary: "Time bookings for all workstreams",
      });
    }
  };

  const hideTimeBookingsModal = () => {
    setTimeBookingsModal({
      isVisible: false,
      workstreamKey: "",
      workstreamSummary: "",
    });
  };

  const handleTimeBookingsConfirm = async () => {
    // Only make the API call if we have a valid workstream key (not "Multiple Workstreams")
    if (timeBookingsModal.workstreamKey !== "Multiple Workstreams") {
      await requestTimeBookings(
        timeBookingsModal.workstreamKey,
        timeBookingsDate
      );
      // Add this workstream to the set of loaded workstreams
      setTimeDataLoaded((prev) =>
        new Set(prev).add(timeBookingsModal.workstreamKey)
      );
    }
    hideTimeBookingsModal();
  };

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
        <ProjectsTable
          projects={projects}
          favoriteItems={favoriteItems}
          toggleFavorite={toggleFavorite}
          handleProjectClick={handleProjectClick}
          getOptimalPageSize={getOptimalPageSize}
        />
      ) : (
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

          {navigationStack.length > 0 && (
            <Breadcrumbs
              navigationStack={navigationStack}
              handleBreadcrumbClick={handleBreadcrumbClick}
            />
          )}

          <LoadingIndicator
            loading={issuesLoading}
            message="Loading project workstreams..."
            size="large"
            style={{ padding: "50px" }}
            showProgressDetails={false}
          />

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
                  onClick={() => loadProjectWorkstreams(selectedProject.key)}
                >
                  Retry
                </Button>
              }
            />
          )}

          <LoadingIndicator
            loading={currentIssuesLoading}
            message={progressStatus}
            progressDetails={progressDetails}
            size="default"
          />

          {currentIssuesError && (
            <Alert
              message="Error"
              description={currentIssuesError}
              type="error"
              showIcon
              style={{ margin: "16px" }}
            />
          )}

          {!issuesLoading &&
            !issuesError &&
            !currentIssuesLoading &&
            (navigationStack.length > 1 ? (
              <WorkstreamTable
                currentIssues={currentIssues}
                favoriteItems={favoriteItems}
                navigationStack={navigationStack}
                getSortedItems={getSortedItems}
                getWorkstreamDataCellSpan={getWorkstreamDataCellSpan}
                handleIssueClick={handleIssueClick}
                toggleFavorite={toggleFavorite}
                projectIssues={projectIssues}
                onRequestTimeBookings={showTimeBookingsModal}
                timeDataLoaded={timeDataLoaded}
                currentWorkstreamKey={
                  navigationStack[navigationStack.length - 1]?.key
                }
              />
            ) : (
              <>
                <DynamicProjectSummary
                  projectAggregatedData={state.projectAggregatedData}
                  projectName={selectedProject.name}
                  projectIssues={projectIssues}
                  favoriteItems={favoriteItems}
                  navigationStack={navigationStack}
                  loadedWorkstreamData={state.loadedWorkstreamData}
                  getSortedItems={getSortedItems}
                  getWorkstreamDataCellSpan={getWorkstreamDataCellSpan}
                  handleWorkstreamClick={handleWorkstreamClick}
                  showRequestAllModal={showRequestAllModal}
                  toggleFavorite={toggleFavorite}
                />
              </>
            ))}

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

      <RequestAllModal
        isRequestAllModalVisible={isRequestAllModalVisible}
        hideRequestAllModal={hideRequestAllModal}
        requestAllWorkstreams={requestAllWorkstreams}
        requestAllProgress={requestAllProgress}
        projectIssues={projectIssues}
        requestAllDetails={requestAllDetails}
      />

      <TimeBookingsModal
        isVisible={timeBookingsModal.isVisible}
        workstreamKey={timeBookingsModal.workstreamKey}
        workstreamSummary={timeBookingsModal.workstreamSummary}
        fromDate={timeBookingsDate}
        onCancel={hideTimeBookingsModal}
        onConfirm={handleTimeBookingsConfirm}
      />
    </div>
  );
};

export default JiraReport;
