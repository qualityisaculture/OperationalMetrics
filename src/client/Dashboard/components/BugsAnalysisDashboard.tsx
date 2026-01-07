import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Card, Alert, Radio, Button } from "antd";
import { useBugsAnalysisData } from "../../BugsAnalysis/hooks/useBugsAnalysisData";
import { BugsAnalysisChart } from "../../BugsAnalysis/components/BugsAnalysisChart";
import { ViewMode } from "../../BugsAnalysis/types";

interface BugsAnalysisDashboardProps {
  query: string;
  viewMode: ViewMode;
  readOnly?: boolean;
}

export interface BugsAnalysisDashboardRef {
  requestData: () => void;
}

const BugsAnalysisDashboard = forwardRef<BugsAnalysisDashboardRef, BugsAnalysisDashboardProps>(({
  query,
  viewMode: initialViewMode,
  readOnly = false,
}, ref) => {
  const { data, loading, error, fetchData } = useBugsAnalysisData();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [hasRequestedData, setHasRequestedData] = useState(false);

  // Update view mode if prop changes
  useEffect(() => {
    setViewMode(initialViewMode);
  }, [initialViewMode]);

  const handleRequestData = async () => {
    if (!query || !query.trim()) {
      return;
    }
    setHasRequestedData(true);
    await fetchData(query);
  };

  useImperativeHandle(ref, () => ({
    requestData: handleRequestData,
  }));

  if (!query || !query.trim()) {
    return (
      <Alert
        message="No Query Configured"
        description="Please configure a JQL query for this metric."
        type="warning"
        showIcon
      />
    );
  }

  // Show request button if no data has been requested yet
  if (!hasRequestedData && !data) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Alert
          message="Click the button below to load bugs analysis data."
          type="info"
          showIcon
          style={{ marginBottom: "1rem" }}
        />
        <Button
          type="primary"
          onClick={handleRequestData}
          loading={loading}
          disabled={loading}
        >
          Request Data
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Alert message="Loading bugs analysis data..." type="info" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: "1rem" }}
          action={
            <Button
              size="small"
              onClick={handleRequestData}
              loading={loading}
            >
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Alert
          message="No Data"
          description="No data available. Please check your query and try again."
          type="info"
          showIcon
          style={{ marginBottom: "1rem" }}
        />
        <Button
          type="primary"
          onClick={handleRequestData}
          loading={loading}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {!readOnly && (
        <Card style={{ marginBottom: "16px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              View Mode:
            </label>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
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
      )}

      {readOnly && (
        <div style={{ marginBottom: "16px", padding: "12px", backgroundColor: "#f5f5f5", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Total Issues:</strong> {data.issues.length} |{" "}
            <strong>Resolved:</strong>{" "}
            {data.issues.filter((i) => i.resolved !== null).length} |{" "}
            <strong>Unresolved:</strong>{" "}
            {data.issues.filter((i) => i.resolved === null).length} |{" "}
            <strong>Quarters:</strong> {data.quarterlyData?.length || 0}
          </div>
          <Button
            onClick={handleRequestData}
            loading={loading}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      )}

      <Card>
        {data.quarterlyData && data.quarterlyData.length > 0 ? (
          <>
            <BugsAnalysisChart data={data} mode={viewMode} />
            <div id="bugs-analysis-notes" style={{ marginTop: "16px" }}></div>
          </>
        ) : (
          <div>No quarterly data available. Please check your query and try again.</div>
        )}
      </Card>
    </div>
  );
});

BugsAnalysisDashboard.displayName = "BugsAnalysisDashboard";

export default BugsAnalysisDashboard;

