import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { EstimatesData } from "../server/graphManagers/EstimatesGraphManager";

export function getSize(
  issues: IssueInfo[],
  sizeMode: "count" | "estimate" | "time booked"
) {
  if (sizeMode === "count") {
    return issues.length;
  } else if (sizeMode === "estimate") {
    return issues.reduce(
      (sum, issue) => sum + (issue.timeoriginalestimate || 0),
      0
    );
  } else if (sizeMode === "time booked") {
    return issues.reduce((sum, issue) => sum + (issue.timespent || 0), 0);
  } else {
    throw new Error("Invalid size mode");
  }
}

export function createCSV(estimatesData: EstimatesData) {
  var csv =
    "key,type,originalEstimate,timeSpent," +
    estimatesData.uniqueStatuses.join(",") +
    "\n";
  estimatesData.estimateData.forEach((item) => {
    if (item.originalEstimate) {
      csv +=
        item.key +
        "," +
        item.type +
        "," +
        item.originalEstimate +
        "," +
        item.timeSpent +
        ",";
      estimatesData.uniqueStatuses.forEach((status) => {
        let statusTime = item.statusTimes.find(
          (statusTime) => statusTime.status === status
        );
        csv += statusTime ? statusTime.days : 0;
        csv += ",";
      });
      csv += "\n";
    }
  });
  var hiddenElement = document.createElement("a");
  hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  hiddenElement.target = "_blank";
  hiddenElement.download = "estimates.csv";
  hiddenElement.click();
}

export function createThroughputCSV(issues: IssueInfo[]) {
  const headers = [
    "Jira ID",
    "Summary",
    "Type",
    "Initiative",
    "Labels",
    "Account",
    "Status",
    "Created Date",
    "Resolved Date",
    "Original Estimate (days)",
    "Time Spent (days)",
    "Story Points",
    "URL",
  ].join(",");

  const rows = issues.map((issue) => {
    const formatNumber = (value: number | null | undefined) =>
      value != null ? value.toFixed(2) : "0.00";
    return [
      issue.key,
      `"${issue.summary.replace(/"/g, '""')}"`, // Escape quotes in summary
      issue.type,
      issue.initiativeKey || "None",
      `"${issue.labels.join(";")}"`,
      issue.account || "None",
      issue.status,
      issue.created,
      issue.resolved || "Not resolved",
      formatNumber(issue.timeoriginalestimate),
      formatNumber(issue.timespent),
      issue.url,
    ].join(",");
  });

  const csv = [headers, ...rows].join("\n");

  const hiddenElement = document.createElement("a");
  hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  hiddenElement.target = "_blank";
  hiddenElement.download = "throughput_data.csv";
  hiddenElement.click();
}
