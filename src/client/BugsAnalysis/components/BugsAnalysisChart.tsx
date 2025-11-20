import React from "react";
import ColumnChart, { ColumnType, CategoryData } from "../../ColumnChart";
import { BugsAnalysisData, ViewMode } from "../types";

interface BugsAnalysisChartProps {
  data: BugsAnalysisData;
  mode: ViewMode;
}

export const BugsAnalysisChart: React.FC<BugsAnalysisChartProps> = ({
  data,
  mode,
}) => {
  if (mode === "count") {
    return <CountChart data={data} />;
  } else {
    return <AverageTimeSpentChart data={data} />;
  }
};

const CountChart: React.FC<{ data: BugsAnalysisData }> = ({ data }) => {
  console.log("CountChart - data:", data);
  
  if (!data || !data.quarterlyData || data.quarterlyData.length === 0) {
    console.log("CountChart - No data available");
    return <div>No data available to display</div>;
  }

  const columns: ColumnType[] = [
    { type: "string", identifier: "quarter", label: "Quarter" },
    { type: "number", identifier: "unresolved", label: "Unresolved" },
    { type: "number", identifier: "resolved", label: "Resolved" },
  ];

  const chartData: CategoryData = data.quarterlyData.map((quarter) => ({
    quarter: quarter.quarter,
    unresolved: quarter.unresolved,
    resolved: quarter.resolved,
    clickData: getClickData(quarter),
  }));

  console.log("CountChart - chartData:", chartData);
  console.log("CountChart - columns:", columns);

  if (chartData.length === 0) {
    return <div>No quarterly data to display</div>;
  }

  const options = {
    isStacked: true,
    colors: ["#f5222d", "#52c41a"], // Red for unresolved (bottom), green for resolved (top)
    legend: { position: "bottom" },
    hAxis: { title: "Quarter" },
    vAxis: { title: "Number of Issues", minValue: 0 },
  };

  return (
    <ColumnChart
      title="Bugs Analysis by Quarter (Resolved vs Unresolved)"
      columns={columns}
      data={chartData}
      extraOptions={options}
      targetElementId="bugs-analysis-notes"
    />
  );
};

const AverageTimeSpentChart: React.FC<{ data: BugsAnalysisData }> = ({
  data,
}) => {
  if (!data || !data.quarterlyData || data.quarterlyData.length === 0) {
    return <div>No data available to display</div>;
  }

  // Filter to only quarters with resolved issues that have time spent data
  const quartersWithData = data.quarterlyData.filter(
    (q) => q.averageTimeSpent !== null && q.resolved > 0
  );

  if (quartersWithData.length === 0) {
    return <div>No resolved issues with time spent data available</div>;
  }

  const columns: ColumnType[] = [
    { type: "string", identifier: "quarter", label: "Quarter" },
    { type: "number", identifier: "averageTimeSpent", label: "Average Time Spent (days)" },
  ];

  const chartData: CategoryData = quartersWithData.map((quarter) => ({
    quarter: quarter.quarter,
    averageTimeSpent: quarter.averageTimeSpent!,
    clickData: getAverageTimeSpentClickData(quarter),
  }));

  const options = {
    colors: ["#1890ff"], // Blue for average time spent
    legend: { position: "bottom" },
    hAxis: { title: "Quarter" },
    vAxis: { title: "Average Time Spent (days)", minValue: 0 },
  };

  return (
    <ColumnChart
      title="Average Time Spent by Quarter (Resolved Issues Only)"
      columns={columns}
      data={chartData}
      extraOptions={options}
      targetElementId="bugs-analysis-notes"
    />
  );
};

function getClickData(quarter: any): string {
  let clickData = "";
  clickData += `<strong>Quarter: ${quarter.quarter}</strong><br>`;
  clickData += `Resolved: ${quarter.resolved}<br>`;
  clickData += `Unresolved: ${quarter.unresolved}<br><br>`;

  if (quarter.resolvedIssues.length > 0) {
    clickData += "<strong>Resolved Issues:</strong><br>";
    quarter.resolvedIssues.forEach((issue: any) => {
      clickData += `<a href="${issue.url}" target="_blank">${issue.key}</a> ${issue.summary}<br>`;
    });
    clickData += "<br>";
  }

  if (quarter.unresolvedIssues.length > 0) {
    clickData += "<strong>Unresolved Issues:</strong><br>";
    quarter.unresolvedIssues.forEach((issue: any) => {
      clickData += `<a href="${issue.url}" target="_blank">${issue.key}</a> ${issue.summary}<br>`;
    });
  }

  return clickData;
}

function getAverageTimeSpentClickData(quarter: any): string {
  let clickData = "";
  clickData += `<strong>Quarter: ${quarter.quarter}</strong><br>`;
  clickData += `Average Time Spent: ${quarter.averageTimeSpent?.toFixed(2)} days<br>`;
  clickData += `Resolved Issues: ${quarter.resolved}<br><br>`;

  if (quarter.resolvedIssues.length > 0) {
    clickData += "<strong>Resolved Issues:</strong><br>";
    quarter.resolvedIssues.forEach((issue: any) => {
      const timeSpent = issue.timeSpent
        ? `${issue.timeSpent.toFixed(2)} days`
        : "No time spent";
      clickData += `<a href="${issue.url}" target="_blank">${issue.key}</a> ${issue.summary} (${timeSpent})<br>`;
    });
  }

  return clickData;
}

