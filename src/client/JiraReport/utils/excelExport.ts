import * as XLSX from "xlsx";

// Helper function to recursively collect all issues including children
const collectAllIssuesRecursively = (
  issues: any[],
  level: number = 0,
  parentKey: string = ""
): any[] => {
  let allIssues: any[] = [];

  for (const issue of issues) {
    // Calculate aggregated values for this issue if it's at level 0 (top-level workstream)
    let aggregatedValues = {
      aggregatedOriginalEstimate: issue.aggregatedOriginalEstimate || 0,
      aggregatedTimeSpent: issue.aggregatedTimeSpent || 0,
      aggregatedTimeRemaining: issue.aggregatedTimeRemaining || 0,
    };

    // If this is a top-level workstream (level 0), calculate aggregated values from children
    if (level === 0 && issue.children && issue.children.length > 0) {
      const childIssues = collectAllIssuesRecursively(
        issue.children,
        level + 1,
        issue.key
      );

      // Calculate aggregated values from all children
      const childAggregatedValues = childIssues.reduce(
        (acc, child) => ({
          aggregatedOriginalEstimate:
            acc.aggregatedOriginalEstimate + (child.originalEstimate || 0),
          aggregatedTimeSpent: acc.aggregatedTimeSpent + (child.timeSpent || 0),
          aggregatedTimeRemaining:
            acc.aggregatedTimeRemaining + (child.timeRemaining || 0),
        }),
        {
          aggregatedOriginalEstimate: 0,
          aggregatedTimeSpent: 0,
          aggregatedTimeRemaining: 0,
        }
      );

      // Add the workstream's own values to the aggregated values
      aggregatedValues = {
        aggregatedOriginalEstimate:
          (issue.originalEstimate || 0) +
          childAggregatedValues.aggregatedOriginalEstimate,
        aggregatedTimeSpent:
          (issue.timeSpent || 0) + childAggregatedValues.aggregatedTimeSpent,
        aggregatedTimeRemaining:
          (issue.timeRemaining || 0) +
          childAggregatedValues.aggregatedTimeRemaining,
      };

      // Add the current issue with its level information and calculated aggregated values
      const issueWithLevel = {
        ...issue,
        "Issue Level": level,
        Parent: parentKey,
        aggregatedOriginalEstimate: aggregatedValues.aggregatedOriginalEstimate,
        aggregatedTimeSpent: aggregatedValues.aggregatedTimeSpent,
        aggregatedTimeRemaining: aggregatedValues.aggregatedTimeRemaining,
      };
      allIssues.push(issueWithLevel);

      // Add all child issues
      allIssues.push(...childIssues);
    } else {
      // For non-top-level issues, just add them with their existing aggregated values
      const issueWithLevel = {
        ...issue,
        "Issue Level": level,
        Parent: parentKey,
      };
      allIssues.push(issueWithLevel);

      // Recursively add all children if they exist
      if (issue.children && issue.children.length > 0) {
        const childIssues = collectAllIssuesRecursively(
          issue.children,
          level + 1,
          issue.key
        );
        allIssues.push(...childIssues);
      }
    }
  }

  return allIssues;
};

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
  // Collect all issues recursively including children
  const allIssuesRecursive = collectAllIssuesRecursively(
    workstreamData,
    0, // Start at level 0 (workstreams)
    ""
  );

  // Add summary row at the top
  const summaryRow = {
    Key: `Project: ${workstreamName}`,
    Summary: `Export Date: ${new Date().toLocaleDateString()}`,
    Type: `Total Issues: ${allIssuesRecursive.length}`,
    Status: "",
    Account: "",
    Parent: "",
    "Issue Level": "",
    ChildCount: "",
    "Original Estimate (days)": "",
    "Time Spent (days)": "",
    "Time Remaining (days)": "",
    "Aggregated Original Estimate (days)": "",
    "Aggregated Time Spent (days)": "",
    "Aggregated Time Remaining (days)": "",
  };

  // Export all the workstream data with both raw and aggregated values
  const workstreamRows = allIssuesRecursive.map((workstream) => ({
    // Basic workstream information
    Key: workstream.key,
    Summary: workstream.summary,
    Type: workstream.type,
    Status: workstream.status,
    Account: workstream.account,
    Parent: workstream.Parent || "",
    "Issue Level": workstream["Issue Level"],
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
  workstreamName: string,
  parentWorkstreamKey?: string
) => {
  // For issues export, we want to include the workstream itself (level 0) plus all its children
  // We need to reconstruct the workstream data structure to include the workstream as the parent
  const workstreamData = [
    {
      key: parentWorkstreamKey || "unknown",
      summary: workstreamName,
      type: "Workstream",
      status: "Active",
      account: "",
      children: issuesData,
      childCount: issuesData.length,
      originalEstimate: 0, // Workstream's own estimate
      timeSpent: 0, // Workstream's own time spent
      timeRemaining: 0, // Workstream's own time remaining
      aggregatedOriginalEstimate: 0, // Will be calculated by collectAllIssuesRecursively
      aggregatedTimeSpent: 0, // Will be calculated by collectAllIssuesRecursively
      aggregatedTimeRemaining: 0, // Will be calculated by collectAllIssuesRecursively
    },
  ];

  // Collect all issues recursively including children, starting from level 0 (workstream)
  const allIssuesRecursive = collectAllIssuesRecursively(
    workstreamData,
    0, // Start at level 0 (the workstream itself)
    ""
  );

  // Add summary row at the top
  const summaryRow = {
    Key: `Workstream: ${workstreamName}`,
    Summary: `Export Date: ${new Date().toLocaleDateString()}`,
    Type: `Total Issues: ${allIssuesRecursive.length}`,
    Status: "",
    Account: "",
    Parent: "",
    "Issue Level": "",
    ChildCount: "",
    "Original Estimate (days)": "",
    "Time Spent (days)": "",
    "Time Remaining (days)": "",
    "Aggregated Original Estimate (days)": "",
    "Aggregated Time Spent (days)": "",
    "Aggregated Time Remaining (days)": "",
  };

  // Export all the actual issue data with both raw and aggregated values
  const issueRows = allIssuesRecursive.map((issue) => ({
    // Basic issue information
    Key: issue.key,
    Summary: issue.summary,
    Type: issue.type,
    Status: issue.status,
    Account: issue.account,
    Parent: issue.Parent || "",
    "Issue Level": issue["Issue Level"],
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

export const exportCompleteWorkstreamToExcel = async (
  workstreamKey: string,
  workstreamName: string
) => {
  try {
    // Fetch the complete workstream data from the server
    const response = await fetch(
      `/api/jiraReport/workstream/${workstreamKey}/workstream`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch workstream data: ${response.statusText}`
      );
    }

    const eventSource = new EventSource(
      `/api/jiraReport/workstream/${workstreamKey}/workstream`
    );

    return new Promise<boolean>((resolve, reject) => {
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === "complete" && data.data) {
          const workstreamWithIssues = JSON.parse(data.data);

          // Collect all issues recursively including children
          const allIssuesRecursive = collectAllIssuesRecursively(
            [workstreamWithIssues],
            0, // Start at level 0 (the workstream itself)
            ""
          );

          // Add summary row at the top
          const summaryRow = {
            Key: `Workstream: ${workstreamName}`,
            Summary: `Export Date: ${new Date().toLocaleDateString()}`,
            Type: `Total Issues: ${allIssuesRecursive.length}`,
            Status: "",
            Account: "",
            Parent: "",
            "Issue Level": "",
            ChildCount: "",
            "Original Estimate (days)": "",
            "Time Spent (days)": "",
            "Time Remaining (days)": "",
            "Aggregated Original Estimate (days)": "",
            "Aggregated Time Spent (days)": "",
            "Aggregated Time Remaining (days)": "",
          };

          // Export all the issue data with both raw and aggregated values
          const issueRows = allIssuesRecursive.map((issue) => ({
            // Basic issue information
            Key: issue.key,
            Summary: issue.summary,
            Type: issue.type,
            Status: issue.status,
            Account: issue.account,
            Parent: issue.Parent || "",
            "Issue Level": issue["Issue Level"],
            ChildCount: issue.childCount,

            // Individual estimates and time (issue's own values)
            "Original Estimate (days)": issue.originalEstimate || 0,
            "Time Spent (days)": issue.timeSpent || 0,
            "Time Remaining (days)": issue.timeRemaining || 0,

            // Aggregated estimates and time (including all children)
            "Aggregated Original Estimate (days)":
              issue.aggregatedOriginalEstimate || 0,
            "Aggregated Time Spent (days)": issue.aggregatedTimeSpent || 0,
            "Aggregated Time Remaining (days)":
              issue.aggregatedTimeRemaining || 0,
          }));

          // Combine summary row with issue data
          const exportData = [summaryRow, ...issueRows];

          const filename = `${workstreamName.replace(/[^a-zA-Z0-9]/g, "_")}_complete_workstream_export.xlsx`;
          const result = exportToExcel(exportData, filename);

          eventSource.close();
          resolve(result);
        } else if (data.status === "error") {
          eventSource.close();
          reject(new Error(data.message || "Failed to load workstream data"));
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        reject(new Error("EventSource error"));
      };

      // Timeout after 5 minutes
      setTimeout(() => {
        eventSource.close();
        reject(new Error("Request timeout"));
      }, 300000);
    });
  } catch (error) {
    console.error("Error exporting complete workstream:", error);
    return false;
  }
};

export const exportProjectWorkstreamsToExcel = (
  projectIssues: any[],
  projectName: string
) => {
  try {
    // Export the project workstreams table data exactly as it appears
    const workstreamRows = projectIssues.map((workstream) => ({
      // Basic workstream information
      Key: workstream.key,
      Summary: workstream.summary,
      Type: workstream.type,
      Status: workstream.status || "Unknown",
      Account: workstream.account || "",
      
      // Time estimates and actuals (using aggregated values if available)
      "Baseline Estimate (days)": workstream.aggregatedOriginalEstimate !== undefined 
        ? workstream.aggregatedOriginalEstimate 
        : workstream.originalEstimate || 0,
      "Actual Days Logged (days)": workstream.aggregatedTimeSpent !== undefined 
        ? workstream.aggregatedTimeSpent 
        : workstream.timeSpent || 0,
      "Estimate to Complete (days)": workstream.aggregatedTimeRemaining !== undefined 
        ? workstream.aggregatedTimeRemaining 
        : workstream.timeRemaining || 0,
      
      // Calculated fields
      "Total Forecast (days)": (() => {
        const timeSpent = workstream.aggregatedTimeSpent !== undefined 
          ? workstream.aggregatedTimeSpent 
          : workstream.timeSpent || 0;
        const timeRemaining = workstream.aggregatedTimeRemaining !== undefined 
          ? workstream.aggregatedTimeRemaining 
          : workstream.timeRemaining || 0;
        return timeSpent + timeRemaining;
      })(),
      
      "Variance (days)": (() => {
        const originalEstimate = workstream.aggregatedOriginalEstimate !== undefined 
          ? workstream.aggregatedOriginalEstimate 
          : workstream.originalEstimate || 0;
        const timeSpent = workstream.aggregatedTimeSpent !== undefined 
          ? workstream.aggregatedTimeSpent 
          : workstream.timeSpent || 0;
        const timeRemaining = workstream.aggregatedTimeRemaining !== undefined 
          ? workstream.aggregatedTimeRemaining 
          : workstream.timeRemaining || 0;
        const totalForecast = timeSpent + timeRemaining;
        return totalForecast - originalEstimate;
      })(),
      
      "Variance (%)": (() => {
        const originalEstimate = workstream.aggregatedOriginalEstimate !== undefined 
          ? workstream.aggregatedOriginalEstimate 
          : workstream.originalEstimate || 0;
        const timeSpent = workstream.aggregatedTimeSpent !== undefined 
          ? workstream.aggregatedTimeSpent 
          : workstream.timeSpent || 0;
        const timeRemaining = workstream.aggregatedTimeRemaining !== undefined 
          ? workstream.aggregatedTimeRemaining 
          : workstream.timeRemaining || 0;
        const totalForecast = timeSpent + timeRemaining;
        const variance = totalForecast - originalEstimate;
        
        if (originalEstimate > 0) {
          return (variance / originalEstimate) * 100;
        }
        return 0;
      })(),
      
      // Time bookings information
      "Time Booked (days)": workstream.timeBookings && workstream.timeBookings.length > 0 
        ? workstream.timeBookings.reduce((sum, booking) => sum + booking.timeSpent, 0)
        : 0,
      "Time Booked From Date": workstream.timeBookingsFromDate || "",
      
      // Data availability status
      "Data Status": (() => {
        if (workstream.hasBeenRequested) {
          return workstream.hasData === false ? "No data available" : "Data loaded";
        } else if (workstream.hasChildren !== null && workstream.hasChildren !== undefined) {
          return workstream.hasChildren === false ? "No data available" : "Click to request data";
        } else {
          return "Click to request data";
        }
      })(),
    }));

    // Add summary row at the top
    const summaryRow = {
      Key: `Project: ${projectName}`,
      Summary: `Export Date: ${new Date().toLocaleDateString()}`,
      Type: `Total Workstreams: ${projectIssues.length}`,
      Status: "",
      Account: "",
      "Baseline Estimate (days)": "",
      "Actual Days Logged (days)": "",
      "Estimate to Complete (days)": "",
      "Total Forecast (days)": "",
      "Variance (days)": "",
      "Variance (%)": "",
      "Time Booked (days)": "",
      "Time Booked From Date": "",
      "Data Status": "",
    };

    // Combine summary row with workstream data
    const data = [summaryRow, ...workstreamRows];

    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_project_workstreams_export.xlsx`;
    return exportToExcel(data, filename);
  } catch (error) {
    console.error("Error exporting project workstreams to Excel:", error);
    return false;
  }
};
