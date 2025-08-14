import React from "react";
import { Table, Card, Space, Typography, Button } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { JiraIssueWithAggregated } from "../types";
import { getIssueColumns } from "./tables/issueColumns";

const { Text } = Typography;

interface Props {
  projectIssues: JiraIssueWithAggregated[];
  favoriteItems: Set<string>;
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  loadedWorkstreamData: Map<
    string,
    {
      aggregatedOriginalEstimate: number;
      aggregatedTimeSpent: number;
      aggregatedTimeRemaining: number;
    }
  >;
  getSortedItems: <T extends { key: string }>(items: T[]) => T[];
  getWorkstreamDataCellSpan: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
  handleWorkstreamClick: (workstream: JiraIssueWithAggregated) => void;
  showRequestAllModal: () => void;
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void;
}

export const WorkstreamsTable: React.FC<Props> = ({
  projectIssues,
  favoriteItems,
  navigationStack,
  loadedWorkstreamData,
  getSortedItems,
  getWorkstreamDataCellSpan,
  handleWorkstreamClick,
  showRequestAllModal,
  toggleFavorite,
}) => {
  // Debug logging to see what data we're working with
  console.log("WorkstreamsTable render:", {
    projectIssuesCount: projectIssues.length,
    loadedWorkstreamDataSize: loadedWorkstreamData.size,
    loadedWorkstreamDataKeys: Array.from(loadedWorkstreamData.keys()),
    sampleProjectIssue: projectIssues[0],
    sampleLoadedData:
      loadedWorkstreamData.size > 0
        ? Array.from(loadedWorkstreamData.entries())[0]
        : null,
  });

  const issueColumns = getIssueColumns(
    favoriteItems,
    toggleFavorite,
    navigationStack,
    [],
    projectIssues,
    getWorkstreamDataCellSpan
  );

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          <Space>
            <span>Project Workstreams ({projectIssues.length})</span>
            {navigationStack.length === 1 && (
              <Button type="primary" onClick={showRequestAllModal} size="small">
                Request All
              </Button>
            )}
          </Space>
        </Space>
      }
      extra={
        <Text type="secondary">
          Last updated: {new Date().toLocaleString()}
        </Text>
      }
    >
      <Table
        key={`workstreams-table-${favoriteItems.size}-${navigationStack.length}-${loadedWorkstreamData.size}`} // Force re-render when favorites change or aggregated data is loaded
        columns={issueColumns}
        dataSource={getSortedItems(
          projectIssues.map((issue) => {
            const loadedData = loadedWorkstreamData.get(issue.key);
            return loadedData
              ? {
                  ...issue,
                  aggregatedOriginalEstimate:
                    loadedData.aggregatedOriginalEstimate,
                  aggregatedTimeSpent: loadedData.aggregatedTimeSpent,
                  aggregatedTimeRemaining: loadedData.aggregatedTimeRemaining,
                }
              : issue;
          })
        )}
        rowKey="key"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} of ${total} workstreams`,
        }}
        onRow={(record) => ({
          onClick: () => handleWorkstreamClick(record),
          style: {
            cursor: "pointer",
            backgroundColor: "#fafafa",
          },
        })}
      />
    </Card>
  );
};
