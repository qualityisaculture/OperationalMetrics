import * as XLSX from "xlsx";

export const exportToExcel = (
  data: any[],
  filename: string = "export.xlsx"
) => {
  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Create a worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Generate the Excel file
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    // Create a blob and download link
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link element and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    return false;
  }
};

export const exportWorkstreamToExcel = (
  workstreamData: any[],
  workstreamName: string
) => {
  // Add summary row at the top
  const summaryRow = {
    Key: `Project: ${workstreamName}`,
    Summary: `Export Date: ${new Date().toLocaleDateString()}`,
    Type: `Total Workstreams: ${workstreamData.length}`,
    Status: "",
    Account: "",
    ChildCount: "",
    "Original Estimate (days)": "",
    "Time Spent (days)": "",
    "Time Remaining (days)": "",
    "Aggregated Original Estimate (days)": "",
    "Aggregated Time Spent (days)": "",
    "Aggregated Time Remaining (days)": "",
  };

  // Export all the workstream data with both raw and aggregated values
  const workstreamRows = workstreamData.map((workstream) => ({
    // Basic workstream information
    Key: workstream.key,
    Summary: workstream.summary,
    Type: workstream.type,
    Status: workstream.status,
    Account: workstream.account,
    ChildCount: workstream.childCount,

    // Individual estimates and time (workstream's own values)
    "Original Estimate (days)": workstream.originalEstimate || 0,
    "Time Spent (days)": workstream.timeSpent || 0,
    "Time Remaining (days)": workstream.timeRemaining || 0,

    // Aggregated estimates and time (including all children)
    "Aggregated Original Estimate (days)":
      workstream.aggregatedOriginalEstimate || 0,
    "Aggregated Time Spent (days)": workstream.aggregatedTimeSpent || 0,
    "Aggregated Time Remaining (days)": workstream.aggregatedTimeRemaining || 0,
  }));

  // Combine summary row with workstream data
  const data = [summaryRow, ...workstreamRows];

  const filename = `${workstreamName.replace(/[^a-zA-Z0-9]/g, "_")}_workstreams_export.xlsx`;
  return exportToExcel(data, filename);
};

export const exportIssuesToExcel = (
  issuesData: any[],
  workstreamName: string
) => {
  // Add summary row at the top
  const summaryRow = {
    Key: `Workstream: ${workstreamName}`,
    Summary: `Export Date: ${new Date().toLocaleDateString()}`,
    Type: `Total Issues: ${issuesData.length}`,
    Status: "",
    Account: "",
    ChildCount: "",
    "Original Estimate (days)": "",
    "Time Spent (days)": "",
    "Time Remaining (days)": "",
    "Aggregated Original Estimate (days)": "",
    "Aggregated Time Spent (days)": "",
    "Aggregated Time Remaining (days)": "",
  };

  // Export all the actual issue data with both raw and aggregated values
  const issueRows = issuesData.map((issue) => ({
    // Basic issue information
    Key: issue.key,
    Summary: issue.summary,
    Type: issue.type,
    Status: issue.status,
    Account: issue.account,
    ChildCount: issue.childCount,

    // Individual estimates and time (issue's own values)
    "Original Estimate (days)": issue.originalEstimate || 0,
    "Time Spent (days)": issue.timeSpent || 0,
    "Time Remaining (days)": issue.timeRemaining || 0,

    // Aggregated estimates and time (including all children)
    "Aggregated Original Estimate (days)":
      issue.aggregatedOriginalEstimate || 0,
    "Aggregated Time Spent (days)": issue.aggregatedTimeSpent || 0,
    "Aggregated Time Remaining (days)": issue.aggregatedTimeRemaining || 0,
  }));

  // Combine summary row with issue data
  const data = [summaryRow, ...issueRows];

  const filename = `${workstreamName.replace(/[^a-zA-Z0-9]/g, "_")}_issues_export.xlsx`;
  return exportToExcel(data, filename);
};
