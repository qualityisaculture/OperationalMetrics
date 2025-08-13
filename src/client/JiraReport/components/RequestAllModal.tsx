import React from "react";
import { Modal, Button, Alert, Progress, Typography } from "antd";
import { JiraIssueWithAggregated } from "../types";

const { Text } = Typography;

interface Props {
  isRequestAllModalVisible: boolean;
  hideRequestAllModal: () => void;
  requestAllWorkstreams: () => void;
  requestAllProgress: number;
  projectIssues: JiraIssueWithAggregated[];
  requestAllDetails?: {
    currentPhase: string;
    phaseProgress: number;
    phaseTotal: number;
  };
}

export const RequestAllModal: React.FC<Props> = ({
  isRequestAllModalVisible,
  hideRequestAllModal,
  requestAllWorkstreams,
  requestAllProgress,
  projectIssues,
  requestAllDetails,
}) => {
  return (
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
  );
};
