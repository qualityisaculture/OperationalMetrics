import React from "react";
import { Modal, Table, Typography } from "antd";
import { ParentAncestor } from "../hooks/useParentAncestors";

const { Text } = Typography;

interface Props {
  visible: boolean;
  issueKey: string;
  issueType: string;
  ancestors: ParentAncestor[];
  onClose: () => void;
}

export const ParentAncestorsModal: React.FC<Props> = ({
  visible,
  issueKey,
  issueType,
  ancestors,
  onClose,
}) => {
  const jiraDomain = "https://lendscape.atlassian.net";

  const columns = [
    {
      title: "Issue Key",
      dataIndex: "key",
      key: "key",
      render: (key: string) => (
        <a
          href={`${jiraDomain}/browse/${key}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: "bold" }}
        >
          {key}
        </a>
      ),
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Text>{type}</Text>,
    },
  ];

  // Create data source with the original issue first, then ancestors
  const dataSource = [
    {
      rowKey: `original-${issueKey}`,
      key: issueKey,
      type: issueType,
    },
    ...ancestors.map((ancestor, index) => ({
      rowKey: `ancestor-${index}-${ancestor.key}`,
      key: ancestor.key,
      type: ancestor.type,
    })),
  ];

  return (
    <Modal
      title={`Parent Ancestors for ${issueKey}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        rowKey="rowKey"
      />
    </Modal>
  );
};

