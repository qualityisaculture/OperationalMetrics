import React from "react";
import { Card, Typography, Space, List, Tag } from "antd";
import { Queue } from "../types";
import { LiteJiraIssue } from "../../../server/JiraRequester";

const { Title, Text } = Typography;

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

  const renderIssueItem = (issue: LiteJiraIssue) => (
    <List.Item key={issue.key}>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Space>
          <Text strong>{issue.key}</Text>
          <Tag color="blue">{issue.status}</Tag>
        </Space>
        <Text>{issue.summary}</Text>
        <Text type="secondary" style={{ fontSize: "12px" }}>
          Type: {issue.type}
        </Text>
      </Space>
    </List.Item>
  );

  return (
    <div style={{ overflowX: "auto", padding: "16px 0" }}>
      <div style={{ display: "flex", gap: "16px", minWidth: "max-content" }}>
        {/* Uncategorized Queue (always first) */}
        <Card
          title={
            <Space>
              <Text strong>Uncategorized</Text>
              <Tag color="orange">
                {queueIssues["uncategorized"]?.length || 0}
              </Tag>
            </Space>
          }
          style={{
            minWidth: 300,
            maxWidth: 300,
            border: "2px dashed #d9d9d9",
            backgroundColor: "#fafafa",
          }}
        >
          <List
            size="small"
            dataSource={queueIssues["uncategorized"] || []}
            renderItem={renderIssueItem}
            locale={{ emptyText: "All issues categorized!" }}
            style={{ maxHeight: 400, overflowY: "auto" }}
          />
        </Card>

        {/* User-defined queues */}
        {sortedQueues.map((queue) => (
          <Card
            key={queue.id}
            title={
              <Space>
                <Text strong>{queue.name}</Text>
                <Tag color="green">{queueIssues[queue.id]?.length || 0}</Tag>
              </Space>
            }
            style={{
              minWidth: 300,
              maxWidth: 300,
              border: "2px solid #1890ff",
              backgroundColor: "#f0f8ff",
            }}
          >
            <List
              size="small"
              dataSource={queueIssues[queue.id] || []}
              renderItem={renderIssueItem}
              locale={{ emptyText: "No issues in this queue" }}
              style={{ maxHeight: 400, overflowY: "auto" }}
            />
          </Card>
        ))}

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
