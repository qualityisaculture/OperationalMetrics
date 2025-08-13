import React from "react";
import { Table, Card, Space, Typography, Button } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { getUnifiedColumns } from "./columns";
import { JiraIssueWithAggregated } from "../../JiraReport/types";

const { Text } = Typography;

export interface UnifiedIssuesTableProps {
  title: React.ReactNode;
  dataSource: any[];
  rowKey: string;
  // Columns
  showFavoriteColumn?: boolean;

  // Sorting
  getSortedItems?: <T extends { key: string }>(items: T[]) => T[];

  // Pagination
  pagination?:
    | false
    | {
        pageSize?: number;
        showSizeChanger?: boolean;
        showQuickJumper?: boolean;
        showTotal?: (total: number, range: [number, number]) => React.ReactNode;
        defaultCurrent?: number;
      };

  // Row Events
  onRow?: (record: any) => React.HTMLAttributes<HTMLElement>;

  // Favorite
  favoriteItems?: Set<string>;
  toggleFavorite?: (itemKey: string, event: React.MouseEvent) => void;

  // Navigation and data handling
  navigationStack?: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  currentIssues?: JiraIssueWithAggregated[];
  projectIssues?: JiraIssueWithAggregated[];
  getWorkstreamDataCellSpan?: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
}

export const UnifiedIssuesTable: React.FC<UnifiedIssuesTableProps> = ({
  title,
  dataSource,
  rowKey,
  showFavoriteColumn = false,
  getSortedItems,
  pagination = {},
  onRow,
  favoriteItems,
  toggleFavorite,
  navigationStack,
  currentIssues,
  projectIssues,
  getWorkstreamDataCellSpan,
}) => {
  const columns = getUnifiedColumns({
    showFavoriteColumn,
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    projectIssues,
    getWorkstreamDataCellSpan,
  });

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          {title}
        </Space>
      }
      extra={
        <Text type="secondary">
          Last updated: {new Date().toLocaleString()}
        </Text>
      }
    >
      <Table
        columns={columns}
        dataSource={getSortedItems ? getSortedItems(dataSource) : dataSource}
        rowKey={rowKey}
        pagination={pagination}
        onRow={onRow}
      />
    </Card>
  );
};
