import React, { useState, useEffect } from "react";
import { Button, Card, Alert, Space, Typography } from "antd";
import { BugOutlined, BarChartOutlined } from "@ant-design/icons";
import CumulativeFlowDiagramChart from "../../CumulativeFlowDiagramChart";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";

const { Title, Text } = Typography;

interface Props {
  selectedProject: JiraProject;
  onRequestDefectHistory: (projectKey: string) => Promise<void>;
  defectHistoryData: any | null;
  defectHistoryLoading: boolean;
  defectHistoryError: string | null;
}

export const DefectHistorySection: React.FC<Props> = ({
  selectedProject,
  onRequestDefectHistory,
  defectHistoryData,
  defectHistoryLoading,
  defectHistoryError,
}) => {
  const [hasRequested, setHasRequested] = useState(false);

  const handleRequestDefectHistory = async () => {
    await onRequestDefectHistory(selectedProject.key);
    setHasRequested(true);
  };

  const hasDefectData =
    defectHistoryData &&
    defectHistoryData.timeline &&
    defectHistoryData.timeline.length > 0;

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          <span>Defect History - Incidents & Faults</span>
        </Space>
      }
      style={{ marginTop: "16px" }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text type="secondary">
          Cumulative flow diagram for incidents and faults in project{" "}
          {selectedProject.key}
        </Text>

        {!hasRequested && (
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={handleRequestDefectHistory}
            loading={defectHistoryLoading}
            disabled={defectHistoryLoading}
          >
            Request Defect History
          </Button>
        )}

        {defectHistoryError && (
          <Alert
            message="Error"
            description={defectHistoryError}
            type="error"
            showIcon
          />
        )}

        {hasRequested &&
          !defectHistoryLoading &&
          !defectHistoryError &&
          !hasDefectData && (
            <Alert
              message="No Defects Found"
              description={`No incidents or faults were found for project ${selectedProject.key}.`}
              type="info"
              showIcon
            />
          )}

        {hasRequested && hasDefectData && (
          <CumulativeFlowDiagramChart
            data={defectHistoryData}
            loading={defectHistoryLoading}
            error={defectHistoryError}
            showDateSelectors={true}
            showFilters={true}
            showNotes={true}
            title="Cumulative Flow Diagram - Incidents & Faults"
            targetElementId={`defect-history-${selectedProject.key}`}
          />
        )}
      </Space>
    </Card>
  );
};
