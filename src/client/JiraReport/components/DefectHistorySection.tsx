import React, { useState } from "react";
import { Button, Card, Alert, Space, Typography } from "antd";
import { BugOutlined, BarChartOutlined } from "@ant-design/icons";
import CumulativeFlowDiagram from "../../CumulativeFlowDiagram";
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
  const [isDefectHistoryVisible, setIsDefectHistoryVisible] = useState(false);

  const handleRequestDefectHistory = async () => {
    await onRequestDefectHistory(selectedProject.key);
    setIsDefectHistoryVisible(true);
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
          <span>Defect History</span>
        </Space>
      }
      style={{ marginTop: "16px" }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Text type="secondary">
          View cumulative flow diagram for incidents and faults in this project
        </Text>

        <Button
          type="primary"
          icon={<BarChartOutlined />}
          onClick={handleRequestDefectHistory}
          loading={defectHistoryLoading}
          disabled={defectHistoryLoading}
        >
          Request Defect History
        </Button>

        {defectHistoryError && (
          <Alert
            message="Error"
            description={defectHistoryError}
            type="error"
            showIcon
          />
        )}

        {isDefectHistoryVisible &&
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

        {isDefectHistoryVisible && hasDefectData && (
          <div style={{ marginTop: "16px" }}>
            <Title level={4}>
              Cumulative Flow Diagram - Incidents & Faults
            </Title>
            <CumulativeFlowDiagram />
          </div>
        )}
      </Space>
    </Card>
  );
};
