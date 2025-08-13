import React from "react";
import { Table, Card, Space, Typography } from "antd";
import { ProjectOutlined } from "@ant-design/icons";
import { JiraProject } from "../../../server/graphManagers/JiraReportGraphManager";
import { getProjectColumns } from "./tables/projectColumns";

const { Text } = Typography;

interface Props {
  projects: JiraProject[];
  favoriteItems: Set<string>;
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
  handleProjectClick: (project: JiraProject) => void;
  getOptimalPageSize: () => number;
}

export const ProjectsTable: React.FC<Props> = ({
  projects,
  favoriteItems,
  toggleFavorite,
  handleProjectClick,
  getOptimalPageSize,
}) => {
  const sortedProjects = [...projects].sort((a, b) => {
    const aIsFavorite = favoriteItems.has(a.key);
    const bIsFavorite = favoriteItems.has(b.key);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return a.key.localeCompare(b.key);
  });

  const projectColumns = getProjectColumns(
    favoriteItems,
    toggleFavorite,
    projects
  );

  return (
    <Card
      title={
        <Space>
          <ProjectOutlined />
          Projects ({projects.length})
          {favoriteItems.size > 0 && (
            <Text type="secondary">• {favoriteItems.size} starred</Text>
          )}
        </Space>
      }
      extra={
        <Text type="secondary">
          Last updated: {new Date().toLocaleString()}
        </Text>
      }
    >
      <Table
        key={`projects-table-${favoriteItems.size}`} // Force re-render when favorites change
        columns={projectColumns}
        dataSource={sortedProjects}
        rowKey="id"
        pagination={{
          pageSize: getOptimalPageSize(),
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} projects`,
          defaultCurrent: 1, // Always start on first page
        }}
        onRow={(record) => ({
          onClick: () => handleProjectClick(record),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};
