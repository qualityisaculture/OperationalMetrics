import { useState, useEffect } from "react";
import { message } from "antd";
import { SheetData, State } from "../types";
import { ISSUE_KEY_EXCEPTIONS } from "../constants";

export const useTempoAnalyzer = (
  sheets: SheetData[],
  selectedSheets: string[]
) => {
  const [analyzerState, setAnalyzerState] = useState<
    Omit<
      State,
      | "sheets"
      | "selectedSheets"
      | "isLoading"
      | "fileName"
      | "currentSheetName"
    >
  >({
    excelData: [],
    columns: [],
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
    typeOfWorkIndex: -1,
    dateIndex: -1,
    rawData: [],
    headers: [],
    filteredData: [],
    viewMode: "name",
    detailedByName: {},
    detailedByIssue: {},
    detailedByIssueWithType: {},
    detailedByType: {},
    detailedByAccount: {},
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
    excludeHolidayAbsence: true,
    excludeStartDate: null,
    excludeEndDate: null,
    groupedDataByCategory: {},
    displayedRows: [],
  });

  useEffect(() => {
    if (selectedSheets.length > 0) {
      combineSheetData();
    } else {
      clearData();
    }
  }, [selectedSheets, sheets]);

  useEffect(() => {
    if (analyzerState.rawData.length > 0) {
      processData(analyzerState.rawData, analyzerState.headers);
    }
  }, [
    analyzerState.excludeHolidayAbsence,
    analyzerState.excludeStartDate,
    analyzerState.excludeEndDate,
  ]);

  const applyFilters = (tableData: any[]) => {
    const {
      excludeHolidayAbsence,
      excludeStartDate,
      excludeEndDate,
      issueKeyIndex,
      dateIndex,
    } = analyzerState;

    let filteredData = [...tableData];

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

    if ((excludeStartDate || excludeEndDate) && dateIndex !== -1) {
      filteredData = filteredData.filter((row) => {
        const workDate = row[dateIndex.toString()];
        if (!workDate) return true;

        try {
          const dateStr = String(workDate).trim();
          const dateOnly = dateStr.split(" ")[0];
          const rowDate = new Date(dateOnly);
          rowDate.setHours(0, 0, 0, 0);

          // Check start date filter
          if (excludeStartDate) {
            const startDate = new Date(excludeStartDate);
            startDate.setHours(0, 0, 0, 0);
            if (rowDate < startDate) return false;
          }

          // Check end date filter
          if (excludeEndDate) {
            const endDate = new Date(excludeEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (rowDate > endDate) return false;
          }

          return true;
        } catch (error) {
          return true;
        }
      });
    }

    return filteredData;
  };

  const processData = (tableData: any[], headers: string[]) => {
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
    const typeOfWorkIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("type of work") ||
        header.toLowerCase().includes("typeofwork") ||
        header.toLowerCase().includes("work type")
    );
    const dateIndex = headers.findIndex(
      (header) =>
        header.toLowerCase().includes("date") ||
        header.toLowerCase().includes("date")
    );

    if (accountCategoryIndex === -1 || loggedHoursIndex === -1) {
      message.warning(
        "Could not find 'Account Category' or 'Logged Hours' columns."
      );
      return;
    }

    const newRawData = tableData;
    const newHeaders = headers;

    setAnalyzerState((prevState) => ({
      ...prevState,
      accountCategoryIndex,
      accountNameIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      issueTypeIndex,
      issueSummaryIndex,
      workDescriptionIndex,
      typeOfWorkIndex,
      dateIndex,
      rawData: newRawData,
      headers: newHeaders,
    }));

    const filteredData = applyFilters(newRawData);

    const grouped: { [key: string]: number } = {};
    const groupedByName: { [key: string]: number } = {};
    const groupedDataByCategory: {
      [category: string]: {
        totalHours: number;
        accounts: {
          [accountName: string]: {
            totalHours: number;
            files: { [fileName: string]: number };
          };
        };
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
          const exception = ISSUE_KEY_EXCEPTIONS.find((exp) => {
            const issueKey =
              issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
            const typeOfWork =
              typeOfWorkIndex !== -1 ? row[typeOfWorkIndex.toString()] : null;

            if (exp.issueKeys && issueKey) {
              return exp.issueKeys.includes(issueKey);
            }
            if (exp.typeOfWork && typeOfWork) {
              return exp.typeOfWork === typeOfWork;
            }
            return false;
          });
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

              if (!groupedDataByCategory[finalCategory].accounts[account]) {
                groupedDataByCategory[finalCategory].accounts[account] = {
                  totalHours: 0,
                  files: {},
                };
              }

              groupedDataByCategory[finalCategory].accounts[
                account
              ].totalHours += loggedHours;

              // Add file-level breakdown
              const fileName = (row as any)._fileName;
              if (fileName) {
                groupedDataByCategory[finalCategory].accounts[account].files[
                  fileName
                ] =
                  (groupedDataByCategory[finalCategory].accounts[account].files[
                    fileName
                  ] || 0) + loggedHours;
              }
            }
          }
        }
      }

      if (fullName) {
        const name = String(fullName).trim();
        if (name) {
          groupedByName[name] = (groupedByName[name] || 0) + loggedHours;
        }
      }
    });

    setAnalyzerState((prevState) => ({
      ...prevState,
      filteredData,
      groupedData: grouped,
      groupedByName: groupedByName,
      totalHours: totalHours,
      groupedDataByCategory: groupedDataByCategory,
    }));
  };

  const combineSheetData = () => {
    if (selectedSheets.length === 0) {
      return;
    }

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
          combinedHeaders = sheet.headers;
          combinedColumns = sheet.columns;
        } else {
          if (
            JSON.stringify(combinedHeaders) !== JSON.stringify(sheet.headers)
          ) {
            message.warning(
              `Headers in sheet "${sheetName}" from "${fileName}" don't match. Skipping.`
            );
            return;
          }
        }
        // Add file information to each row
        const rowsWithFileInfo = sheet.data.map((row: any) => ({
          ...row,
          _fileName: fileName,
          _sheetName: sheetName,
        }));
        combinedData = combinedData.concat(rowsWithFileInfo);
      }
    });

    if (combinedData.length > 0) {
      processData(combinedData, combinedHeaders);
      setAnalyzerState((prevState) => ({
        ...prevState,
        excelData: combinedData,
        columns: combinedColumns,
      }));
      message.success(
        `Combined ${selectedSheets.length} sheet(s) with ${combinedData.length} total rows.`
      );
    }
  };

  const clearData = () => {
    setAnalyzerState({
      excelData: [],
      columns: [],
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
      typeOfWorkIndex: -1,
      dateIndex: -1,
      rawData: [],
      headers: [],
      filteredData: [],
      viewMode: "name",
      detailedByName: {},
      detailedByIssue: {},
      detailedByIssueWithType: {},
      detailedByType: {},
      detailedByAccount: {},
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
      excludeHolidayAbsence: false,
      excludeStartDate: null,
      excludeEndDate: null,
      groupedDataByCategory: {},
      displayedRows: [],
    });
  };

  const handleRowClick = (category: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      accountNameIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      issueTypeIndex,
      issueSummaryIndex,
      workDescriptionIndex,
      dateIndex,
      typeOfWorkIndex,
    } = analyzerState;

    if (fullNameIndex === -1 && issueKeyIndex === -1) {
      message.warning(
        "Neither 'Full Name' nor 'Issue Key' columns found. Cannot show detailed breakdown."
      );
      return;
    }

    let originalCategory = category;
    let exceptionIssueKeys: string[] | null = null;
    let exceptionTypeOfWork: string | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (category.endsWith(` ${exception.categorySuffix}`)) {
        originalCategory = category.replace(` ${exception.categorySuffix}`, "");
        exceptionIssueKeys = exception.issueKeys || [];
        exceptionTypeOfWork = exception.typeOfWork || null;
        break;
      }
    }

    const detailedByName: { [key: string]: number } = {};
    const detailedByIssue: { [key: string]: number } = {};
    const detailedByIssueWithType: {
      [key: string]: {
        hours: number;
        type: string;
        summary: string;
        typeOfWork: string;
      };
    } = {};
    const detailedByType: { [key: string]: number } = {};
    const detailedByAccount: { [key: string]: number } = {};
    const issueWorkDescriptions: {
      [key: string]: Array<{
        description: string;
        fullName: string;
        date: string;
      }>;
    } = {};
    let categoryTotal = 0;
    const categoryRows: any[] = [];

    filteredData.forEach((row) => {
      const rowCategory = row[accountCategoryIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (String(rowCategory).trim() === originalCategory) {
        const rowIssueKey = row[issueKeyIndex.toString()];
        const typeOfWork =
          typeOfWorkIndex !== -1 ? row[typeOfWorkIndex.toString()] : null;

        if (exceptionIssueKeys) {
          let matches = false;
          if (exceptionIssueKeys && exceptionIssueKeys.includes(rowIssueKey)) {
            matches = true;
          }
          if (exceptionTypeOfWork && exceptionTypeOfWork === typeOfWork) {
            matches = true;
          }
          if (!matches) {
            return;
          }
        } else {
          const isExceptionRow = ISSUE_KEY_EXCEPTIONS.some((exp) => {
            if (exp.issueKeys && exp.issueKeys.includes(rowIssueKey)) {
              return true;
            }
            if (exp.typeOfWork && exp.typeOfWork === typeOfWork) {
              return true;
            }
            return false;
          });
          if (isExceptionRow) {
            return;
          }
        }

        categoryTotal += loggedHours;
        categoryRows.push(row);

        if (fullNameIndex !== -1) {
          const fullName = row[fullNameIndex.toString()];
          if (fullName) {
            const name = String(fullName).trim();
            if (name) {
              detailedByName[name] = (detailedByName[name] || 0) + loggedHours;
            }
          }
        }

        if (issueKeyIndex !== -1) {
          const issueKey = row[issueKeyIndex.toString()];
          if (issueKey) {
            const key = String(issueKey).trim();
            if (key) {
              detailedByIssue[key] = (detailedByIssue[key] || 0) + loggedHours;

              const issueType =
                issueTypeIndex !== -1
                  ? row[issueTypeIndex.toString()]
                  : "Unknown";
              const type = String(issueType).trim() || "Unknown";

              const issueSummary =
                issueSummaryIndex !== -1
                  ? row[issueSummaryIndex.toString()]
                  : "";
              const summary = String(issueSummary).trim() || "";

              const typeOfWorkValue =
                typeOfWorkIndex !== -1 ? row[typeOfWorkIndex.toString()] : "";
              const workType = String(typeOfWorkValue).trim() || "";

              if (detailedByIssueWithType[key]) {
                detailedByIssueWithType[key].hours += loggedHours;
              } else {
                detailedByIssueWithType[key] = {
                  hours: loggedHours,
                  type: type,
                  summary: summary,
                  typeOfWork: workType,
                };
              }

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

        if (issueTypeIndex !== -1) {
          const issueType = row[issueTypeIndex.toString()];
          if (issueType) {
            const type = String(issueType).trim();
            if (type) {
              detailedByType[type] = (detailedByType[type] || 0) + loggedHours;
            }
          }
        }

        if (accountNameIndex !== -1) {
          const accountName = row[accountNameIndex.toString()];
          if (accountName) {
            const account = String(accountName).trim();
            if (account) {
              detailedByAccount[account] =
                (detailedByAccount[account] || 0) + loggedHours;
            }
          }
        }
      }
    });

    let defaultViewMode: "name" | "issue" | "type" | "account" = "issue";
    if (fullNameIndex === -1 && issueKeyIndex !== -1) {
      defaultViewMode = "issue";
    } else if (fullNameIndex !== -1 && issueKeyIndex !== -1) {
      defaultViewMode = "issue";
    } else if (fullNameIndex !== -1 && issueKeyIndex === -1) {
      defaultViewMode = "name";
    } else if (accountNameIndex !== -1) {
      defaultViewMode = "account";
    }

    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedCategory: category,
      detailedData:
        defaultViewMode === "name"
          ? detailedByName
          : defaultViewMode === "issue"
            ? detailedByIssue
            : defaultViewMode === "account"
              ? detailedByAccount
              : detailedByType,
      categoryTotalHours: categoryTotal,
      viewMode: defaultViewMode,
      detailedByName,
      detailedByIssue,
      detailedByIssueWithType,
      detailedByType,
      detailedByAccount,
      issueWorkDescriptions,
      displayedRows: categoryRows,
    }));
  };

  const handleBackToSummary = () => {
    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedCategory: null,
      detailedData: {},
      categoryTotalHours: 0,
      detailedByAccount: {},
      selectedUser: null,
      userCategoryData: {},
      userTotalHours: 0,
      selectedUserCategory: null,
      userCategoryIssueData: {},
      userCategoryIssueTotal: 0,
      displayedRows: [],
    }));
  };

  const handleSummaryViewModeChange = (mode: "category" | "name") => {
    const { groupedByName } = analyzerState;

    if (mode === "name" && Object.keys(groupedByName).length === 0) {
      message.warning("No Full Name data available.");
      return;
    }

    setAnalyzerState((prevState) => ({ ...prevState, summaryViewMode: mode }));
  };

  const handleUserClick = (userName: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
    } = analyzerState;

    if (fullNameIndex === -1) {
      message.warning(
        "Full Name column not found. Cannot show user breakdown."
      );
      return;
    }

    const userCategoryData: { [key: string]: number } = {};
    let userTotal = 0;
    const userRows: any[] = [];

    filteredData.forEach((row) => {
      const rowFullName = row[fullNameIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;
      const issueKey =
        issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;

      if (String(rowFullName).trim() === userName) {
        userTotal += loggedHours;
        userRows.push(row);

        const accountCategory = row[accountCategoryIndex.toString()];
        if (accountCategory) {
          const category = String(accountCategory).trim();
          if (category) {
            const exception = ISSUE_KEY_EXCEPTIONS.find((exp) =>
              exp.issueKeys?.includes(issueKey)
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

    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedUser: userName,
      userCategoryData: userCategoryData,
      userTotalHours: userTotal,
      displayedRows: userRows,
    }));
  };

  const handleUserCategoryClick = (category: string) => {
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
      typeOfWorkIndex,
    } = analyzerState;

    if (issueKeyIndex === -1) {
      message.warning(
        "Issue Key column not found. Cannot show issue breakdown."
      );
      return;
    }

    let originalCategory = category;
    let exceptionIssueKeys: string[] | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (category.endsWith(` ${exception.categorySuffix}`)) {
        originalCategory = category.replace(` ${exception.categorySuffix}`, "");
        exceptionIssueKeys = exception.issueKeys || [];
        break;
      }
    }

    const userCategoryIssueData: { [key: string]: number } = {};
    const userCategoryIssueDataWithType: {
      [key: string]: {
        hours: number;
        type: string;
        summary: string;
        typeOfWork: string;
      };
    } = {};
    const userCategoryIssueWorkDescriptions: {
      [key: string]: Array<{
        description: string;
        fullName: string;
        date: string;
      }>;
    } = {};
    let userCategoryIssueTotal = 0;
    const userCategoryRows: any[] = [];

    filteredData.forEach((row) => {
      const rowFullName = row[fullNameIndex.toString()];
      const rowCategory = row[accountCategoryIndex.toString()];
      const rowIssueKey = row[issueKeyIndex.toString()];
      const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

      if (
        String(rowFullName).trim() === selectedUser &&
        String(rowCategory).trim() === originalCategory
      ) {
        if (exceptionIssueKeys && !exceptionIssueKeys.includes(rowIssueKey)) {
          return;
        } else if (!exceptionIssueKeys) {
          const isExceptionRow = ISSUE_KEY_EXCEPTIONS.some((exp) =>
            exp.issueKeys?.includes(rowIssueKey)
          );
          if (isExceptionRow) {
            return;
          }
        }

        userCategoryIssueTotal += loggedHours;
        userCategoryRows.push(row);

        if (rowIssueKey) {
          const key = String(rowIssueKey).trim();
          if (key) {
            userCategoryIssueData[key] =
              (userCategoryIssueData[key] || 0) + loggedHours;

            const issueType =
              issueTypeIndex !== -1
                ? row[issueTypeIndex.toString()]
                : "Unknown";
            const type = String(issueType).trim() || "Unknown";

            const issueSummary =
              issueSummaryIndex !== -1 ? row[issueSummaryIndex.toString()] : "";
            const summary = String(issueSummary).trim() || "";

            const typeOfWork =
              typeOfWorkIndex !== -1 ? row[typeOfWorkIndex.toString()] : "";
            const workType = String(typeOfWork).trim() || "";

            if (userCategoryIssueDataWithType[key]) {
              userCategoryIssueDataWithType[key].hours += loggedHours;
            } else {
              userCategoryIssueDataWithType[key] = {
                hours: loggedHours,
                type: type,
                summary: summary,
                typeOfWork: workType,
              };
            }

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

    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedUserCategory: category,
      userCategoryIssueData: userCategoryIssueData,
      userCategoryIssueDataWithType: userCategoryIssueDataWithType,
      userCategoryIssueWorkDescriptions: userCategoryIssueWorkDescriptions,
      userCategoryIssueTotal: userCategoryIssueTotal,
      displayedRows: userCategoryRows,
    }));
  };

  const handleViewModeChange = (
    mode: "name" | "issue" | "type" | "account"
  ) => {
    const {
      detailedByName,
      detailedByIssue,
      detailedByType,
      detailedByAccount,
      issueTypeIndex,
      accountNameIndex,
    } = analyzerState;

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
    if (mode === "account" && Object.keys(detailedByAccount).length === 0) {
      message.warning("No Account Name data available for this category.");
      return;
    }
    if (mode === "account" && accountNameIndex === -1) {
      message.warning(
        "Account Name column not found. Cannot show Account Name breakdown."
      );
      return;
    }

    setAnalyzerState((prevState) => ({
      ...prevState,
      viewMode: mode,
      detailedData:
        mode === "name"
          ? detailedByName
          : mode === "issue"
            ? detailedByIssue
            : mode === "account"
              ? detailedByAccount
              : detailedByType,
      selectedIssueKey: null,
      issueUserData: {},
      issueTotalHours: 0,
    }));
  };

  const handleIssueKeyClick = (issueKey: string) => {
    const {
      filteredData,
      accountCategoryIndex,
      loggedHoursIndex,
      fullNameIndex,
      issueKeyIndex,
      typeOfWorkIndex,
      selectedCategory,
    } = analyzerState;

    if (fullNameIndex === -1) {
      message.warning(
        "Full Name column not found. Cannot show user breakdown."
      );
      return;
    }

    let originalCategory = selectedCategory;
    let exceptionIssueKeys: string[] | null = null;
    let exceptionTypeOfWork: string | null = null;

    for (const exception of ISSUE_KEY_EXCEPTIONS) {
      if (
        selectedCategory &&
        selectedCategory.endsWith(` ${exception.categorySuffix}`)
      ) {
        originalCategory = selectedCategory.replace(
          ` ${exception.categorySuffix}`,
          ""
        );
        exceptionIssueKeys = exception.issueKeys || [];
        exceptionTypeOfWork = exception.typeOfWork || null;
        break;
      }
    }

    const userData: { [key: string]: number } = {};
    let issueTotal = 0;
    const issueRows: any[] = [];

    filteredData.forEach((row) => {
      const rowCategory = row[accountCategoryIndex.toString()];
      const rowIssueKey = row[issueKeyIndex.toString()];
      const typeOfWork = row[typeOfWorkIndex.toString()];

      if (
        String(rowCategory).trim() === originalCategory &&
        String(rowIssueKey).trim() === issueKey
      ) {
        const rowData = {
          fullName: row[fullNameIndex.toString()],
          loggedHours: parseFloat(row[loggedHoursIndex.toString()]) || 0,
        };
        issueRows.push(rowData);
      } else if (
        String(rowCategory).trim() === originalCategory &&
        exceptionIssueKeys &&
        exceptionIssueKeys.includes(rowIssueKey)
      ) {
        const rowData = {
          fullName: row[fullNameIndex.toString()],
          loggedHours: parseFloat(row[loggedHoursIndex.toString()]) || 0,
        };
        issueRows.push(rowData);
      } else if (
        String(rowCategory).trim() === originalCategory &&
        exceptionTypeOfWork &&
        exceptionTypeOfWork.includes(typeOfWork)
      ) {
        const rowData = {
          fullName: row[fullNameIndex.toString()],
          loggedHours: parseFloat(row[loggedHoursIndex.toString()]) || 0,
        };
        issueRows.push(rowData);
      }
    });

    issueRows.forEach((row) => {
      const fullName = String(row.fullName).trim();
      if (fullName) {
        userData[fullName] = (userData[fullName] || 0) + row.loggedHours;
        issueTotal += row.loggedHours;
      }
    });

    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedIssueKey: issueKey,
      issueUserData: userData,
      issueTotalHours: issueTotal,
      displayedRows: issueRows,
    }));
  };

  const handleBackToIssueView = () => {
    setAnalyzerState((prevState) => ({
      ...prevState,
      selectedIssueKey: null,
      issueUserData: {},
      issueTotalHours: 0,
      displayedRows: [],
    }));
  };

  const showWorkDescriptions = (
    issueKey: string,
    descriptions: Array<{ description: string; fullName: string; date: string }>
  ) => {
    setAnalyzerState((prevState) => ({
      ...prevState,
      showWorkDescriptionModal: true,
      selectedWorkDescriptions: descriptions.map((desc) => desc.description),
      selectedWorkDescriptionTitle: `Work Descriptions for ${issueKey}`,
      selectedWorkDescriptionDetails: descriptions.map((desc) => ({
        fullName: desc.fullName,
        date: desc.date,
      })),
    }));
  };

  const hideWorkDescriptionModal = () => {
    setAnalyzerState((prevState) => ({
      ...prevState,
      showWorkDescriptionModal: false,
      selectedWorkDescriptions: [],
      selectedWorkDescriptionTitle: "",
      selectedWorkDescriptionDetails: [],
    }));
  };

  const handleExcludeHolidayAbsenceChange = (checked: boolean) => {
    setAnalyzerState((prevState) => ({
      ...prevState,
      excludeHolidayAbsence: checked,
    }));
  };

  const handleExcludeStartDateChange = (date: any) => {
    setAnalyzerState((prevState) => ({ ...prevState, excludeStartDate: date }));
  };

  const handleExcludeEndDateChange = (date: any) => {
    setAnalyzerState((prevState) => ({ ...prevState, excludeEndDate: date }));
  };

  const getDisplayedRowsTitle = () => {
    const {
      selectedCategory,
      selectedUser,
      selectedUserCategory,
      selectedIssueKey,
    } = analyzerState;

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

  // ... All other handle functions will go here ...

  return {
    ...analyzerState,
    handleRowClick,
    handleBackToSummary,
    handleSummaryViewModeChange,
    handleUserClick,
    handleUserCategoryClick,
    handleViewModeChange,
    handleIssueKeyClick,
    handleBackToIssueView,
    showWorkDescriptions,
    hideWorkDescriptionModal,
    handleExcludeHolidayAbsenceChange,
    handleExcludeStartDateChange,
    handleExcludeEndDateChange,
    getDisplayedRowsTitle,
    setAnalyzerState,
  };
};
