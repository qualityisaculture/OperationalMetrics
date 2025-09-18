import React, { useState } from "react";
import {
  Card,
  Collapse,
  Table,
  Typography,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Button,
} from "antd";
import {
  DownOutlined,
  RightOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

const { Panel } = Collapse;
const { Title, Text } = Typography;

interface TypeBreakdownData {
  key: string;
  summary: string;
  type: string;
  status: string;
  children: TypeBreakdownData[];
  childCount: number;
  url: string;
  originalEstimate?: number | null;
  timeSpent?: number | null;
  timeRemaining?: number | null;
  dueDate?: string | null;
  epicStartDate?: string | null;
  epicEndDate?: string | null;
}

interface TypeSummary {
  type: string;
  count: number;
  totalOriginalEstimate: number;
  totalTimeSpent: number;
  totalTimeRemaining: number;
  estimatePercentage: number;
  spentPercentage: number;
  remainingPercentage: number;
  issues: TypeBreakdownData[];
}

interface Props {
  data: TypeBreakdownData | null;
  isLoading: boolean;
}

const TypeBreakdownDisplay: React.FC<Props> = ({ data, isLoading }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Recursively analyze children and group by type
  const analyzeChildrenByType = (
    issues: TypeBreakdownData[]
  ): TypeSummary[] => {
    const typeMap = new Map<string, TypeSummary>();

    const processIssue = (issue: TypeBreakdownData) => {
      // Add this issue to its type summary
      if (!typeMap.has(issue.type)) {
        typeMap.set(issue.type, {
          type: issue.type,
          count: 0,
          totalOriginalEstimate: 0,
          totalTimeSpent: 0,
          totalTimeRemaining: 0,
          estimatePercentage: 0,
          spentPercentage: 0,
          remainingPercentage: 0,
          issues: [],
        });
      }

      const typeSummary = typeMap.get(issue.type)!;
      typeSummary.count += 1;
      typeSummary.totalOriginalEstimate += issue.originalEstimate || 0;
      typeSummary.totalTimeSpent += issue.timeSpent || 0;
      typeSummary.totalTimeRemaining += issue.timeRemaining || 0;
      typeSummary.issues.push(issue);

      // Recursively process children
      if (issue.children && issue.children.length > 0) {
        issue.children.forEach(processIssue);
      }
    };

    issues.forEach(processIssue);

    // Convert to array and sort by total original estimate (descending)
    return Array.from(typeMap.values()).sort(
      (a, b) => b.totalOriginalEstimate - a.totalOriginalEstimate
    );
  };

  // Get type breakdown for a specific issue
  const getTypeBreakdown = (issue: TypeBreakdownData): TypeSummary[] => {
    const breakdown = analyzeChildrenByType(issue.children || []);

    // Calculate totals for percentage calculations
    const totalEstimate = breakdown.reduce(
      (sum, item) => sum + item.totalOriginalEstimate,
      0
    );
    const totalSpent = breakdown.reduce(
      (sum, item) => sum + item.totalTimeSpent,
      0
    );
    const totalRemaining = breakdown.reduce(
      (sum, item) => sum + item.totalTimeRemaining,
      0
    );

    // Add percentage calculations to each type summary
    return breakdown.map((item) => ({
      ...item,
      estimatePercentage:
        totalEstimate > 0
          ? (item.totalOriginalEstimate / totalEstimate) * 100
          : 0,
      spentPercentage:
        totalSpent > 0 ? (item.totalTimeSpent / totalSpent) * 100 : 0,
      remainingPercentage:
        totalRemaining > 0
          ? (item.totalTimeRemaining / totalRemaining) * 100
          : 0,
    }));
  };

  // Get overall type breakdown across all top-level items
  const getOverallTypeBreakdown = (): TypeSummary[] => {
    if (!data || !data.children) return [];

    // Collect all children from all top-level items
    const allChildren: TypeBreakdownData[] = [];
    data.children.forEach((issue) => {
      if (issue.children) {
        allChildren.push(...issue.children);
      }
    });

    const breakdown = analyzeChildrenByType(allChildren);

    // Calculate totals for percentage calculations
    const totalEstimate = breakdown.reduce(
      (sum, item) => sum + item.totalOriginalEstimate,
      0
    );
    const totalSpent = breakdown.reduce(
      (sum, item) => sum + item.totalTimeSpent,
      0
    );
    const totalRemaining = breakdown.reduce(
      (sum, item) => sum + item.totalTimeRemaining,
      0
    );

    // Add percentage calculations to each type summary
    return breakdown.map((item) => ({
      ...item,
      estimatePercentage:
        totalEstimate > 0
          ? (item.totalOriginalEstimate / totalEstimate) * 100
          : 0,
      spentPercentage:
        totalSpent > 0 ? (item.totalTimeSpent / totalSpent) * 100 : 0,
      remainingPercentage:
        totalRemaining > 0
          ? (item.totalTimeRemaining / totalRemaining) * 100
          : 0,
    }));
  };

  // Toggle expanded state for an item
  const toggleExpanded = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  // Format number for display
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "0";
    return num.toFixed(1);
  };

  // Format percentage for display
  const formatPercentage = (percentage: number): string => {
    return `${percentage.toFixed(1)}%`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (
      statusLower.includes("done") ||
      statusLower.includes("closed") ||
      statusLower.includes("resolved")
    ) {
      return "green";
    } else if (
      statusLower.includes("in progress") ||
      statusLower.includes("active")
    ) {
      return "blue";
    } else if (
      statusLower.includes("blocked") ||
      statusLower.includes("waiting")
    ) {
      return "red";
    }
    return "default";
  };

  if (isLoading) {
    return (
      <Card>
        <Text>Loading data...</Text>
      </Card>
    );
  }

  if (!data || !data.children || data.children.length === 0) {
    return (
      <Card>
        <Text type="secondary">
          No data available. Please run a query to see results.
        </Text>
      </Card>
    );
  }

  const typeBreakdownColumns = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      sorter: (a: TypeSummary, b: TypeSummary) => a.count - b.count,
    },
    {
      title: "Original Estimate (days)",
      dataIndex: "totalOriginalEstimate",
      key: "totalOriginalEstimate",
      render: (value: number) => formatNumber(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.totalOriginalEstimate - b.totalOriginalEstimate,
    },
    {
      title: "Estimate %",
      dataIndex: "estimatePercentage",
      key: "estimatePercentage",
      render: (value: number) => formatPercentage(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.estimatePercentage - b.estimatePercentage,
    },
    {
      title: "Time Spent (days)",
      dataIndex: "totalTimeSpent",
      key: "totalTimeSpent",
      render: (value: number) => formatNumber(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.totalTimeSpent - b.totalTimeSpent,
    },
    {
      title: "Spent %",
      dataIndex: "spentPercentage",
      key: "spentPercentage",
      render: (value: number) => formatPercentage(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.spentPercentage - b.spentPercentage,
    },
    {
      title: "Time Remaining (days)",
      dataIndex: "totalTimeRemaining",
      key: "totalTimeRemaining",
      render: (value: number) => formatNumber(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.totalTimeRemaining - b.totalTimeRemaining,
    },
    {
      title: "Remaining %",
      dataIndex: "remainingPercentage",
      key: "remainingPercentage",
      render: (value: number) => formatPercentage(value),
      sorter: (a: TypeSummary, b: TypeSummary) =>
        a.remainingPercentage - b.remainingPercentage,
    },
  ];

  return (
    <div>
      <Card style={{ marginBottom: "16px" }}>
        <Title level={4}>
          <BarChartOutlined /> Query Results Summary
        </Title>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="Total Issues"
              value={data.children.length}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Original Estimate"
              value={data.children.reduce(
                (sum, issue) => sum + (issue.originalEstimate || 0),
                0
              )}
              suffix="days"
              precision={1}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Time Spent"
              value={data.children.reduce(
                (sum, issue) => sum + (issue.timeSpent || 0),
                0
              )}
              suffix="days"
              precision={1}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Total Time Remaining"
              value={data.children.reduce(
                (sum, issue) => sum + (issue.timeRemaining || 0),
                0
              )}
              suffix="days"
              precision={1}
            />
          </Col>
        </Row>
      </Card>

      <Collapse>
        {data.children.map((issue) => {
          const isExpanded = expandedItems.has(issue.key);
          const typeBreakdown = getTypeBreakdown(issue);
          const totalChildren = issue.children ? issue.children.length : 0;

          return (
            <Panel
              key={issue.key}
              header={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <Space>
                    {isExpanded ? <DownOutlined /> : <RightOutlined />}
                    <Text strong>{issue.key}</Text>
                    <Text>{issue.summary}</Text>
                    <Tag color={getStatusColor(issue.status)}>
                      {issue.status}
                    </Tag>
                    <Tag color="blue">{issue.type}</Tag>
                    {totalChildren > 0 && (
                      <Tag color="green">{totalChildren} children</Tag>
                    )}
                  </Space>
                  <Space>
                    {issue.originalEstimate && (
                      <Text type="secondary">
                        Est: {formatNumber(issue.originalEstimate)}d
                      </Text>
                    )}
                    {issue.timeSpent && (
                      <Text type="secondary">
                        Spent: {formatNumber(issue.timeSpent)}d
                      </Text>
                    )}
                    {issue.timeRemaining && (
                      <Text type="secondary">
                        Remaining: {formatNumber(issue.timeRemaining)}d
                      </Text>
                    )}
                  </Space>
                </div>
              }
              extra={
                <Button
                  type="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(issue.key);
                  }}
                >
                  {isExpanded ? "Collapse" : "Expand"}
                </Button>
              }
            >
              <div style={{ marginTop: "16px" }}>
                <Title level={5}>
                  <BarChartOutlined /> Type Breakdown Analysis
                </Title>

                {typeBreakdown.length > 0 ? (
                  <Table
                    columns={typeBreakdownColumns}
                    dataSource={typeBreakdown}
                    rowKey="type"
                    pagination={false}
                    size="small"
                    style={{ marginBottom: "16px" }}
                    summary={(pageData) => {
                      const totalCount = pageData.reduce(
                        (sum, item) => sum + item.count,
                        0
                      );
                      const totalEstimate = pageData.reduce(
                        (sum, item) => sum + item.totalOriginalEstimate,
                        0
                      );
                      const totalSpent = pageData.reduce(
                        (sum, item) => sum + item.totalTimeSpent,
                        0
                      );
                      const totalRemaining = pageData.reduce(
                        (sum, item) => sum + item.totalTimeRemaining,
                        0
                      );

                      return (
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1}>
                            <Text strong>{totalCount}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={2}>
                            <Text strong>{formatNumber(totalEstimate)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={3}>
                            <Text strong>100.0%</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={4}>
                            <Text strong>{formatNumber(totalSpent)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5}>
                            <Text strong>100.0%</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6}>
                            <Text strong>{formatNumber(totalRemaining)}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7}>
                            <Text strong>100.0%</Text>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      );
                    }}
                  />
                ) : (
                  <Text type="secondary">
                    No children found for this issue.
                  </Text>
                )}

                {issue.url && (
                  <div style={{ marginTop: "8px" }}>
                    <Text type="secondary">
                      <a
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View in Jira →
                      </a>
                    </Text>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </Collapse>

      {/* Overall Summary Section */}
      {data && data.children && data.children.length > 0 && (
        <Card style={{ marginTop: "24px" }}>
          <Title level={4}>
            <BarChartOutlined /> Overall Type Breakdown Summary
          </Title>
          <Text
            type="secondary"
            style={{ marginBottom: "16px", display: "block" }}
          >
            Aggregated data from all top-level items and their children
          </Text>

          {(() => {
            const overallBreakdown = getOverallTypeBreakdown();

            if (overallBreakdown.length === 0) {
              return (
                <Text type="secondary">
                  No children found across all top-level items.
                </Text>
              );
            }

            return (
              <Table
                columns={typeBreakdownColumns}
                dataSource={overallBreakdown}
                rowKey="type"
                pagination={false}
                size="small"
                summary={(pageData) => {
                  const totalCount = pageData.reduce(
                    (sum, item) => sum + item.count,
                    0
                  );
                  const totalEstimate = pageData.reduce(
                    (sum, item) => sum + item.totalOriginalEstimate,
                    0
                  );
                  const totalSpent = pageData.reduce(
                    (sum, item) => sum + item.totalTimeSpent,
                    0
                  );
                  const totalRemaining = pageData.reduce(
                    (sum, item) => sum + item.totalTimeRemaining,
                    0
                  );

                  return (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1}>
                        <Text strong>{totalCount}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <Text strong>{formatNumber(totalEstimate)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3}>
                        <Text strong>100.0%</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <Text strong>{formatNumber(totalSpent)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <Text strong>100.0%</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        <Text strong>{formatNumber(totalRemaining)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7}>
                        <Text strong>100.0%</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            );
          })()}
        </Card>
      )}
    </div>
  );
};

export default TypeBreakdownDisplay;
