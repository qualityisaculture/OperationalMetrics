import React, { useState, useMemo } from "react";
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
import { DefectHistorySection } from "./components/DefectHistorySection";
import { AccountWorklogSection } from "./components/AccountWorklogSection";
import OrphanList from "./components/OrphanList";
import AccountMismatchList, {
  findAccountMismatches,
} from "./components/AccountMismatchList";
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
    clearCacheAndReload,
    handleProjectClick,
    handleWorkstreamClick,
    handleIssueClick,
    handleBackToProjects,
    handleBreadcrumbClick,
    showRequestAllModal,
    hideRequestAllModal,
    requestAllWorkstreams,
    loadProjectWorkstreams,
    requestDefectHistory,
    requestOrphanDetection,
    getOrphans,
    requestWorkstreamWithTimeSpentDetail,
  } = useJiraReport();

  const handleClearCache = () => {
    // Clear cache and reload (which will reset hook state and clear server cache)
    clearCacheAndReload();
  };

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
    defectHistoryData,
    defectHistoryLoading,
    defectHistoryError,
  } = state;

  // Calculate account mismatches - must be at top level (Rules of Hooks)
  const accountMismatches = useMemo(
    () => findAccountMismatches(projectIssues),
    [projectIssues]
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
            onClick={handleClearCache}
            loading={isLoading}
          >
            Clear Cache
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
              <>
                <OrphanList
                  orphans={getOrphans()}
                  loading={state.orphanLoading}
                  error={state.orphanError}
                  onRefresh={() => {
                    const currentWorkstreamKey =
                      navigationStack[navigationStack.length - 1]?.key;
                    if (currentWorkstreamKey) {
                      requestOrphanDetection(currentWorkstreamKey);
                    }
                  }}
                />

                <WorkstreamTable
                  currentIssues={currentIssues}
                  favoriteItems={favoriteItems}
                  navigationStack={navigationStack}
                  getSortedItems={getSortedItems}
                  getWorkstreamDataCellSpan={getWorkstreamDataCellSpan}
                  handleIssueClick={handleIssueClick}
                  toggleFavorite={toggleFavorite}
                  projectIssues={projectIssues}
                  onRequestOrphanDetection={requestOrphanDetection}
                  requestWorkstreamWithTimeSpentDetail={
                    requestWorkstreamWithTimeSpentDetail
                  }
                  currentIssuesLoading={currentIssuesLoading}
                  progressStatus={progressStatus}
                  progressDetails={progressDetails}
                />
              </>
            ) : (
              <>
                {!issuesLoading && !issuesError && projectIssues.length > 0 && (
                  <AccountMismatchList mismatches={accountMismatches} />
                )}

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
                  requestWorkstreamWithTimeSpentDetail={
                    requestWorkstreamWithTimeSpentDetail
                  }
                />

                <AccountWorklogSection
                  projectKey={selectedProject.key}
                  projectName={selectedProject.name}
                  accounts={(() => {
                    const extractedAccounts = Array.from(
                      new Set(
                        projectIssues
                          .map((issue) => issue.account)
                          .filter((account) => account && account !== "None")
                      )
                    ).sort();
                    console.log(
                      `Extracted accounts from projectIssues:`,
                      extractedAccounts
                    );
                    console.log(`Total projectIssues: ${projectIssues.length}`);
                    console.log(
                      `Sample projectIssues accounts:`,
                      projectIssues.slice(0, 5).map((issue) => ({
                        key: issue.key,
                        account: issue.account,
                      }))
                    );
                    return extractedAccounts;
                  })()}
                />

                <DefectHistorySection
                  selectedProject={selectedProject}
                  onRequestDefectHistory={requestDefectHistory}
                  defectHistoryData={defectHistoryData}
                  defectHistoryLoading={defectHistoryLoading}
                  defectHistoryError={defectHistoryError}
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
    </div>
  );
};

export default JiraReport;
