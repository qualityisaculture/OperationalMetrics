import React from "react";
import { Card, Table, Tag, Spin, Typography, Button, Space } from "antd";
import { ParentAncestorsMap } from "../hooks/useParentAncestors";

const { Title, Text } = Typography;

interface Props {
  parentAncestors: ParentAncestorsMap;
  isLoading: boolean;
  onFetchClick: () => void;
  hasData: boolean;
  issueCount: number;
}

export const ParentAncestorsView: React.FC<Props> = ({
  parentAncestors,
  isLoading,
  onFetchClick,
  hasData,
  issueCount,
}) => {
  if (!hasData || issueCount === 0) {
    return null;
  }

  const issueKeys = Object.keys(parentAncestors);
  const hasAncestors = issueKeys.length > 0;

  // Show button if no ancestors have been fetched yet, or show loading/data
  if (!hasAncestors && !isLoading) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Title level={4}>Parent Ancestors</Title>
          <Text>
            Click the button below to fetch parent ancestors for all {issueCount} issue{issueCount !== 1 ? "s" : ""} in the spreadsheet.
          </Text>
          <Button type="primary" onClick={onFetchClick} loading={isLoading}>
            Fetch Parent Ancestors
          </Button>
        </Space>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Title level={4}>Parent Ancestors</Title>
          <Spin size="large" tip="Loading parent ancestors..." />
        </Space>
      </Card>
    );
  }

  const columns = [
    {
      title: "Issue Key",
      dataIndex: "issueKey",
      key: "issueKey",
      width: 150,
    },
    {
      title: "Parent Ancestors",
      dataIndex: "ancestors",
      key: "ancestors",
      render: (ancestors: Array<{ key: string; summary: string; type: string }>) => {
        if (!ancestors || ancestors.length === 0) {
          return <Tag color="default">No parents</Tag>;
        }

        return (
          <div>
            {ancestors.map((ancestor, index) => (
              <div key={ancestor.key} style={{ marginBottom: index < ancestors.length - 1 ? 8 : 0 }}>
                <Tag color="blue">{ancestor.key}</Tag>
                <span style={{ marginLeft: 8, marginRight: 8 }}>
                  {ancestor.summary}
                </span>
                <Tag color="purple">{ancestor.type}</Tag>
                {index < ancestors.length - 1 && (
                  <span style={{ marginLeft: 8, color: "#999" }}>→</span>
                )}
              </div>
            ))}
          </div>
        );
      },
    },
  ];

  const dataSource = issueKeys.map((issueKey) => ({
    key: issueKey,
    issueKey,
    ancestors: parentAncestors[issueKey] || [],
  }));

  // Filter out issues with no ancestors for a cleaner view
  const issuesWithAncestors = dataSource.filter(
    (item) => item.ancestors.length > 0
  );

  if (issuesWithAncestors.length === 0) {
    return (
      <Card>
        <Title level={4}>Parent Ancestors</Title>
        <p>No parent ancestors found for the issues in the spreadsheet.</p>
      </Card>
    );
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Title level={4} style={{ margin: 0 }}>Parent Ancestors</Title>
          <Button onClick={onFetchClick} loading={isLoading}>
            Refresh Ancestors
          </Button>
        </Space>
        <Text>
          Showing parent hierarchy for {issuesWithAncestors.length} of {issueKeys.length} issues
        </Text>
        <Table
          columns={columns}
          dataSource={issuesWithAncestors}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Space>
    </Card>
  );
};

