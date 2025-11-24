import React from "react";
import { Table, Space, Typography } from "antd";
import { StarOutlined, StarFilled } from "@ant-design/icons";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

interface Props {
  projects: JiraProject[];
  favoriteProjects: Set<string>;
  selectedProject: JiraProject | null;
  onProjectSelect: (project: JiraProject) => void;
  onToggleFavorite: (projectKey: string, event: React.MouseEvent) => void;
}

export const ProjectSelector: React.FC<Props> = ({
  projects,
  favoriteProjects,
  selectedProject,
  onProjectSelect,
  onToggleFavorite,
}) => {
  const columns: ColumnsType<JiraProject> = [
    {
      title: "",
      key: "favorite",
      width: 50,
      render: (_, record) => (
        <span
          onClick={(e) => onToggleFavorite(record.key, e)}
          style={{ cursor: "pointer", fontSize: "16px" }}
        >
          {favoriteProjects.has(record.key) ? (
            <StarFilled style={{ color: "#faad14" }} />
          ) : (
            <StarOutlined />
          )}
        </span>
      ),
    },
    {
      title: "Key",
      dataIndex: "key",
      key: "key",
      width: 150,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
  ];

  return (
    <div style={{ marginBottom: "24px" }}>
      <Space direction="vertical" style={{ width: "100%" }} size="small">
        <Text strong>Select a project to view its releases:</Text>
        <Table
          columns={columns}
          dataSource={projects}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} projects`,
          }}
          onRow={(record) => ({
            onClick: () => onProjectSelect(record),
            style: {
              cursor: "pointer",
              backgroundColor:
                selectedProject?.key === record.key ? "#e6f7ff" : undefined,
            },
          })}
          rowClassName={(record) =>
            selectedProject?.key === record.key ? "selected-row" : ""
          }
        />
      </Space>
    </div>
  );
};

