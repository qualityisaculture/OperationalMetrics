import React from "react";
import { Button, Tag, Typography } from "antd";
import { StarFilled, StarOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { JiraProject } from "../../../../server/graphManagers/JiraReportGraphManager";

const { Text } = Typography;

export const getProjectColumns = (
  favoriteItems: Set<string>,
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void,
  projects: JiraProject[]
): ColumnsType<JiraProject> => [
  {
    title: "Favorite",
    key: "favorite",
    width: 60,
    render: (_, record) => (
      <Button
        type="text"
        icon={
          favoriteItems.has(record.key) ? (
            <StarFilled style={{ color: "#faad14" }} />
          ) : (
            <StarOutlined />
          )
        }
        onClick={(e) => toggleFavorite(record.key, e)}
        style={{ padding: 0, border: "none" }}
      />
    ),
  },
  {
    title: "Project Key",
    dataIndex: "key",
    key: "key",
    render: (key: string) => <Tag color="green">{key}</Tag>,
    sorter: (a, b) => a.key.localeCompare(b.key),
  },
  {
    title: "Project Name",
    dataIndex: "name",
    key: "name",
    render: (name: string) => <Text strong>{name}</Text>,
    sorter: (a, b) => a.name.localeCompare(b.name),
    onFilter: (value, record) =>
      record.name.toLowerCase().includes((value as string).toLowerCase()),
    filterSearch: true,
    filters: projects.map((project) => ({
      text: project.name,
      value: project.name,
    })),
  },
  {
    title: "Project ID",
    dataIndex: "id",
    key: "id",
    render: (id: string) => <Tag color="blue">{id}</Tag>,
    sorter: (a, b) => a.id.localeCompare(b.id),
  },
];
