import React from "react";
import { Modal, List, Button, Typography } from "antd";

const { Text } = Typography;

interface WorkDescriptionModalProps {
  visible: boolean;
  title: string;
  descriptions: string[];
  details: Array<{ fullName: string; date: string }>;
  onClose: () => void;
}

export const WorkDescriptionModal: React.FC<WorkDescriptionModalProps> = ({
  visible,
  title,
  descriptions,
  details,
  onClose,
}) => {
  return (
    <Modal
      title={title}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={600}
    >
      <List
        dataSource={descriptions.map((description, index) => ({
          key: index,
          description: description,
          fullName: details[index]?.fullName || "N/A",
          date: details[index]?.date || "N/A",
        }))}
        renderItem={(item) => (
          <List.Item>
            <div style={{ width: "100%" }}>
              <Text strong>
                {item.fullName} on {item.date}
              </Text>
              <br />
              <Text>{item.description}</Text>
            </div>
          </List.Item>
        )}
      />
    </Modal>
  );
};
