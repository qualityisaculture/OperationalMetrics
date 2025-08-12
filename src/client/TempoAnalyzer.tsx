import React from "react";
import {
  Upload,
  Button,
  Table,
  message,
  Card,
  Typography,
  Space,
  Alert,
  Collapse,
  Statistic,
  Row,
  Col,
  Radio,
  Modal,
  List,
  Select,
  Checkbox,
  DatePicker,
} from "antd";
import {
  UploadOutlined,
  FileExcelOutlined,
  BarChartOutlined,
  UserOutlined,
  BugOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

// Configuration for issue keys that should be split into their own categories
const ISSUE_KEY_EXCEPTIONS = [
  {
    issueKeys: ["ABS-56", "ABS-58", "ABS-57"],
    categorySuffix: "Holiday & Absence",
  },
  {
    issueKeys: ["HR-57", "LD-47", "DEL-12", "DEL-15", "LD-48"],
    categorySuffix: "Meeting",
  },
  {
    issueKeys: [
      "HR-48",
      "DEL-14",
      "HR-49",
      "LD-53",
      "HR-68",
      "LD-54",
      "DEL-13",
      "LAM-39",
    ],
    categorySuffix: "Team Management",
  },
  {
    issueKeys: ["LD-50", "HR-47", "LD-45"],
    categorySuffix: "Training",
  },
  {
    issueKeys: ["STR-45"],
    categorySuffix: "XFT Reorg",
  },
  // Add more exceptions here as needed:
  // { issueKeys: ["ABS-57", "ABS-58"], categorySuffix: "Sick Leave" },
  // { issueKeys: ["LD-51", "LD-52", "LD-53"], categorySuffix: "Advanced Training" },
];

interface SheetData {
  name: string;
  data: any[];
  headers: string[];
  columns: any[];
  fileName: string;
}

interface Props {}

interface State {
  excelData: any[];
  columns: any[];
  isLoading: boolean;
  fileName: string;
  groupedData: { [key: string]: number };
  totalHours: number;
  selectedCategory: string | null;
  detailedData: { [key: string]: number };
  categoryTotalHours: number;
  accountCategoryIndex: number;
  accountNameIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
  issueKeyIndex: number;
  issueTypeIndex: number;
  issueSummaryIndex: number;
  workDescriptionIndex: number;
  dateIndex: number;
  rawData: any[];
  headers: string[];
  // New state for filtered data that respects all filters
  filteredData: any[];
  viewMode: "name" | "issue" | "type";
  detailedByName: { [key: string]: number };
  detailedByIssue: { [key: string]: number };
  detailedByIssueWithType: {
    [key: string]: { hours: number; type: string; summary: string };
  };
  detailedByType: { [key: string]: number };
  issueWorkDescriptions: {
    [key: string]: Array<{
      description: string;
      fullName: string;
      date: string;
    }>;
  };
  selectedIssueKey: string | null;
  issueUserData: { [key: string]: number };
  issueTotalHours: number;
  summaryViewMode: "category" | "name";
  groupedByName: { [key: string]: number };
  selectedUser: string | null;
  userCategoryData: { [key: string]: number };
  userTotalHours: number;
  selectedUserCategory: string | null;
  userCategoryIssueData: { [key: string]: number };
  userCategoryIssueDataWithType: {
    [key: string]: { hours: number; type: string; summary: string };
  };
  userCategoryIssueTotal: number;
  userCategoryIssueWorkDescriptions: {
    [key: string]: Array<{
      description: string;
      fullName: string;
      date: string;
    }>;
  };
  showWorkDescriptionModal: boolean;
  selectedWorkDescriptions: string[];
  selectedWorkDescriptionTitle: string;
  selectedWorkDescriptionDetails: Array<{ fullName: string; date: string }>;
  // New state for multiple sheets
  sheets: SheetData[];
  selectedSheets: string[];
  currentSheetName: string;
  // New state for excluding holiday and absence data
  excludeHolidayAbsence: boolean;
  // New state for excluding data after a specific date
  excludeAfterDate: Date | null;
  // New state for hierarchical category data
  groupedDataByCategory: {
    [category: string]: {
      totalHours: number;
      accounts: { [accountName: string]: number };
    };
  };
  // New state for tracking which rows to show in the expandable table
  displayedRows: any[];
}

export default class TempoAnalyzer extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      excelData: [],
      columns: [],
      isLoading: false,
      fileName: "",
      groupedData: {},
      totalHours: 0,
      selectedCategory: null,
      detailedData: {},
      categoryTotalHours: 0,
      accountCategoryIndex: -1,
      accountNameIndex: -1,
      loggedHoursIndex: -1,
      fullNameIndex: -1,
      issueKeyIndex: -1,
      issueTypeIndex: -1,
      issueSummaryIndex: -1,
      workDescriptionIndex: -1,
      dateIndex: -1,
      rawData: [],
      headers: [],
      // New state for filtered data that respects all filters
      filteredData: [],
      viewMode: "name",
      detailedByName: {},
      detailedByIssue: {},
      detailedByIssueWithType: {},
      detailedByType: {},
      issueWorkDescriptions: {},
      selectedIssueKey: null,
      issueUserData: {},
      issueTotalHours: 0,
      summaryViewMode: "category",
      groupedByName: {},
      selectedUser: null,
      userCategoryData: {},
      userTotalHours: 0,
      selectedUserCategory: null,
      userCategoryIssueData: {},
      userCategoryIssueDataWithType: {},
      userCategoryIssueTotal: 0,
      userCategoryIssueWorkDescriptions: {},
      showWorkDescriptionModal: false,
      selectedWorkDescriptions: [],
      selectedWorkDescriptionTitle: "",
      selectedWorkDescriptionDetails: [],
      // New state for multiple sheets
      sheets: [],
      selectedSheets: [],
      currentSheetName: "",
      // New state for excluding holiday and absence data
      excludeHolidayAbsence: false,
      // New state for excluding data after a specific date
      excludeAfterDate: null,
      // New state for hierarchical category data
      groupedDataByCategory: {},
      // New state for tracking which rows to show in the expandable table
      displayedRows: [],
    };
  }

  // New method to apply all filters to the raw data
  applyFilters = (tableData: any[]) => {
    const {
      excludeHolidayAbsence,
      excludeAfterDate,
      issueKeyIndex,
      dateIndex,
    } = this.state;

    let filteredData = [...tableData];

    // Filter out holiday and absence data if the toggle is enabled
    if (excludeHolidayAbsence && issueKeyIndex !== -1) {
      const holidayAbsenceIssueKeys =
        ISSUE_KEY_EXCEPTIONS.find(
          (exp) => exp.categorySuffix === "Holiday & Absence"
        )?.issueKeys || [];

      if (holidayAbsenceIssueKeys.length > 0) {
        filteredData = filteredData.filter((row) => {
          const issueKey = row[issueKeyIndex.toString()];
          return !holidayAbsenceIssueKeys.includes(issueKey);
        });
      }
    }

    // Filter out data after the selected date if a date is selected
    if (excludeAfterDate && dateIndex !== -1) {
      const cutoffDate = new Date(excludeAfterDate);
      cutoffDate.setHours(0, 0, 0, 0); // Set to start of the selected date

      filteredData = filteredData.filter((row) => {
        const workDate = row[dateIndex.toString()];
        if (!workDate) return true; // Keep rows without date

        try {
          // Parse the date in format "2025-08-29 08:00"
          const dateStr = String(workDate).trim();
          const dateOnly = dateStr.split(" ")[0]; // Extract just the date part
          const rowDate = new Date(dateOnly);
          rowDate.setHours(0, 0, 0, 0); // Set to start of day for comparison

          return rowDate <= cutoffDate;
        } catch (error) {
          // If date parsing fails, keep the row
          return true;
        }
      });
    }

    return filteredData;
  };

  processData = (tableData: any[], headers: string[]) => {
    // Find the column indices for Account Category and Logged Hours
    const accountCategoryIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("account category") ||
        header.toLowerCase().includes("accountcategory")
    );
    const accountNameIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("account name") ||
        header.toLowerCase().includes("accountname") ||
        (header.toLowerCase().includes("name") &&
          !header.toLowerCase().includes("full name") &&
          !header.toLowerCase().includes("fullname"))
    );
    const loggedHoursIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("logged hours") ||
        header.toLowerCase().includes("loggedhours") ||
        header.toLowerCase().includes("hours")
    );
    const fullNameIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("full name") ||
        header.toLowerCase().includes("fullname") ||
        header.toLowerCase().includes("name")
    );
    const issueKeyIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("issue key") ||
        header.toLowerCase().includes("issuekey") ||
        header.toLowerCase().includes("key")
    );
    const issueTypeIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("issue type") ||
        header.toLowerCase().includes("issuetype")
    );
    const issueSummaryIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("issue summary") ||
        header.toLowerCase().includes("issuesummary")
    );
    const workDescriptionIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("work description") ||
        header.toLowerCase().includes("workdescription") ||
        header.toLowerCase().includes("description")
    );
    const dateIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("date") ||
        header.toLowerCase().includes("date")
    );

    if (accountCategoryIndex === -1 || loggedHoursIndex === -1) {
      message.warning(
        "Could not find 'Account Category' or 'Logged Hours' columns. Please ensure your Excel file contains these columns."
      );
      return;
    }

    if (accountNameIndex === -1) {
      message.warning(
        "Could not find 'Account Name' column. Account Name breakdown will not be available."
      );
    }

    if (fullNameIndex === -1) {
      message.warning(
        "Could not find 'Full Name' column. Full Name view will not be available."
      );
    }

    if (issueKeyIndex === -1) {
      message.warning(
        "Could not find 'Issue Key' column. Issue Key view will not be available."
      );
    }

    if (issueTypeIndex === -1) {
      message.warning(
        "Could not find 'Issue Type' column. Issue Type information will not be available."
      );
    }

    if (issueSummaryIndex === -1) {
      message.warning(
        "Could not find 'Issue Summary' column. Issue Summary information will not be available."
      );
    }

    if (workDescriptionIndex === -1) {
      message.warning(
        "Could not find 'Work Description' column. Work Description information will not be available."
      );
    }

    if (dateIndex === -1) {
      message.warning(
        "Could not find 'Date' column. Date information will not be available."
      );
    }

    // Store the column indices for later use
    this.setState({
      accountCategoryIndex,
      accountNameIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      issueTypeIndex,
      issueSummaryIndex,
      workDescriptionIndex,
      dateIndex,
      rawData: tableData,
      headers,
    });

    // Apply all filters to create the filtered dataset
    const filteredData = this.applyFilters(tableData);

    // Store the filtered data
    this.setState({
      filteredData: filteredData,
    });

    // Group by Account Category and sum Logged Hours using filtered data
    const grouped: { [key: string]: number } = {};
    const groupedByName: { [key: string]: number } = {};
    const groupedDataByCategory: {
      [category: string]: {
        totalHours: number;
        accounts: { [accountName: string]: number };
      };
    } = {};
    let totalHours = 0;

    filteredData.forEach((row) => {
      const accountCategory = row[accountCategoryIndex.toString()];
      const accountName = row[accountNameIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;
      const issueKey =
        issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
      const fullName =
        fullNameIndex !== -1 ? row[fullNameIndex.toString()] : null;

      if (accountCategory) {
        const category = String(accountCategory).trim();
        if (category) {
          // Check if this issue key should be split into its own category
          const exception = ISSUE_KEY_EXCEPTIONS.find((exp) =>
            exp.issueKeys.includes(issueKey)
          );
          let finalCategory = category;

          if (exception) {
            finalCategory = `${category} ${exception.categorySuffix}`;
          }

          grouped[finalCategory] = (grouped[finalCategory] || 0) + loggedHours;
          totalHours += loggedHours;

          if (accountName) {
            const account = String(accountName).trim();
            if (account) {
              if (!groupedDataByCategory[finalCategory]) {
                groupedDataByCategory[finalCategory] = {
                  totalHours: 0,
                  accounts: {},
                };
              }
              groupedDataByCategory[finalCategory].totalHours += loggedHours;
              groupedDataByCategory[finalCategory].accounts[account] =
                (groupedDataByCategory[finalCategory].accounts[account] || 0) +
                loggedHours;
            }
          }
        }
      }

      // Group by Full Name if available
      if (fullName) {
        const name = String(fullName).trim();
        if (name) {
          groupedByName[name] = (groupedByName[name] || 0) + loggedHours;
        }
      }
    });

    this.setState({
      groupedData: grouped,
      groupedByName: groupedByName,
      totalHours: totalHours,
      groupedDataByCategory: groupedDataByCategory,
    });
  };

  // New method to combine data from multiple sheets
  combineSheetData = () => {
    const { sheets, selectedSheets } = this.state;

    if (selectedSheets.length === 0) {
      return;
    }

    // Combine data from all selected sheets
    let combinedData: any[] = [];
    let combinedHeaders: string[] = [];
    let combinedColumns: any[] = [];

    selectedSheets.forEach((sheetIdentifier) => {
      const [fileName, sheetName] = sheetIdentifier.split("|");
      const sheet = sheets.find(
        (s) => s.fileName === fileName && s.name === sheetName
      );
      if (sheet) {
        if (combinedData.length === 0) {
          // First sheet - use its headers and columns
          combinedHeaders = sheet.headers;
          combinedColumns = sheet.columns;
        } else {
          // Check if headers match
          if (
            JSON.stringify(combinedHeaders) !== JSON.stringify(sheet.headers)
          ) {
            message.warning(
              `Headers in sheet "${sheetName}" from "${fileName}" don't match the first sheet. Skipping this sheet.`
            );
            return;
          }
        }
        combinedData = combinedData.concat(sheet.data);
      }
    });

    if (combinedData.length > 0) {
      // Process the combined data
      this.processData(combinedData, combinedHeaders);

      this.setState({
        excelData: combinedData,
        columns: combinedColumns,
        rawData: combinedData,
        headers: combinedHeaders,
      });

      message.success(
        `Successfully combined ${selectedSheets.length} sheet(s) with ${combinedData.length} total rows`
      );
    }
  };

  // New method to handle sheet selection changes
  handleSheetSelectionChange = (selectedSheets: string[]) => {
    this.setState({ selectedSheets }, () => {
      if (selectedSheets.length > 0) {
        this.combineSheetData();
      } else {
        // Clear data when no sheets are selected
        this.setState({
          excelData: [],
          columns: [],
          rawData: [],
          filteredData: [],
          headers: [],
          groupedData: {},
          groupedByName: {},
          totalHours: 0,
          selectedCategory: null,
          detailedData: {},
          categoryTotalHours: 0,
          selectedUser: null,
          userCategoryData: {},
          userTotalHours: 0,
          selectedUserCategory: null,
          userCategoryIssueData: {},
          userCategoryIssueTotal: 0,
          groupedDataByCategory: {},
                      excludeAfterDate: null,
        });
      }
    });
  };

  // New method to remove a sheet
  removeSheet = (sheetName: string, fileName?: string) => {
    this.setState(
      (prevState) => {
        let updatedSheets;
        let updatedSelectedSheets;

        if (fileName) {
          // Remove by filename and sheet name
          updatedSheets = prevState.sheets.filter(
            (sheet) =>
              !(sheet.name === sheetName && sheet.fileName === fileName)
          );
          const sheetIdentifier = `${fileName}|${sheetName}`;
          updatedSelectedSheets = prevState.selectedSheets.filter(
            (identifier) => identifier !== sheetIdentifier
          );
        } else {
          // Remove by sheet name only (for backward compatibility)
          updatedSheets = prevState.sheets.filter(
            (sheet) => sheet.name !== sheetName
          );
          updatedSelectedSheets = prevState.selectedSheets.filter(
            (identifier) => !identifier.endsWith(`|${sheetName}`)
          );
        }

        return {
          sheets: updatedSheets,
          selectedSheets: updatedSelectedSheets,
        };
      },
      () => {
        if (this.state.selectedSheets.length > 0) {
          this.handleSheetSelectionChange(this.state.selectedSheets);
        } else {
          // Clear data when no sheets are selected
          this.setState({
            excelData: [],
            columns: [],
            rawData: [],
            filteredData: [],
            headers: [],
            groupedData: {},
            groupedByName: {},
            totalHours: 0,
            selectedCategory: null,
            detailedData: {},
            categoryTotalHours: 0,
            selectedUser: null,
            userCategoryData: {},
            userTotalHours: 0,
            selectedUserCategory: null,
            userCategoryIssueData: {},
            userCategoryIssueTotal: 0,
            groupedDataByCategory: {},
            excludeAfterDate: null,
          });
        }
      }
    );
  };

  handleRowClick = (category: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      issueTypeIndex,
      issueSummaryIndex,
      workDescriptionIndex,
      dateIndex,
    } = this.state;

    if (fullNameIndex === -1 && issueKeyIndex === -1) {
      message.warning(
        "Neither 'Full Name' nor 'Issue Key' columns found. Cannot show detailed breakdown."
      );
      return;
    }

    // Check if this is an exception category and extract the original category
    let originalCategory = category;
    let exceptionIssueKeys: string[] | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (category.endsWith(` ${exception.categorySuffix}`)) {
        originalCategory = category.replace(` ${exception.categorySuffix}`, "");
        exceptionIssueKeys = exception.issueKeys; // Include all issue keys in the exception group
        break;
      }
    }

    // Filter data for the selected category and group by Full Name
    const detailedByName: { [key: string]: number } = {};
    const detailedByIssue: { [key: string]: number } = {};
    const detailedByIssueWithType: {
      [key: string]: { hours: number; type: string; summary: string };
    } = {};
    const detailedByType: { [key: string]: number } = {};
    const issueWorkDescriptions: {
      [key: string]: Array<{
        description: string;
        fullName: string;
        date: string;
      }>;
    } = {};
    let categoryTotal = 0;
    const categoryRows: any[] = []; // Collect rows for this category

    filteredData.forEach((row) => {
      const rowCategory = row[accountCategoryIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (String(rowCategory).trim() === originalCategory) {
        // If this is an exception category, only include rows with any of the exception issue keys
        if (exceptionIssueKeys) {
          const rowIssueKey = row[issueKeyIndex.toString()];
          if (!exceptionIssueKeys.includes(rowIssueKey)) {
            return; // Skip this row if it doesn't match any of the exception issue keys
          }
        } else {
          // For regular categories, exclude rows that match any exception issue keys
          const rowIssueKey = row[issueKeyIndex.toString()];
          const isExceptionRow = ISSUE_KEY_EXCEPTIONS.some((exp) =>
            exp.issueKeys.includes(rowIssueKey)
          );
          if (isExceptionRow) {
            return; // Skip this row if it matches any exception issue key
          }
        }

        categoryTotal += loggedHours;
        categoryRows.push(row); // Add this row to the category rows

        // Group by Full Name if available
        if (fullNameIndex !== -1) {
          const fullName = row[fullNameIndex.toString()];
          if (fullName) {
            const name = String(fullName).trim();
            if (name) {
              detailedByName[name] = (detailedByName[name] || 0) + loggedHours;
            }
          }
        }

        // Group by Issue Key if available
        if (issueKeyIndex !== -1) {
          const issueKey = row[issueKeyIndex.toString()];
          if (issueKey) {
            const key = String(issueKey).trim();
            if (key) {
              detailedByIssue[key] = (detailedByIssue[key] || 0) + loggedHours;

              // Also collect issue type information
              const issueType =
                issueTypeIndex !== -1
                  ? row[issueTypeIndex.toString()]
                  : "Unknown";
              const type = String(issueType).trim() || "Unknown";

              // Also collect issue summary information
              const issueSummary =
                issueSummaryIndex !== -1
                  ? row[issueSummaryIndex.toString()]
                  : "";
              const summary = String(issueSummary).trim() || "";

              if (detailedByIssueWithType[key]) {
                detailedByIssueWithType[key].hours += loggedHours;
              } else {
                detailedByIssueWithType[key] = {
                  hours: loggedHours,
                  type: type,
                  summary: summary,
                };
              }

              // Collect work descriptions
              if (workDescriptionIndex !== -1) {
                const workDescription = row[workDescriptionIndex.toString()];
                if (workDescription) {
                  const description = String(workDescription).trim();
                  if (description) {
                    const fullName =
                      fullNameIndex !== -1
                        ? row[fullNameIndex.toString()]
                        : null;
                    const date =
                      dateIndex !== -1 ? row[dateIndex.toString()] : null;

                    if (!issueWorkDescriptions[key]) {
                      issueWorkDescriptions[key] = [];
                    }

                    const workEntry = {
                      description: description,
                      fullName: fullName ? String(fullName).trim() : "N/A",
                      date: date ? String(date).trim() : "N/A",
                    };

                    // Check if this exact entry already exists
                    const exists = issueWorkDescriptions[key].some(
                      (entry) =>
                        entry.description === workEntry.description &&
                        entry.fullName === workEntry.fullName &&
                        entry.date === workEntry.date
                    );

                    if (!exists) {
                      issueWorkDescriptions[key].push(workEntry);
                    }
                  }
                }
              }
            }
          }
        }

        // Group by Issue Type if available
        if (issueTypeIndex !== -1) {
          const issueType = row[issueTypeIndex.toString()];
          if (issueType) {
            const type = String(issueType).trim();
            if (type) {
              detailedByType[type] = (detailedByType[type] || 0) + loggedHours;
            }
          }
        }
      }
    });

    // Determine which view to show by default
    let defaultViewMode: "name" | "issue" | "type" = "issue";
    if (fullNameIndex === -1 && issueKeyIndex !== -1) {
      defaultViewMode = "issue";
    } else if (fullNameIndex !== -1 && issueKeyIndex !== -1) {
      defaultViewMode = "issue"; // Default to issue view if both are available
    } else if (fullNameIndex !== -1 && issueKeyIndex === -1) {
      defaultViewMode = "name"; // Default to name view if only name is available
    }

    this.setState({
      selectedCategory: category,
      detailedData:
        defaultViewMode === "name"
          ? detailedByName
          : defaultViewMode === "issue"
            ? detailedByIssue
            : detailedByType,
      categoryTotalHours: categoryTotal,
      viewMode: defaultViewMode,
      detailedByName,
      detailedByIssue,
      detailedByIssueWithType,
      detailedByType,
      issueWorkDescriptions,
      displayedRows: categoryRows,
    });
  };

  handleBackToSummary = () => {
    this.setState({
      selectedCategory: null,
      detailedData: {},
      categoryTotalHours: 0,
      selectedUser: null,
      userCategoryData: {},
      userTotalHours: 0,
      selectedUserCategory: null,
      userCategoryIssueData: {},
      userCategoryIssueTotal: 0,
      displayedRows: [],
    });
  };

  handleSummaryViewModeChange = (mode: "category" | "name") => {
    const { groupedByName } = this.state;

    if (mode === "name" && Object.keys(groupedByName).length === 0) {
      message.warning("No Full Name data available.");
      return;
    }

    this.setState({
      summaryViewMode: mode,
    });
  };

  handleUserClick = (userName: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
    } = this.state;

    if (fullNameIndex === -1) {
      message.warning(
        "Full Name column not found. Cannot show user breakdown."
      );
      return;
    }

    // Filter data for the selected user and group by Account Category
    const userCategoryData: { [key: string]: number } = {};
    let userTotal = 0;
    const userRows: any[] = []; // Collect rows for this user

    filteredData.forEach((row) => {
      const rowFullName = row[fullNameIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;
      const issueKey =
        issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;

      if (String(rowFullName).trim() === userName) {
        userTotal += loggedHours;
        userRows.push(row); // Add this row to the user rows

        // Group by Account Category
        const accountCategory = row[accountCategoryIndex.toString()];
        if (accountCategory) {
          const category = String(accountCategory).trim();
          if (category) {
            // Check if this issue key should be split into its own category
            const exception = ISSUE_KEY_EXCEPTIONS.find((exp) =>
              exp.issueKeys.includes(issueKey)
            );
            let finalCategory = category;

            if (exception) {
              finalCategory = `${category} ${exception.categorySuffix}`;
            }

            userCategoryData[finalCategory] =
              (userCategoryData[finalCategory] || 0) + loggedHours;
          }
        }
      }
    });

    this.setState({
      selectedUser: userName,
      userCategoryData: userCategoryData,
      userTotalHours: userTotal,
      displayedRows: userRows,
    });
  };

  handleUserCategoryClick = (category: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      issueTypeIndex,
      issueSummaryIndex,
      workDescriptionIndex,
      dateIndex,
      selectedUser,
    } = this.state;

    if (issueKeyIndex === -1) {
      message.warning(
        "Issue Key column not found. Cannot show issue breakdown."
      );
      return;
    }

    // Check if this is an exception category and extract the original category
    let originalCategory = category;
    let exceptionIssueKeys: string[] | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (category.endsWith(` ${exception.categorySuffix}`)) {
        originalCategory = category.replace(` ${exception.categorySuffix}`, "");
        exceptionIssueKeys = exception.issueKeys; // Include all issue keys in the exception group
        break;
      }
    }

    // Filter data for the specific user and category, then group by Issue Key
    const userCategoryIssueData: { [key: string]: number } = {};
    const userCategoryIssueDataWithType: {
      [key: string]: { hours: number; type: string; summary: string };
    } = {};
    const userCategoryIssueWorkDescriptions: {
      [key: string]: Array<{
        description: string;
        fullName: string;
        date: string;
      }>;
    } = {};
    let userCategoryIssueTotal = 0;
    const userCategoryRows: any[] = []; // Collect rows for this user category

    filteredData.forEach((row) => {
      const rowFullName = row[fullNameIndex.toString()];
      const rowCategory = row[accountCategoryIndex.toString()];
      const rowIssueKey = row[issueKeyIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (
        String(rowFullName).trim() === selectedUser &&
        String(rowCategory).trim() === originalCategory
      ) {
        // If this is an exception category, only include rows with any of the exception issue keys
        if (exceptionIssueKeys && !exceptionIssueKeys.includes(rowIssueKey)) {
          return; // Skip this row if it doesn't match any of the exception issue keys
        } else if (!exceptionIssueKeys) {
          // For regular categories, exclude rows that match any exception issue keys
          const isExceptionRow = ISSUE_KEY_EXCEPTIONS.some((exp) =>
            exp.issueKeys.includes(rowIssueKey)
          );
          if (isExceptionRow) {
            return; // Skip this row if it matches any exception issue key
          }
        }

        userCategoryIssueTotal += loggedHours;
        userCategoryRows.push(row); // Add this row to the user category rows

        // Group by Issue Key
        if (rowIssueKey) {
          const key = String(rowIssueKey).trim();
          if (key) {
            userCategoryIssueData[key] =
              (userCategoryIssueData[key] || 0) + loggedHours;

            // Also collect issue type information
            const issueType =
              issueTypeIndex !== -1
                ? row[issueTypeIndex.toString()]
                : "Unknown";
            const type = String(issueType).trim() || "Unknown";

            // Also collect issue summary information
            const issueSummary =
              issueSummaryIndex !== -1 ? row[issueSummaryIndex.toString()] : "";
            const summary = String(issueSummary).trim() || "";

            if (userCategoryIssueDataWithType[key]) {
              userCategoryIssueDataWithType[key].hours += loggedHours;
            } else {
              userCategoryIssueDataWithType[key] = {
                hours: loggedHours,
                type: type,
                summary: summary,
              };
            }

            // Collect work descriptions
            if (workDescriptionIndex !== -1) {
              const workDescription = row[workDescriptionIndex.toString()];
              if (workDescription) {
                const description = String(workDescription).trim();
                if (description) {
                  const date =
                    dateIndex !== -1 ? row[dateIndex.toString()] : null;

                  if (!userCategoryIssueWorkDescriptions[key]) {
                    userCategoryIssueWorkDescriptions[key] = [];
                  }

                  const workEntry = {
                    description: description,
                    fullName: String(rowFullName).trim(),
                    date: date ? String(date).trim() : "N/A",
                  };

                  // Check if this exact entry already exists
                  const exists = userCategoryIssueWorkDescriptions[key].some(
                    (entry) =>
                      entry.description === workEntry.description &&
                      entry.fullName === workEntry.fullName &&
                      entry.date === workEntry.date
                  );

                  if (!exists) {
                    userCategoryIssueWorkDescriptions[key].push(workEntry);
                  }
                }
              }
            }
          }
        }
      }
    });

    this.setState({
      selectedUserCategory: category,
      userCategoryIssueData: userCategoryIssueData,
      userCategoryIssueDataWithType: userCategoryIssueDataWithType,
      userCategoryIssueWorkDescriptions: userCategoryIssueWorkDescriptions,
      userCategoryIssueTotal: userCategoryIssueTotal,
      displayedRows: userCategoryRows,
    });
  };

  handleViewModeChange = (mode: "name" | "issue" | "type") => {
    const { detailedByName, detailedByIssue, detailedByType, issueTypeIndex } =
      this.state;

    if (mode === "name" && Object.keys(detailedByName).length === 0) {
      message.warning("No Full Name data available for this category.");
      return;
    }

    if (mode === "issue" && Object.keys(detailedByIssue).length === 0) {
      message.warning("No Issue Key data available for this category.");
      return;
    }

    if (mode === "type" && Object.keys(detailedByType).length === 0) {
      message.warning("No Issue Type data available for this category.");
      return;
    }

    if (mode === "type" && issueTypeIndex === -1) {
      message.warning(
        "Issue Type column not found. Cannot show Issue Type breakdown."
      );
      return;
    }

    this.setState({
      viewMode: mode,
      detailedData:
        mode === "name"
          ? detailedByName
          : mode === "issue"
            ? detailedByIssue
            : detailedByType,
      selectedIssueKey: null, // Reset issue key selection when switching views
      issueUserData: {},
      issueTotalHours: 0,
    });
  };

  handleIssueKeyClick = (issueKey: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      selectedCategory,
    } = this.state;

    if (fullNameIndex === -1) {
      message.warning(
        "Full Name column not found. Cannot show user breakdown."
      );
      return;
    }

    // Check if this is an exception category and extract the original category
    let originalCategory = selectedCategory;
    let exceptionIssueKeys: string[] | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (
        selectedCategory &&
        selectedCategory.endsWith(` ${exception.categorySuffix}`)
      ) {
        originalCategory = selectedCategory.replace(
          ` ${exception.categorySuffix}`,
          ""
        );
        exceptionIssueKeys = exception.issueKeys; // Include all issue keys in the exception group
        break;
      }
    }

    // Filter data for the specific issue key and group by Full Name
    const userData: { [key: string]: number } = {};
    let issueTotal = 0;
    const issueRows: any[] = []; // Collect rows for this issue key

    filteredData.forEach((row) => {
      const rowCategory = row[accountCategoryIndex.toString()];
      const rowIssueKey = row[issueKeyIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (
        String(rowCategory).trim() === originalCategory &&
        rowIssueKey === issueKey
      ) {
        // If this is an exception category, only include rows with any of the exception issue keys
        if (exceptionIssueKeys && !exceptionIssueKeys.includes(rowIssueKey)) {
          return; // Skip this row if it doesn't match any of the exception issue keys
        }

        issueTotal += loggedHours;
        issueRows.push(row); // Add this row to the issue rows

        // Group by Full Name
        if (fullNameIndex !== -1) {
          const fullName = row[fullNameIndex.toString()];
          if (fullName) {
            const name = String(fullName).trim();
            if (name) {
              userData[name] = (userData[name] || 0) + loggedHours;
            }
          }
        }
      }
    });

    this.setState({
      selectedIssueKey: issueKey,
      issueUserData: userData,
      issueTotalHours: issueTotal,
      displayedRows: issueRows,
    });
  };

  handleBackToIssueView = () => {
    this.setState({
      selectedIssueKey: null,
      issueUserData: {},
      issueTotalHours: 0,
      displayedRows: [],
    });
  };

  showWorkDescriptions = (
    issueKey: string,
    descriptions: Array<{ description: string; fullName: string; date: string }>
  ) => {
    this.setState({
      showWorkDescriptionModal: true,
      selectedWorkDescriptions: descriptions.map((desc) => desc.description),
      selectedWorkDescriptionTitle: `Work Descriptions for ${issueKey}`,
      selectedWorkDescriptionDetails: descriptions.map((desc) => ({
        fullName: desc.fullName,
        date: desc.date,
      })),
    });
  };

  hideWorkDescriptionModal = () => {
    this.setState({
      showWorkDescriptionModal: false,
      selectedWorkDescriptions: [],
      selectedWorkDescriptionTitle: "",
      selectedWorkDescriptionDetails: [],
    });
  };

  // New method to handle holiday and absence exclusion toggle
  handleExcludeHolidayAbsenceChange = (checked: boolean) => {
    this.setState({ excludeHolidayAbsence: checked }, () => {
      // Reprocess the data with the new filter setting
      if (this.state.rawData.length > 0) {
        const filteredData = this.applyFilters(this.state.rawData);
        this.setState({ filteredData }, () => {
          this.processData(this.state.rawData, this.state.headers);
        });
      }
    });
  };

  // New method to handle date-based data exclusion
  handleExcludeAfterDateChange = (date: any) => {
    this.setState({ excludeAfterDate: date }, () => {
      // Reprocess the data with the new filter setting
      if (this.state.rawData.length > 0) {
        const filteredData = this.applyFilters(this.state.rawData);
        this.setState({ filteredData }, () => {
          this.processData(this.state.rawData, this.state.headers);
        });
      }
    });
  };

  // New method to handle multiple file uploads
  handleMultipleFileUpload = (fileList: File[]) => {
    this.setState({ isLoading: true });

    let processedCount = 0;
    let totalFiles = fileList.length;
    let allNewSheets: SheetData[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          // Process only sheets named "Worklogs"
          const newSheets: SheetData[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            // Only process sheets named "Worklogs"
            if (sheetName !== "Worklogs") {
              return;
            }

            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length === 0) {
              message.warning(
                `Sheet "Worklogs" in "${file.name}" appears to be empty`
              );
              return;
            }

            // Extract headers from first row
            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1);

            // Create table columns
            const columns = headers.map((header, index) => ({
              title: header || `Column ${index + 1}`,
              dataIndex: index.toString(),
              key: index.toString(),
              render: (text: any) => {
                if (text === null || text === undefined) return "-";
                if (typeof text === "object") return JSON.stringify(text);
                return String(text);
              },
            }));

            // Create table data
            const tableData = dataRows.map((row, rowIndex) => {
              const rowData: any = { key: rowIndex };
              headers.forEach((_, colIndex) => {
                rowData[colIndex.toString()] = (row as any[])[colIndex];
              });
              return rowData;
            });

            newSheets.push({
              name: sheetName,
              data: tableData,
              headers: headers,
              columns: columns,
              fileName: file.name,
            });
          });

          if (newSheets.length === 0) {
            message.warning(`No "Worklogs" sheet found in "${file.name}"`);
          }

          // Collect all new sheets
          allNewSheets = allNewSheets.concat(newSheets);
        } catch (error) {
          console.error("Error processing Excel file:", error);
          message.error(
            `Failed to process "${file.name}". Please check the file format.`
          );
        }

        processedCount++;
        if (processedCount === totalFiles) {
          // All files processed, add all new sheets at once
          this.setState(
            (prevState) => {
              const updatedSheets = [...prevState.sheets, ...allNewSheets];

              // Only select the new Worklogs sheets, unselect all existing ones
              const newSheetNames = allNewSheets.map(
                (sheet) => `${sheet.fileName}|${sheet.name}`
              );

              return {
                sheets: updatedSheets,
                selectedSheets: newSheetNames, // Only select new sheets
                isLoading: false,
              };
            },
            () => {
              // Process the newly added sheets
              this.handleSheetSelectionChange(this.state.selectedSheets);

              message.success(
                `Successfully processed ${totalFiles} file(s). Found ${allNewSheets.length} Worklogs sheets.`
              );
            }
          );
        }
      };

      reader.onerror = () => {
        message.error(`Failed to read "${file.name}"`);
        processedCount++;
        if (processedCount === totalFiles) {
          this.setState({ isLoading: false });
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Method to handle single file uploads
  handleFileUpload = (file: File) => {
    this.setState({ isLoading: true, fileName: file.name });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Process only sheets named "Worklogs"
        const newSheets: SheetData[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          // Only process sheets named "Worklogs"
          if (sheetName !== "Worklogs") {
            return;
          }

          const worksheet = workbook.Sheets[sheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            message.warning(
              `Sheet "Worklogs" in "${file.name}" appears to be empty`
            );
            return;
          }

          // Extract headers from first row
          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);

          // Create table columns
          const columns = headers.map((header, index) => ({
            title: header || `Column ${index + 1}`,
            dataIndex: index.toString(),
            key: index.toString(),
            render: (text: any) => {
              if (text === null || text === undefined) return "-";
              if (typeof text === "object") return JSON.stringify(text);
              return String(text);
            },
          }));

          // Create table data
          const tableData = dataRows.map((row, rowIndex) => {
            const rowData: any = { key: rowIndex };
            headers.forEach((_, colIndex) => {
              rowData[colIndex.toString()] = (row as any[])[colIndex];
            });
            return rowData;
          });

          newSheets.push({
            name: sheetName,
            data: tableData,
            headers: headers,
            columns: columns,
            fileName: file.name,
          });
        });

        if (newSheets.length === 0) {
          message.warning(`No "Worklogs" sheet found in "${file.name}"`);
          this.setState({ isLoading: false });
          return;
        }

        // Add new sheets to existing sheets
        this.setState(
          (prevState) => {
            const updatedSheets = [...prevState.sheets, ...newSheets];

            // Only select the new Worklogs sheets, unselect all existing ones
            const newSheetNames = newSheets.map(
              (sheet) => `${sheet.fileName}|${sheet.name}`
            );

            return {
              sheets: updatedSheets,
              selectedSheets: newSheetNames, // Only select new sheets
              isLoading: false,
            };
          },
          () => {
            // Process the newly added sheets
            this.handleSheetSelectionChange(this.state.selectedSheets);

            message.success(
              `Successfully loaded Worklogs sheet from "${file.name}"`
            );
          }
        );
      } catch (error) {
        console.error("Error processing Excel file:", error);
        message.error(
          "Failed to process Excel file. Please check the file format."
        );
        this.setState({ isLoading: false });
      }
    };

    reader.onerror = () => {
      message.error("Failed to read the file");
      this.setState({ isLoading: false });
    };

    reader.readAsArrayBuffer(file);
  };

  // New method to get the title for the displayed rows based on current context
  getDisplayedRowsTitle = () => {
    const {
      selectedCategory,
      selectedUser,
      selectedUserCategory,
      selectedIssueKey,
    } = this.state;

    if (selectedIssueKey) {
      return `${selectedIssueKey} - User Breakdown Data`;
    } else if (selectedUserCategory) {
      return `${selectedUser} - ${selectedUserCategory} - Issue Data`;
    } else if (selectedUser) {
      return `${selectedUser} - Category Breakdown Data`;
    } else if (selectedCategory) {
      return `${selectedCategory} - Breakdown Data`;
    } else {
      return "Filtered Data";
    }
  };

  render() {
    const {
      excelData,
      columns,
      isLoading,
      fileName,
      groupedData,
      totalHours,
      selectedCategory,
      detailedData,
      categoryTotalHours,
      selectedIssueKey,
      issueUserData,
      issueTotalHours,
      summaryViewMode,
      groupedByName,
      selectedUser,
      userCategoryData,
      userTotalHours,
      selectedUserCategory,
      userCategoryIssueData,
      userCategoryIssueDataWithType,
      userCategoryIssueTotal,
      detailedByIssueWithType,
      detailedByType,
      issueWorkDescriptions,
      userCategoryIssueWorkDescriptions,
      showWorkDescriptionModal,
      selectedWorkDescriptions,
      selectedWorkDescriptionTitle,
      selectedWorkDescriptionDetails,
      sheets,
      selectedSheets,
      excludeHolidayAbsence,
      excludeAfterDate,
      groupedDataByCategory,
      filteredData,
      displayedRows,
    } = this.state;

    return (
      <div style={{ padding: "20px" }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Title level={3}>
                <FileExcelOutlined style={{ marginRight: "8px" }} />
                Tempo Analyzer
              </Title>
              <Text type="secondary">
                Upload an Excel file to analyze Tempo data and gain insights
              </Text>
            </div>

            <Alert
              message="Instructions"
              description="Upload Excel files (.xlsx or .xls) to begin analysis. Only sheets named 'Worklogs' will be processed. You can upload multiple files at once and select which Worklogs sheets to include in your analysis."
              type="info"
              showIcon
            />

            <Upload
              beforeUpload={(file, fileList) => {
                // If multiple files are being uploaded, only process on the first file
                if (fileList && fileList.length > 1) {
                  // Only process if this is the first file in the list
                  if (fileList[0] !== file) {
                    return false; // Skip processing for subsequent files
                  }

                  // Validate all files first
                  for (const f of fileList) {
                    const isExcel =
                      f.type ===
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                      f.type === "application/vnd.ms-excel" ||
                      f.name.endsWith(".xlsx") ||
                      f.name.endsWith(".xls");

                    if (!isExcel) {
                      message.error("You can only upload Excel files!");
                      return false;
                    }

                    const isLt10M = f.size / 1024 / 1024 < 10;
                    if (!isLt10M) {
                      message.error("File must be smaller than 10MB!");
                      return false;
                    }
                  }

                  // Process all files together (only once)
                  this.handleMultipleFileUpload(fileList);
                  return false;
                } else {
                  // Single file upload - use existing logic
                  const isExcel =
                    file.type ===
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                    file.type === "application/vnd.ms-excel" ||
                    file.name.endsWith(".xlsx") ||
                    file.name.endsWith(".xls");

                  if (!isExcel) {
                    message.error("You can only upload Excel files!");
                    return false;
                  }

                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    message.error("File must be smaller than 10MB!");
                    return false;
                  }

                  this.handleFileUpload(file);
                  return false;
                }
              }}
              showUploadList={false}
              accept=".xlsx,.xls"
              multiple={true}
            >
              <Button
                icon={<UploadOutlined />}
                size="large"
                loading={isLoading}
                type="primary"
              >
                {isLoading ? "Processing..." : "Upload Excel Files"}
              </Button>
            </Upload>

            {fileName && <Text strong>Current file: {fileName}</Text>}

            {/* Loaded Sheets Display */}
            {sheets.length > 0 && (
              <Card size="small" title="Loaded Worklogs Sheets">
                <Space direction="vertical" style={{ width: "100%" }}>
                  {sheets.map((sheet, index) => (
                    <div
                      key={`${sheet.fileName}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px",
                        border: "1px solid #d9d9d9",
                        borderRadius: "6px",
                        backgroundColor: selectedSheets.includes(
                          `${sheet.fileName}|${sheet.name}`
                        )
                          ? "#f0f8ff"
                          : "#fafafa",
                      }}
                    >
                      <div>
                        <Text strong>{sheet.fileName}</Text>
                        <br />
                        <Text type="secondary">
                          {sheet.data.length} rows from Worklogs sheet
                        </Text>
                      </div>
                      <Space>
                        <Checkbox
                          checked={selectedSheets.includes(
                            `${sheet.fileName}|${sheet.name}`
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              this.handleSheetSelectionChange([
                                ...selectedSheets,
                                `${sheet.fileName}|${sheet.name}`,
                              ]);
                            } else {
                              this.handleSheetSelectionChange(
                                selectedSheets.filter(
                                  (name) =>
                                    name !== `${sheet.fileName}|${sheet.name}`
                                )
                              );
                            }
                          }}
                        >
                          Include
                        </Checkbox>
                        <Button
                          size="small"
                          danger
                          onClick={() =>
                            this.removeSheet(sheet.name, sheet.fileName)
                          }
                        >
                          Remove
                        </Button>
                      </Space>
                    </div>
                  ))}
                </Space>
              </Card>
            )}

            {/* Summary View Toggle */}
            {Object.keys(groupedData).length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Radio.Group
                    value={summaryViewMode}
                    onChange={(e) =>
                      this.handleSummaryViewModeChange(e.target.value)
                    }
                    optionType="button"
                    buttonStyle="solid"
                  >
                    <Radio.Button value="category">
                      <BarChartOutlined style={{ marginRight: "4px" }} />
                      Account Category
                    </Radio.Button>
                    {Object.keys(groupedByName).length > 0 && (
                      <Radio.Button value="name">
                        <UserOutlined style={{ marginRight: "4px" }} />
                        Full Name
                      </Radio.Button>
                    )}
                  </Radio.Group>

                  <div style={{ marginTop: "8px" }}>
                    <Checkbox
                      checked={excludeHolidayAbsence}
                      onChange={(e) =>
                        this.handleExcludeHolidayAbsenceChange(e.target.checked)
                      }
                    >
                      Exclude Holiday & Absence data (ABS-56, ABS-58, ABS-57)
                    </Checkbox>
                    <br />
                    <div>
                      <Text strong>Exclude data after:</Text>
                      <br />
                      <DatePicker
                        value={excludeAfterDate}
                        onChange={this.handleExcludeAfterDateChange}
                        placeholder="Select cutoff date"
                        allowClear
                        style={{ marginTop: "4px" }}
                      />
                      <Text type="secondary" style={{ marginLeft: "8px" }}>
                        Any data from 00:00 on the day after the selected date will be excluded
                      </Text>
                    </div>
                  </div>
                </Space>
              </div>
            )}

            {/* Summary or Detailed View */}
            {Object.keys(groupedData).length > 0 && (
              <div>
                {!selectedCategory && !selectedUser ? (
                  // Summary View
                  <>
                    <Title level={4}>
                      <BarChartOutlined style={{ marginRight: "8px" }} />
                      {summaryViewMode === "category"
                        ? "Account Category"
                        : "Full Name"}{" "}
                      Summary
                    </Title>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Total Hours"
                            value={totalHours}
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Total Days"
                            value={totalHours / 7.5}
                            precision={2}
                            suffix="days"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title={`Average per ${summaryViewMode === "category" ? "Category" : "Person"}`}
                            value={
                              totalHours /
                              (summaryViewMode === "category"
                                ? Object.keys(groupedData).length
                                : Object.keys(groupedByName).length)
                            }
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card
                      title={`Hours by ${summaryViewMode === "category" ? "Account Category" : "Full Name"} (Click a row to drill down)`}
                    >
                      <Table
                        dataSource={
                          summaryViewMode === "category"
                            ? Object.entries(groupedDataByCategory).map(
                                ([category, data], index) => ({
                                  key: `category-${index}`,
                                  item: category,
                                  hours: data.totalHours,
                                  chargeableDays: data.totalHours / 7.5,
                                  percentage: (
                                    (data.totalHours / totalHours) *
                                    100
                                  ).toFixed(1),
                                  children: Object.entries(data.accounts).map(
                                    (
                                      [accountName, accountHours],
                                      accountIndex
                                    ) => ({
                                      key: `account-${index}-${accountIndex}`,
                                      item: accountName,
                                      hours: accountHours as number,
                                      chargeableDays:
                                        (accountHours as number) / 7.5,
                                      percentage: (
                                        ((accountHours as number) /
                                          totalHours) *
                                        100
                                      ).toFixed(1),
                                      subPercentage: (
                                        ((accountHours as number) /
                                          data.totalHours) *
                                        100
                                      ).toFixed(1),
                                      isAccount: true,
                                    })
                                  ),
                                })
                              )
                            : Object.entries(groupedByName).map(
                                ([item, hours], index) => ({
                                  key: index,
                                  item: item,
                                  hours: hours,
                                  chargeableDays: hours / 7.5,
                                  percentage: (
                                    (hours / totalHours) *
                                    100
                                  ).toFixed(1),
                                  children: undefined,
                                })
                              )
                        }
                        columns={[
                          {
                            title:
                              summaryViewMode === "category"
                                ? "Account Category"
                                : "Full Name",
                            dataIndex: "item",
                            key: "item",
                            render: (text, record: any) => (
                              <Text strong={!record.isAccount}>
                                {record.isAccount && "  "}
                                {text}
                              </Text>
                            ),
                          },
                          {
                            title: "Logged Hours",
                            dataIndex: "hours",
                            key: "hours",
                            render: (text) => (
                              <Text>{text.toFixed(2)} hrs</Text>
                            ),
                            sorter: (a, b) => a.hours - b.hours,
                            defaultSortOrder: "descend" as const,
                          },
                          {
                            title: "Logged Days",
                            dataIndex: "chargeableDays",
                            key: "chargeableDays",
                            render: (text) => (
                              <Text>{text.toFixed(2)} days</Text>
                            ),
                            sorter: (a, b) =>
                              a.chargeableDays - b.chargeableDays,
                          },
                          {
                            title: "Percentage",
                            dataIndex: "percentage",
                            key: "percentage",
                            render: (text, record: any) => (
                              <Text type="secondary">
                                {text}%
                                {record.isAccount &&
                                  record.subPercentage &&
                                  ` (${record.subPercentage}%)`}
                              </Text>
                            ),
                          },
                        ]}
                        pagination={false}
                        size="small"
                        expandable={
                          summaryViewMode === "category"
                            ? {
                                defaultExpandAllRows: false,
                                expandRowByClick: false,
                              }
                            : undefined
                        }
                        onRow={(record: any) => ({
                          onClick: () => {
                            if (
                              summaryViewMode === "category" &&
                              !record.isAccount
                            ) {
                              this.handleRowClick(record.item);
                            } else if (summaryViewMode === "name") {
                              this.handleUserClick(record.item);
                            }
                          },
                          style: {
                            cursor: record.isAccount ? "default" : "pointer",
                            fontWeight: record.isAccount ? "normal" : "bold",
                          },
                        })}
                      />
                    </Card>
                  </>
                ) : selectedUser && !selectedUserCategory ? (
                  // User Category Breakdown View (Name → Category)
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <Button
                        icon={<UserOutlined />}
                        onClick={this.handleBackToSummary}
                        style={{ marginRight: "16px" }}
                      >
                        Back to Summary
                      </Button>
                      <Title level={4} style={{ margin: 0, flex: 1 }}>
                        <UserOutlined style={{ marginRight: "8px" }} />
                        {selectedUser} - Account Category Breakdown
                      </Title>
                    </div>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="User Total Hours"
                            value={userTotalHours}
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Categories"
                            value={Object.keys(userCategoryData).length}
                            suffix=""
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Average per Category"
                            value={
                              userTotalHours /
                              Object.keys(userCategoryData).length
                            }
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card
                      title={`${selectedUser} - Hours by Account Category (Click a row to see issues)`}
                    >
                      <Table
                        dataSource={Object.entries(userCategoryData).map(
                          ([category, hours], index) => ({
                            key: index,
                            category: category,
                            hours: hours,
                            chargeableDays: hours / 7.5,
                            percentage: (
                              (hours / userTotalHours) *
                              100
                            ).toFixed(1),
                          })
                        )}
                        columns={[
                          {
                            title: "Account Category",
                            dataIndex: "category",
                            key: "category",
                            render: (text) => <Text strong>{text}</Text>,
                          },
                          {
                            title: "Logged Hours",
                            dataIndex: "hours",
                            key: "hours",
                            render: (text) => (
                              <Text>{text.toFixed(2)} hrs</Text>
                            ),
                            sorter: (a, b) => a.hours - b.hours,
                            defaultSortOrder: "descend" as const,
                          },
                          {
                            title: "Logged Days",
                            dataIndex: "chargeableDays",
                            key: "chargeableDays",
                            render: (text) => (
                              <Text>{text.toFixed(2)} days</Text>
                            ),
                            sorter: (a, b) =>
                              a.chargeableDays - b.chargeableDays,
                          },
                          {
                            title: "Percentage",
                            dataIndex: "percentage",
                            key: "percentage",
                            render: (text) => (
                              <Text type="secondary">{text}%</Text>
                            ),
                          },
                        ]}
                        pagination={false}
                        size="small"
                        onRow={(record) => ({
                          onClick: () =>
                            this.handleUserCategoryClick(record.category),
                          style: { cursor: "pointer" },
                        })}
                      />
                    </Card>
                  </>
                ) : selectedUserCategory ? (
                  // User Category Issue Breakdown View (Name → Category → Issue)
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <Button
                        icon={<UserOutlined />}
                        onClick={this.handleBackToSummary}
                        style={{ marginRight: "8px" }}
                      >
                        Summary
                      </Button>
                      <Text style={{ marginRight: "8px" }}>/</Text>
                      <Button
                        icon={<BarChartOutlined />}
                        onClick={() =>
                          this.setState({
                            selectedUserCategory: null,
                            userCategoryIssueData: {},
                            userCategoryIssueTotal: 0,
                          })
                        }
                        style={{ marginRight: "16px" }}
                      >
                        {selectedUser}
                      </Button>
                      <Title level={4} style={{ margin: 0, flex: 1 }}>
                        <BugOutlined style={{ marginRight: "8px" }} />
                        {selectedUser} - {selectedUserCategory} - Issues
                      </Title>
                    </div>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Category Total Hours"
                            value={userCategoryIssueTotal}
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Issues"
                            value={Object.keys(userCategoryIssueData).length}
                            suffix=""
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Average per Issue"
                            value={
                              userCategoryIssueTotal /
                              Object.keys(userCategoryIssueData).length
                            }
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card
                      title={`${selectedUser} - ${selectedUserCategory} - Hours by Issue Key`}
                    >
                      <Table
                        dataSource={Object.entries(
                          userCategoryIssueDataWithType
                        ).map(([issueKey, data], index) => ({
                          key: index,
                          issueKey: issueKey,
                          type: data.type,
                          summary: data.summary,
                          hours: data.hours,
                          chargeableDays: data.hours / 7.5,
                          percentage: (
                            (data.hours / userCategoryIssueTotal) *
                            100
                          ).toFixed(1),
                        }))}
                        columns={[
                          {
                            title: "Issue Key",
                            dataIndex: "issueKey",
                            key: "issueKey",
                            render: (text) => (
                              <a
                                href={`https://lendscape.atlassian.net/browse/${text}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontWeight: "bold" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {text}
                              </a>
                            ),
                          },
                          {
                            title: "Issue Type",
                            dataIndex: "type",
                            key: "type",
                            render: (text) => <Text>{text}</Text>,
                          },
                          {
                            title: "Issue Summary",
                            dataIndex: "summary",
                            key: "summary",
                            render: (text) => (
                              <Text
                                style={{
                                  maxWidth: "200px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {text || "No summary"}
                              </Text>
                            ),
                          },
                          {
                            title: "Work Description",
                            key: "workDescription",
                            render: (_, record) => {
                              const descriptions =
                                userCategoryIssueWorkDescriptions[
                                  record.issueKey
                                ] || [];
                              return descriptions.length > 0 ? (
                                <Button
                                  size="small"
                                  type="link"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    this.showWorkDescriptions(
                                      record.issueKey,
                                      descriptions
                                    );
                                  }}
                                >
                                  View Descriptions ({descriptions.length})
                                </Button>
                              ) : (
                                <Text type="secondary">No descriptions</Text>
                              );
                            },
                          },
                          {
                            title: "Logged Hours",
                            dataIndex: "hours",
                            key: "hours",
                            render: (text) => (
                              <Text>{text.toFixed(2)} hrs</Text>
                            ),
                            sorter: (a, b) => a.hours - b.hours,
                            defaultSortOrder: "descend" as const,
                          },
                          {
                            title: "Logged Days",
                            dataIndex: "chargeableDays",
                            key: "chargeableDays",
                            render: (text) => (
                              <Text>{text.toFixed(2)} days</Text>
                            ),
                            sorter: (a, b) =>
                              a.chargeableDays - b.chargeableDays,
                          },
                          {
                            title: "Percentage",
                            dataIndex: "percentage",
                            key: "percentage",
                            render: (text) => (
                              <Text type="secondary">{text}%</Text>
                            ),
                          },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </Card>
                  </>
                ) : !selectedIssueKey ? (
                  // Detailed View (Category → Issue/Name)
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <Button
                        icon={<BarChartOutlined />}
                        onClick={this.handleBackToSummary}
                        style={{ marginRight: "16px" }}
                      >
                        Back to Summary
                      </Button>
                      <Title level={4} style={{ margin: 0, flex: 1 }}>
                        <BarChartOutlined style={{ marginRight: "8px" }} />
                        {selectedCategory} - Breakdown
                      </Title>
                      <Radio.Group
                        value={this.state.viewMode}
                        onChange={(e) =>
                          this.handleViewModeChange(e.target.value)
                        }
                        optionType="button"
                        buttonStyle="solid"
                      >
                        <Radio.Button value="name">
                          <UserOutlined style={{ marginRight: "4px" }} />
                          Full Name
                        </Radio.Button>
                        <Radio.Button value="issue">
                          <BugOutlined style={{ marginRight: "4px" }} />
                          Issue Key
                        </Radio.Button>
                        <Radio.Button value="type">
                          <BarChartOutlined style={{ marginRight: "4px" }} />
                          Issue Type
                        </Radio.Button>
                      </Radio.Group>
                    </div>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Category Total Hours"
                            value={categoryTotalHours}
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title={
                              this.state.viewMode === "name"
                                ? "People"
                                : this.state.viewMode === "type"
                                  ? "Types"
                                  : "Issues"
                            }
                            value={Object.keys(detailedData).length}
                            suffix=""
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title={`Average per ${this.state.viewMode === "name" ? "Person" : this.state.viewMode === "type" ? "Type" : "Issue"}`}
                            value={
                              categoryTotalHours /
                              Object.keys(detailedData).length
                            }
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card
                      title={`${selectedCategory} - Hours by ${this.state.viewMode === "name" ? "Full Name" : this.state.viewMode === "issue" ? "Issue Key" : "Issue Type"}${this.state.viewMode === "issue" ? " (Click an issue to see user breakdown)" : ""}`}
                    >
                      <Table
                        dataSource={
                          this.state.viewMode === "issue"
                            ? Object.entries(detailedByIssueWithType).map(
                                ([issueKey, data], index) => ({
                                  key: index,
                                  item: issueKey,
                                  hours: data.hours,
                                  type: data.type,
                                  summary: data.summary,
                                  chargeableDays: data.hours / 7.5,
                                  percentage: (
                                    (data.hours / categoryTotalHours) *
                                    100
                                  ).toFixed(1),
                                })
                              )
                            : this.state.viewMode === "type"
                              ? Object.entries(detailedByType).map(
                                  ([type, hours], index) => ({
                                    key: index,
                                    item: type,
                                    hours: hours,
                                    chargeableDays: hours / 7.5,
                                    percentage: (
                                      (hours / categoryTotalHours) *
                                      100
                                    ).toFixed(1),
                                  })
                                )
                              : Object.entries(detailedData).map(
                                  ([item, hours], index) => ({
                                    key: index,
                                    item: item,
                                    hours: hours,
                                    chargeableDays: hours / 7.5,
                                    percentage: (
                                      (hours / categoryTotalHours) *
                                      100
                                    ).toFixed(1),
                                  })
                                )
                        }
                        columns={[
                          {
                            title:
                              this.state.viewMode === "name"
                                ? "Full Name"
                                : this.state.viewMode === "issue"
                                  ? "Issue Key"
                                  : "Issue Type",
                            dataIndex: "item",
                            key: "item",
                            render: (text) => {
                              if (this.state.viewMode === "issue") {
                                return (
                                  <a
                                    href={`https://lendscape.atlassian.net/browse/${text}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontWeight: "bold" }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {text}
                                  </a>
                                );
                              }
                              return <Text strong>{text}</Text>;
                            },
                          },
                          ...(this.state.viewMode === "issue"
                            ? [
                                {
                                  title: "Issue Type",
                                  dataIndex: "type",
                                  key: "type",
                                  render: (text) => <Text>{text}</Text>,
                                },
                                {
                                  title: "Issue Summary",
                                  dataIndex: "summary",
                                  key: "summary",
                                  render: (text) => (
                                    <Text
                                      style={{
                                        maxWidth: "200px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {text || "No summary"}
                                    </Text>
                                  ),
                                },
                                {
                                  title: "Work Description",
                                  key: "workDescription",
                                  render: (_, record) => {
                                    const descriptions =
                                      issueWorkDescriptions[record.item] || [];
                                    return descriptions.length > 0 ? (
                                      <Button
                                        size="small"
                                        type="link"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          this.showWorkDescriptions(
                                            record.item,
                                            descriptions
                                          );
                                        }}
                                      >
                                        View Descriptions ({descriptions.length}
                                        )
                                      </Button>
                                    ) : (
                                      <Text type="secondary">
                                        No descriptions
                                      </Text>
                                    );
                                  },
                                },
                              ]
                            : []),
                          {
                            title: "Logged Hours",
                            dataIndex: "hours",
                            key: "hours",
                            render: (text) => (
                              <Text>{text.toFixed(2)} hrs</Text>
                            ),
                            sorter: (a, b) => a.hours - b.hours,
                            defaultSortOrder: "descend" as const,
                          },
                          {
                            title: "Logged Days",
                            dataIndex: "chargeableDays",
                            key: "chargeableDays",
                            render: (text) => (
                              <Text>{text.toFixed(2)} days</Text>
                            ),
                            sorter: (a, b) =>
                              a.chargeableDays - b.chargeableDays,
                          },
                          {
                            title: "Percentage",
                            dataIndex: "percentage",
                            key: "percentage",
                            render: (text, record: any) => (
                              <Text type="secondary">
                                {text}%
                                {record.isAccount &&
                                  record.subPercentage &&
                                  ` (${record.subPercentage}%)`}
                              </Text>
                            ),
                          },
                        ]}
                        pagination={false}
                        size="small"
                        onRow={
                          this.state.viewMode === "issue"
                            ? (record) => ({
                                onClick: () =>
                                  this.handleIssueKeyClick(record.item),
                                style: { cursor: "pointer" },
                              })
                            : undefined
                        }
                      />
                    </Card>
                  </>
                ) : (
                  // Issue Key User Breakdown View (Category → Issue → User)
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "16px",
                      }}
                    >
                      <Button
                        icon={<BarChartOutlined />}
                        onClick={this.handleBackToSummary}
                        style={{ marginRight: "8px" }}
                      >
                        Summary
                      </Button>
                      <Text style={{ marginRight: "8px" }}>/</Text>
                      <Button
                        icon={<BugOutlined />}
                        onClick={this.handleBackToIssueView}
                        style={{ marginRight: "16px" }}
                      >
                        {selectedCategory}
                      </Button>
                      <Title level={4} style={{ margin: 0, flex: 1 }}>
                        <UserOutlined style={{ marginRight: "8px" }} />
                        {selectedIssueKey} - User Breakdown
                      </Title>
                    </div>

                    <Row gutter={16} style={{ marginBottom: "24px" }}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Issue Total Hours"
                            value={issueTotalHours}
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="People"
                            value={Object.keys(issueUserData).length}
                            suffix=""
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="Average per Person"
                            value={
                              issueTotalHours /
                              Object.keys(issueUserData).length
                            }
                            precision={2}
                            suffix="hrs"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Card title={`${selectedIssueKey} - Hours by Full Name`}>
                      <Table
                        dataSource={Object.entries(issueUserData).map(
                          ([name, hours], index) => ({
                            key: index,
                            name: name,
                            hours: hours,
                            chargeableDays: hours / 7.5,
                            percentage: (
                              (hours / issueTotalHours) *
                              100
                            ).toFixed(1),
                          })
                        )}
                        columns={[
                          {
                            title: "Full Name",
                            dataIndex: "name",
                            key: "name",
                            render: (text) => <Text strong>{text}</Text>,
                          },
                          {
                            title: "Logged Hours",
                            dataIndex: "hours",
                            key: "hours",
                            render: (text) => (
                              <Text>{text.toFixed(2)} hrs</Text>
                            ),
                            sorter: (a, b) => a.hours - b.hours,
                            defaultSortOrder: "descend" as const,
                          },
                          {
                            title: "Logged Days",
                            dataIndex: "chargeableDays",
                            key: "chargeableDays",
                            render: (text) => (
                              <Text>{text.toFixed(2)} days</Text>
                            ),
                            sorter: (a, b) =>
                              a.chargeableDays - b.chargeableDays,
                          },
                          {
                            title: "Percentage",
                            dataIndex: "percentage",
                            key: "percentage",
                            render: (text) => (
                              <Text type="secondary">{text}%</Text>
                            ),
                          },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Raw Data in Expandable Section */}
            {displayedRows.length > 0 && (
              <Collapse>
                <Panel
                  header={`${this.getDisplayedRowsTitle()} (Click to expand)`}
                  key="1"
                >
                  <div>
                    <Text type="secondary">
                      Showing {displayedRows.length} rows for the current
                      selection
                    </Text>
                    <div style={{ marginTop: "16px" }}>
                      <Table
                        columns={columns}
                        dataSource={displayedRows}
                        scroll={{ x: true }}
                        pagination={{
                          pageSize: 20,
                          showSizeChanger: true,
                          showQuickJumper: true,
                          showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} items`,
                        }}
                        size="small"
                      />
                    </div>
                  </div>
                </Panel>
              </Collapse>
            )}
          </Space>
        </Card>

        {/* Work Description Modal */}
        <Modal
          title={selectedWorkDescriptionTitle}
          open={showWorkDescriptionModal}
          onCancel={this.hideWorkDescriptionModal}
          footer={[
            <Button key="close" onClick={this.hideWorkDescriptionModal}>
              Close
            </Button>,
          ]}
          width={600}
        >
          <List
            dataSource={selectedWorkDescriptions.map((description, index) => ({
              key: index,
              description: description,
              fullName:
                selectedWorkDescriptionDetails[index]?.fullName || "N/A",
              date: selectedWorkDescriptionDetails[index]?.date || "N/A",
            }))}
            renderItem={(item, index) => (
              <List.Item>
                <div style={{ width: "100%" }}>
                  <Text strong>
                    {item.fullName} on {item.date}
                  </Text>
                  <br />
                  <Text>{item.description}</Text>
                </div>
              </List.Item>
            )}
          />
        </Modal>
      </div>
    );
  }
}
