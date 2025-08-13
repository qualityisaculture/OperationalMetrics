import React from "react";
import { Table, Card, Space, Typography } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { JiraIssueWithAggregated } from "../types";
import { getIssueColumns } from "./tables/issueColumns";

const { Text } = Typography;

interface Props {
  currentIssues: JiraIssueWithAggregated[];
  favoriteItems: Set<string>;
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  getSortedItems: <T extends { key: string }>(items: T[]) => T[];
  getWorkstreamDataCellSpan: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
  handleIssueClick: (issue: JiraIssueWithAggregated) => void;
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
}

export const IssuesTable: React.FC<Props> = ({
  currentIssues,
  favoriteItems,
  navigationStack,
  getSortedItems,
  getWorkstreamDataCellSpan,
  handleIssueClick,
  toggleFavorite,
}) => {
  const issueColumns = getIssueColumns(
    favoriteItems,
    toggleFavorite,
    navigationStack,
    currentIssues,
    [],
    getWorkstreamDataCellSpan
  );

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          {`Issues in ${navigationStack[navigationStack.length - 1].name}`}
        </Space>
      }
      extra={
        <Text type="secondary">
          Last updated: {new Date().toLocaleString()}
        </Text>
      }
    >
      <Table
        key={`issues-table-${favoriteItems.size}-${navigationStack.length}`} // Force re-render when favorites change
        columns={issueColumns}
        dataSource={getSortedItems(currentIssues)}
        rowKey="key"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} issues`,
        }}
        onRow={(record) => ({
          onClick: () => handleIssueClick(record),
          style: {
            cursor: record.childCount > 0 ? "pointer" : "default",
            backgroundColor: record.childCount > 0 ? "#fafafa" : "transparent",
          },
        })}
      />
    </Card>
  );
};
