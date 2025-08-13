import React, { useState, useEffect } from "react";
import { Typography, Space, Card, Button, Alert } from "antd";
import { useBottleneckData } from "./hooks/useBottleneckData";
import { useQueueManager } from "./hooks/useQueueManager";
import { QueryInput } from "./components/QueryInput";
import { QueueManager } from "./components/QueueManager";
import { QueueFlow } from "./components/QueueFlow";
import { DEFAULT_JQL_QUERY } from "./constants";
import { BottleneckDetectorProps } from "./types";

const { Title, Paragraph, Text } = Typography;

export const BottleneckDetector: React.FC<BottleneckDetectorProps> = ({
  projectName,
}) => {
  const [currentQuery, setCurrentQuery] = useState<string>("");

  const { isLoading, data, error, jqlQuery, fetchData, clearData } =
    useBottleneckData(projectName);

  const {
    queues,
    updateQueues,
    getUnassignedStatuses,
    getUncategorizedIssues,
  } = useQueueManager(projectName);

  // Sync currentQuery with the saved query from localStorage when it's loaded
  useEffect(() => {
    if (jqlQuery) {
      setCurrentQuery(jqlQuery);
    } else {
      // Only use default if no saved query exists
      setCurrentQuery(DEFAULT_JQL_QUERY.replace("PROJECT", projectName));
    }
  }, [jqlQuery, projectName]);

  const handleQueryChange = (query: string) => {
    setCurrentQuery(query);
  };

  const handleExecute = () => {
    if (currentQuery.trim()) {
      fetchData(currentQuery);
    }
  };

  const handleClear = () => {
    setCurrentQuery("");
    clearData();
  };

  // Get unassigned statuses for the QueueManager
  const unassignedStatuses = data ? getUnassignedStatuses(data) : [];

  // Get uncategorized issues count
  const uncategorizedCount = data ? getUncategorizedIssues(data).length : 0;

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Bottleneck Detector</Title>
          <Paragraph>
            Analyze your Jira project for potential bottlenecks by organizing
            issues into custom queues. Create queues, assign statuses to them,
            and visualize how issues flow through your SDLC.
          </Paragraph>
        </div>

        <QueryInput
          query={currentQuery}
          onQueryChange={handleQueryChange}
          onExecute={handleExecute}
          onClear={handleClear}
          isLoading={isLoading}
        />

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
          />
        )}

        {data && (
          <>
            <Card>
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text strong>Data Summary</Text>
                  <Space>
                    <Text>Total Issues: {data.length}</Text>
                    <Text>Uncategorized: {uncategorizedCount}</Text>
                    <Text>Queues: {queues.length}</Text>
                  </Space>
                </div>
              </Space>
            </Card>

            <QueueManager
              queues={queues}
              unassignedStatuses={unassignedStatuses}
              onQueuesChange={updateQueues}
            />

            <QueueFlow queues={queues} issues={data} />
          </>
        )}

        {!data && !isLoading && (
          <Card>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <Text type="secondary">
                Execute a query above to start analyzing your project for
                bottlenecks.
              </Text>
            </div>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default BottleneckDetector;
