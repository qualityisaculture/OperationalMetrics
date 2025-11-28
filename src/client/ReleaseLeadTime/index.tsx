import React from "react";
import { Alert, Button, Typography, Space } from "antd";
import { LoadingIndicator } from "../components";
import { useReleaseLeadTime } from "./hooks/useReleaseLeadTime";
import { ProjectSelector } from "./components/ProjectSelector";
import { ReleasesTable } from "./components/ReleasesTable";

const { Title, Text } = Typography;

const ReleaseLeadTime: React.FC = () => {
  const {
    state,
    loadProjects,
    selectProject,
    toggleFavorite,
    getSortedProjects,
    loadJiraKeysForRelease,
  } = useReleaseLeadTime();

  const {
    projects,
    isLoadingProjects,
    projectsError,
    selectedProject,
    releases,
    isLoadingReleases,
    releasesError,
    favoriteProjects,
  } = state;

  if (isLoadingProjects) {
    return (
      <LoadingIndicator
        loading={isLoadingProjects}
        message="Loading projects..."
        size="large"
        style={{ padding: "50px" }}
        showProgressDetails={false}
      />
    );
  }

  if (projectsError) {
    return (
      <Alert
        message="Error"
        description={projectsError}
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

  const sortedProjects = getSortedProjects();

  return (
    <div style={{ padding: "16px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Release Lead Time</Title>
          <Text
            type="secondary"
            style={{ fontSize: "14px", display: "block", marginBottom: "16px" }}
          >
            This screen shows the lead time of issues in each release. Select a
            project below to view its releases.
          </Text>
        </div>

        <ProjectSelector
          projects={sortedProjects}
          favoriteProjects={favoriteProjects}
          selectedProject={selectedProject}
          onProjectSelect={selectProject}
          onToggleFavorite={toggleFavorite}
        />

        <ReleasesTable
          releases={releases}
          isLoading={isLoadingReleases}
          error={releasesError}
          projectName={selectedProject?.name || ""}
          loadJiraKeysForRelease={loadJiraKeysForRelease}
          releaseJiraKeys={state.releaseJiraKeys}
          releaseJiraData={state.releaseJiraData}
          loadingJiraKeys={state.loadingJiraKeys}
          jiraKeysError={state.jiraKeysError}
        />
      </Space>
    </div>
  );
};

export default ReleaseLeadTime;
