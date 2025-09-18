import React, { useState, useEffect } from "react";
import { Alert, Button, Input, Space, Typography, Card } from "antd";
import { SearchOutlined, BarChartOutlined } from "@ant-design/icons";
import { LoadingIndicator } from "../components";

const { Title, Text } = Typography;

const TypeBreakdownAnalyser: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved query from localStorage or URL parameters on component mount
  useEffect(() => {
    // Check URL parameters first
    const urlQuery = new URLSearchParams(window.location.search).get(
      "typeBreakdownQuery"
    );

    // Use URL parameter if available, otherwise use localStorage
    const savedQuery =
      urlQuery || localStorage.getItem("typeBreakdownAnalyserQuery");

    if (savedQuery) {
      setQuery(savedQuery);
    }
  }, []);

  const handleQuerySubmit = async () => {
    if (!query.trim()) {
      setError("Please enter a JQL query");
      return;
    }

    // Save query to localStorage
    localStorage.setItem("typeBreakdownAnalyserQuery", query);

    setIsLoading(true);
    setError(null);

    try {
      console.log("Submitting query:", query);

      const eventSource = new EventSource(
        `/api/typeBreakdownAnalyser?query=${encodeURIComponent(query)}`
      );

      eventSource.onmessage = (event) => {
        const response = JSON.parse(event.data);

        if (response.status === "processing") {
          console.log("Processing:", response.message);
          // You could show progress updates here if needed
        } else if (response.status === "complete" && response.data) {
          const data = JSON.parse(response.data);
          console.log("=== TYPE BREAKDOWN ANALYSER DATA ===");
          console.log("Query:", query);
          console.log("Root issue:", data);
          console.log(
            "Children count:",
            data.children ? data.children.length : 0
          );
          console.log("Full data structure:", data);
          console.log("=== END DATA ===");

          eventSource.close();
          setIsLoading(false);
        } else if (response.status === "error") {
          console.error("API error:", response.message);
          setError(response.message || "Failed to analyse data");
          eventSource.close();
          setIsLoading(false);
        }
      };

      eventSource.onerror = () => {
        console.error("SSE connection error");
        setError("Connection error while analysing data");
        eventSource.close();
        setIsLoading(false);
      };
    } catch (err) {
      console.error("Error submitting query:", err);
      setError("Failed to submit query. Please try again.");
      setIsLoading(false);
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (error) setError(null);
  };

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ marginBottom: "24px" }}>
        <Space align="center">
          <Title level={2} style={{ margin: 0 }}>
            <BarChartOutlined /> Type Breakdown Analyser
          </Title>
        </Space>
      </div>

      <Card style={{ marginBottom: "24px" }}>
        <Alert
          message="Type Breakdown Analyser"
          description="This tool is for analysing the estimation breakdown by Jira type. Enter a JQL query to fetch issues and their children recursively, then explore the data structure in the browser console."
          type="info"
          showIcon
          style={{ marginBottom: "16px" }}
        />

        <Space.Compact style={{ width: "100%" }}>
          <Input
            placeholder="Enter JQL query (e.g., project = 'PROJ' AND type = 'Epic')"
            value={query}
            onChange={handleQueryChange}
            onPressEnter={handleQuerySubmit}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleQuerySubmit}
            loading={isLoading}
            disabled={!query.trim()}
          >
            Analyse
          </Button>
        </Space.Compact>
      </Card>

      <LoadingIndicator
        loading={isLoading}
        message="Fetching and analysing data..."
        size="large"
        style={{ padding: "50px" }}
        showProgressDetails={false}
      />

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ margin: "16px" }}
          action={
            <Button size="small" danger onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        />
      )}
    </div>
  );
};

export default TypeBreakdownAnalyser;
