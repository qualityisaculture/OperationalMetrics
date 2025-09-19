export interface IssueDetail {
  hours: number;
  type: string;
  summary: string;
  typeOfWork: string;
}

export interface IssueKeyException {
  issueKeys?: string[];
  typeOfWork?: string;
  categorySuffix: string;
}

export interface SheetData {
  name: string;
  data: any[];
  headers: string[];
  columns: any[];
  fileName: string;
}

export interface Props {}

export interface State {
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
  typeOfWorkIndex: number;
  dateIndex: number;
  rawData: any[];
  headers: string[];
  // New state for filtered data that respects all filters
  filteredData: any[];
  viewMode: "name" | "issue" | "type" | "account";
  detailedByName: { [key: string]: number };
  detailedByIssue: { [key: string]: number };
  detailedByIssueWithType: { [key: string]: IssueDetail };
  detailedByType: { [key: string]: number };
  detailedByAccount: { [key: string]: number };
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
  userCategoryIssueDataWithType: { [key: string]: IssueDetail };
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
  // New state for excluding data outside a date range
  excludeStartDate: Date | null;
  excludeEndDate: Date | null;
  // New state for showing other teams' work
  showOtherTeams: boolean;
  // New state for hierarchical category data
  groupedDataByCategory: {
    [category: string]: {
      totalHours: number;
      accounts: {
        [accountName: string]: {
          totalHours: number;
          files: { [fileName: string]: number };
        };
      };
      issueTypes: {
        [issueType: string]: {
          totalHours: number;
          files: { [fileName: string]: number };
        };
      };
    };
  };
  // New state for secondary split mode
  secondarySplitMode: "account" | "issueType";
  // New state for tracking which rows to show in the expandable table
  displayedRows: any[];
}

export interface UserGroup {
  id: string;
  name: string;
}

export interface UserGroupAssignment {
  fullName: string;
  groupId: string | null; // null means "uncategorised"
}

export interface UserGroupState {
  groups: UserGroup[];
  assignments: UserGroupAssignment[];
}
