import React, { useState, useEffect } from "react";
import { Typography, Space } from "antd";
import { useBottleneckData } from "./hooks/useBottleneckData";
import { QueryInput } from "./components/QueryInput";
import { DataTable } from "./components/DataTable";
import { DEFAULT_JQL_QUERY } from "./constants";
import { BottleneckDetectorProps } from "./types";

const { Title, Paragraph } = Typography;

export const BottleneckDetector: React.FC<BottleneckDetectorProps> = ({
  projectName,
}) => {
  const [currentQuery, setCurrentQuery] = useState<string>("");

  const { isLoading, data, error, jqlQuery, fetchData, clearData } =
    useBottleneckData(projectName);

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

  return (
    <div style={{ padding: "24px" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Title level={2}>Bottleneck Detector</Title>
          <Paragraph>
            Analyze your Jira project for potential bottlenecks by executing
            custom JQL queries. This tool helps identify issues that might be
            blocking progress or causing delays.
          </Paragraph>
        </div>

        <QueryInput
          query={currentQuery}
          onQueryChange={handleQueryChange}
          onExecute={handleExecute}
          onClear={handleClear}
          isLoading={isLoading}
        />

        <DataTable
          data={data}
          error={error}
          isLoading={isLoading}
          jqlQuery={jqlQuery}
        />
      </Space>
    </div>
  );
};

export default BottleneckDetector;
