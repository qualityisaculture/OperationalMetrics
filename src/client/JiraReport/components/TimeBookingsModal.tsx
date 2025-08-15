import React from "react";
import { Modal, Button, Typography, Alert } from "antd";

const { Text, Title } = Typography;

interface TimeBookingsModalProps {
  isVisible: boolean;
  workstreamKey: string;
  workstreamSummary: string;
  fromDate: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const TimeBookingsModal: React.FC<TimeBookingsModalProps> = ({
  isVisible,
  workstreamKey,
  workstreamSummary,
  fromDate,
  onCancel,
  onConfirm,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      title="Request Time Bookings Data"
      open={isVisible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          loading={isLoading}
        >
          Request Data
        </Button>,
      ]}
      width={600}
    >
      <div style={{ marginBottom: "16px" }}>
        <Title level={5}>Workstream: {workstreamKey}</Title>
        <Text type="secondary">{workstreamSummary}</Text>
      </div>

      <Alert
        message="Performance Warning"
        description="This request will fetch detailed time booking data from Jira, which may take several minutes to complete."
        type="warning"
        showIcon
        style={{ marginBottom: "16px" }}
      />

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          backgroundColor: "#f6f8fa",
          borderRadius: "6px",
        }}
      >
        <Text>
          <strong>Summary:</strong> Will calculate total time booked to{" "}
          <span
            style={{
              fontFamily: "monospace",
              backgroundColor: "#f0f0f0",
              padding: "2px 4px",
              borderRadius: "3px",
            }}
          >
            {workstreamKey}
          </span>{" "}
          from{" "}
          <span
            style={{
              fontFamily: "monospace",
              backgroundColor: "#f0f0f0",
              padding: "2px 4px",
              borderRadius: "3px",
            }}
          >
            {new Date(fromDate).toLocaleDateString()}
          </span>{" "}
          onwards.
        </Text>
      </div>
    </Modal>
  );
};
