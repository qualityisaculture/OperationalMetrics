import React, { useState, useImperativeHandle, forwardRef } from "react";
import { Alert, Button, List } from "antd";
import { ElapsedTime } from "../../../server/graphManagers/TimeInDevManager";
import {
  TimeInDevSummary,
  TimeInDevIssueDetail,
} from "../../TimeInDev";
import { TimeInDevConfig } from "../types";

interface TimeInDevDashboardProps extends TimeInDevConfig {
  readOnly?: boolean;
}

export interface TimeInDevDashboardRef {
  requestData: () => void;
}

function timeInSelectedStatus(
  issue: ElapsedTime,
  statusesSelected: string[]
): number {
  let time = 0;
  issue.statuses.forEach((status) => {
    if (statusesSelected.includes(status.status)) {
      time += status.days;
    }
  });
  return time;
}

function getSortedIssues(
  issues: ElapsedTime[],
  sortBy: "timespent" | "status",
  statusesSelected: string[]
): ElapsedTime[] {
  const copy = [...issues];
  if (sortBy === "timespent") {
    return copy.sort((a, b) => b.timespent - a.timespent);
  }
  return copy.sort(
    (a, b) =>
      timeInSelectedStatus(b, statusesSelected) -
      timeInSelectedStatus(a, statusesSelected)
  );
}

function buildQuery(userQuery: string, filterActiveSprints: boolean): string {
  const trimmed = userQuery.trim();
  if (filterActiveSprints && trimmed) {
    return "sprint in openSprints() AND " + trimmed;
  }
  if (filterActiveSprints && !trimmed) {
    return "sprint in openSprints()";
  }
  return trimmed || "";
}

const TimeInDevDashboard = forwardRef<
  TimeInDevDashboardRef,
  TimeInDevDashboardProps
>(
  (
    {
      query,
      filterActiveSprints = true,
      sortBy = "timespent",
      statusesSelected = [],
      readOnly = true,
    },
    ref
  ) => {
    const [issues, setIssues] = useState<ElapsedTime[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRequestedData, setHasRequestedData] = useState(false);

    const handleRequestData = async () => {
      const effectiveQuery = buildQuery(query, filterActiveSprints);
      if (!effectiveQuery) {
        setError("No query configured.");
        return;
      }
      setHasRequestedData(true);
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "/api/timeInDev?query=" + encodeURIComponent(effectiveQuery)
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Request failed");
        }
        const parsed: ElapsedTime[] = JSON.parse(data.data);
        setIssues(parsed);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
        setIssues([]);
      } finally {
        setLoading(false);
      }
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

    if (!hasRequestedData && issues.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Alert
            message="Click the button below to load Time In Dev data."
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
          <Alert message="Loading Time In Dev data..." type="info" />
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
              <Button size="small" onClick={handleRequestData} loading={loading}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }

    const allStatuses = new Set<string>();
    issues.forEach((issue) => {
      issue.statuses.forEach((s) => allStatuses.add(s.status));
    });
    const effectiveStatuses =
      statusesSelected.length > 0
        ? statusesSelected
        : Array.from(allStatuses);

    const sortedIssues = getSortedIssues(
      issues,
      sortBy,
      effectiveStatuses
    );
    const summaryIssues = sortedIssues.map((issue) => ({
      key: issue.key,
      summary: issue.summary,
      url: issue.url,
      daysBooked: issue.timespent,
      daysInStatuses: timeInSelectedStatus(issue, effectiveStatuses),
    }));

    return (
      <div>
        {readOnly && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              <strong>Sort:</strong> {sortBy === "timespent" ? "Time Spent" : "Status"}
              {" · "}
              <strong>Issues:</strong> {issues.length}
            </span>
            <Button
              onClick={handleRequestData}
              loading={loading}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        )}
        <TimeInDevSummary issues={summaryIssues} />
        <List
          header="Issues"
          bordered
          dataSource={sortedIssues}
          renderItem={(issue) => (
            <TimeInDevIssueDetail
              issue={issue}
              totalDays={timeInSelectedStatus(issue, effectiveStatuses)}
            />
          )}
        />
      </div>
    );
  }
);

TimeInDevDashboard.displayName = "TimeInDevDashboard";

export default TimeInDevDashboard;
