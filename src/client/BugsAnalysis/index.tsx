import React, { useState } from "react";
import { Input, Button, Radio, Card, Alert, Select, Space, Popconfirm } from "antd";
import { DeleteOutlined, SaveOutlined } from "@ant-design/icons";
import { useBugsAnalysisData } from "./hooks/useBugsAnalysisData";
import { BugsAnalysisChart } from "./components/BugsAnalysisChart";
import { ViewMode } from "./types";
import { useSavedQueries } from "./hooks/useSavedQueries";

const { TextArea } = Input;
const { Option } = Select;

const BugsAnalysis: React.FC = () => {
  const [query, setQuery] = useState<string>(
    localStorage.getItem("bugsAnalysisQuery") || ""
  );
  const [mode, setMode] = useState<ViewMode>(
    (localStorage.getItem("bugsAnalysisMode") as ViewMode) || "count"
  );
  const [queryName, setQueryName] = useState<string>("");
  const [selectedSavedQuery, setSelectedSavedQuery] = useState<string>("");
  const { data, loading, error, fetchData } = useBugsAnalysisData();
  const { savedQueries, saveQuery, deleteQuery, loadQuery } = useSavedQueries();

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    localStorage.setItem("bugsAnalysisQuery", newQuery);
  };

  const handleModeChange = (e: any) => {
    const newMode = e.target.value as ViewMode;
    setMode(newMode);
    localStorage.setItem("bugsAnalysisMode", newMode);
  };

  const handleSubmit = () => {
    fetchData(query);
  };

  const handleSaveQuery = () => {
    if (saveQuery(queryName, query)) {
      setQueryName("");
      // Show success message (you could use a notification here)
      alert("Query saved successfully!");
    } else {
      alert("Please enter both a name and a query to save.");
    }
  };

  const handleLoadQuery = (queryId: string) => {
    const loadedQuery = loadQuery(queryId);
    if (loadedQuery) {
      setQuery(loadedQuery);
      localStorage.setItem("bugsAnalysisQuery", loadedQuery);
      setSelectedSavedQuery(queryId);
    }
  };

  const handleDeleteQuery = (queryId: string) => {
    if (deleteQuery(queryId)) {
      if (selectedSavedQuery === queryId) {
        setSelectedSavedQuery("");
      }
    }
  };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Bugs Analysis</h2>

      <Card style={{ marginBottom: "16px" }}>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            Saved Queries:
          </label>
          <Select
            placeholder="Select a saved query to load"
            value={selectedSavedQuery || undefined}
            onChange={handleLoadQuery}
            style={{ width: "100%", marginBottom: "8px" }}
            allowClear
            onClear={() => setSelectedSavedQuery("")}
          >
            {savedQueries.map((savedQuery) => (
              <Option key={savedQuery.id} value={savedQuery.id}>
                {savedQuery.name}
              </Option>
            ))}
          </Select>
          {selectedSavedQuery && (
            <div style={{ marginBottom: "8px" }}>
              {savedQueries
                .filter((q) => q.id === selectedSavedQuery)
                .map((q) => (
                  <Space key={q.id}>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      {q.query}
                    </span>
                    <Popconfirm
                      title="Are you sure you want to delete this saved query?"
                      onConfirm={() => handleDeleteQuery(q.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                      >
                        Delete
                      </Button>
                    </Popconfirm>
                  </Space>
                ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "8px" }}>
            JQL Query:
          </label>
          <TextArea
            value={query}
            onChange={handleQueryChange}
            placeholder="Enter a JQL query to analyze bugs (e.g., project = 'PROJ' AND type = Bug)"
            rows={3}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <Space>
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              size="large"
            >
              Analyze
            </Button>
            <Input
              placeholder="Query name"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              style={{ width: "200px" }}
              onPressEnter={handleSaveQuery}
            />
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveQuery}
              disabled={!queryName.trim() || !query.trim()}
            >
              Save Query
            </Button>
          </Space>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            style={{ marginBottom: "16px" }}
          />
        )}
      </Card>

      {data && (
        <>
          <Card style={{ marginBottom: "16px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "8px" }}>
                View Mode:
              </label>
              <Radio.Group
                value={mode}
                onChange={handleModeChange}
                buttonStyle="solid"
              >
                <Radio.Button value="count">Count (Resolved vs Unresolved)</Radio.Button>
                <Radio.Button value="averageTimeSpent">
                  Average Time Spent
                </Radio.Button>
              </Radio.Group>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <strong>Total Issues:</strong> {data.issues.length}
              <br />
              <strong>Total Resolved:</strong>{" "}
              {data.issues.filter((i) => i.resolved !== null).length}
              <br />
              <strong>Total Unresolved:</strong>{" "}
              {data.issues.filter((i) => i.resolved === null).length}
              <br />
              <strong>Quarters:</strong> {data.quarterlyData?.length || 0}
            </div>
          </Card>

          <Card>
            {data.quarterlyData && data.quarterlyData.length > 0 ? (
              <>
                <BugsAnalysisChart data={data} mode={mode} />
                <div id="bugs-analysis-notes" style={{ marginTop: "16px" }}></div>
              </>
            ) : (
              <div>No quarterly data available. Please check your query and try again.</div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default BugsAnalysis;

