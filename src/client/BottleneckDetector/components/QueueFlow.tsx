import React from "react";
import { Card, Typography, Space, Tag } from "antd";
import { Queue } from "../types";
import { LiteJiraIssue } from "../../../server/JiraRequester";
import { UnifiedIssuesTable } from "../../components/tables/UnifiedIssuesTable";

const { Text } = Typography;

interface QueueFlowProps {
  queues: Queue[];
  issues: LiteJiraIssue[];
}

export const QueueFlow: React.FC<QueueFlowProps> = ({ queues, issues }) => {
  // Group issues by queue
  const getIssuesByQueue = () => {
    const queueIssues: { [key: string]: LiteJiraIssue[] } = {};

    // Initialize all queues with empty arrays
    queues.forEach((queue) => {
      queueIssues[queue.id] = [];
    });

    // Add uncategorized queue
    queueIssues["uncategorized"] = [];

    // Distribute issues to queues
    issues.forEach((issue) => {
      let assigned = false;

      // Check if issue status matches any queue
      for (const queue of queues) {
        if (queue.statuses.includes(issue.status)) {
          queueIssues[queue.id].push(issue);
          assigned = true;
          break;
        }
      }

      // If not assigned to any queue, put in uncategorized
      if (!assigned) {
        queueIssues["uncategorized"].push(issue);
      }
    });

    return queueIssues;
  };

  const queueIssues = getIssuesByQueue();

  // Sort queues by order
  const sortedQueues = [...queues].sort((a, b) => a.order - b.order);

  const renderQueueSection = (
    title: string,
    dataSource: LiteJiraIssue[],
    tagColor: string
  ) => (
    <UnifiedIssuesTable
      title={
        <Space>
          <Text strong>{title}</Text>
          <Tag color={tagColor}>{dataSource.length}</Tag>
        </Space>
      }
      dataSource={dataSource}
      rowKey="key"
      showFavoriteColumn={false}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
      }}
    />
  );

  return (
    <div style={{ overflowX: "auto", padding: "16px 0" }}>
      <div style={{ display: "flex", gap: "16px", minWidth: "max-content" }}>
        {/* Uncategorized Queue (always first) */}
        {renderQueueSection(
          "Uncategorized",
          queueIssues["uncategorized"] || [],
          "orange"
        )}

        {/* User-defined queues */}
        {sortedQueues.map((queue) =>
          renderQueueSection(queue.name, queueIssues[queue.id] || [], "green")
        )}

        {/* Empty state when no queues */}
        {queues.length === 0 && (
          <Card
            style={{
              minWidth: 300,
              maxWidth: 300,
              border: "2px dashed #d9d9d9",
              backgroundColor: "#fafafa",
            }}
          >
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text type="secondary">
                Create your first queue to start organizing issues!
              </Text>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
