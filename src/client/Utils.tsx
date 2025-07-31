import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { EstimatesData } from "../server/graphManagers/EstimatesGraphManager";
import { SprintIssueList } from "../server/graphManagers/GraphManagerTypes";

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

export function createThroughputSplitExcel(
  throughputData: SprintIssueList[],
  openTicketsData: IssueInfo[],
  splitMode: "labels" | "initiatives" | "types" | "accounts" | "sankey",
  selectedItems: string[],
  sizeMode: "count" | "time booked" | "estimate"
) {
  // Don't export for sankey mode as it has a different data structure
  if (splitMode === "sankey") {
    alert(
      "Excel export is not available for Sankey diagram mode. Please select a different split mode."
    );
    return;
  }

  // Create headers
  const headers = ["Sprint Start Date"];

  // Add selected categories
  selectedItems.forEach((item) => {
    headers.push(item);
  });

  // Add "Other" category
  headers.push("Other");

  // Add "Total" column
  headers.push("Total");

  // Helper function to get issues by category
  const getIssuesByCategory = (issues: IssueInfo[]) => {
    const issuesByCategory = new Map<string, IssueInfo[]>();

    issues.forEach((issue) => {
      let category = "Other";

      if (splitMode === "initiatives") {
        if (selectedItems.includes(issue.initiativeKey)) {
          category = issue.initiativeKey;
        }
      } else if (splitMode === "labels") {
        const matchingLabels = issue.labels.filter((label) =>
          selectedItems.includes(label)
        );
        if (matchingLabels.length > 0) {
          category = matchingLabels[0];
        }
      } else if (splitMode === "types") {
        if (selectedItems.includes(issue.type)) {
          category = issue.type;
        }
      } else if (splitMode === "accounts") {
        if (selectedItems.includes(issue.account)) {
          category = issue.account;
        }
      }

      if (!issuesByCategory.has(category)) {
        issuesByCategory.set(category, []);
      }
      issuesByCategory.get(category)!.push(issue);
    });

    return issuesByCategory;
  };

  // Create rows for historical sprint data
  const rows = throughputData.map((sprint) => {
    const row = [new Date(sprint.sprintStartingDate).toLocaleDateString()];

    const issuesByCategory = getIssuesByCategory(sprint.issueList);

    // Add values for each selected category
    selectedItems.forEach((item) => {
      const issues = issuesByCategory.get(item) || [];
      row.push(getSize(issues, sizeMode).toString());
    });

    // Add "Other" value
    const otherIssues = issuesByCategory.get("Other") || [];
    row.push(getSize(otherIssues, sizeMode).toString());

    // Add "Total" value
    const totalIssues = [...selectedItems, "Other"].flatMap(
      (item) => issuesByCategory.get(item) || []
    );
    row.push(getSize(totalIssues, sizeMode).toString());

    return row;
  });

  // Add open tickets row
  const openTicketsRow = ["Open Tickets"];
  const openTicketsByCategory = getIssuesByCategory(openTicketsData);

  // Add values for each selected category
  selectedItems.forEach((item) => {
    const issues = openTicketsByCategory.get(item) || [];
    openTicketsRow.push(getSize(issues, sizeMode).toString());
  });

  // Add "Other" value
  const otherOpenTickets = openTicketsByCategory.get("Other") || [];
  openTicketsRow.push(getSize(otherOpenTickets, sizeMode).toString());

  // Add "Total" value for open tickets
  const totalOpenTickets = [...selectedItems, "Other"].flatMap(
    (item) => openTicketsByCategory.get(item) || []
  );
  openTicketsRow.push(getSize(totalOpenTickets, sizeMode).toString());

  // Add open tickets row to the data
  rows.push(openTicketsRow);

  // Create CSV content
  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  // Create and trigger download
  const hiddenElement = document.createElement("a");
  hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  hiddenElement.target = "_blank";
  hiddenElement.download = `throughput_${splitMode}_${sizeMode}.csv`;
  hiddenElement.click();
}
