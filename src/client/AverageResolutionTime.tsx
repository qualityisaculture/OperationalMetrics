import React from "react";
import {
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Typography,
  Input,
  Modal,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

const { TextArea } = Input;

const { Text } = Typography;

type Project = {
  id: string;
  key: string;
  name: string;
};

type ResolutionTimeIssue = {
  key: string;
  summary: string;
  type: string;
  status: string;
  createdDate: string;
  resolutionDate: string;
  url: string;
  timeInStates: { status: string; days: number }[];
};

type ResolutionCategory =
  | "Unresolved"
  | "Resolved within 1 month"
  | "Resolved within 1 quarter"
  | "Resolved within 2 quarters"
  | "Resolved within 1 year"
  | "Resolved greater than 1 year";

type QuarterData = {
  quarter: string;
  unresolved: ResolutionTimeIssue[];
  resolvedWithin1Month: ResolutionTimeIssue[];
  resolvedWithin1Quarter: ResolutionTimeIssue[];
  resolvedWithin2Quarters: ResolutionTimeIssue[];
  resolvedWithin1Year: ResolutionTimeIssue[];
  resolvedGreaterThan1Year: ResolutionTimeIssue[];
};

type SavedQuery = {
  id: string;
  name: string;
  jqlQuery: string;
  savedAt: string;
};

interface Props {}

interface State {
  projectKeys: string[];
  selectedDate: Dayjs | null;
  isLoading: boolean;
  issues: ResolutionTimeIssue[];
  projects: Project[];
  isLoadingProjects: boolean;
  selectedStates: string[];
  availableStates: string[];
  jqlQuery: string;
  modalVisible: boolean;
  modalIssues: ResolutionTimeIssue[];
  modalQuarter: string;
  modalQuarterData: QuarterData | null;
  savedQueries: SavedQuery[];
  saveQueryModalVisible: boolean;
  saveQueryName: string;
}

export default class AverageResolutionTime extends React.Component<
  Props,
  State
> {
  constructor(props: Props) {
    super(props);
    const savedProjects = localStorage.getItem("averageResolutionTimeProjects");
    const savedDate = localStorage.getItem("averageResolutionTimeDate");
    let initialProjects: string[] = [];
    let initialDate: Dayjs | null = null;

    if (savedProjects) {
      try {
        initialProjects = JSON.parse(savedProjects);
      } catch (error) {
        console.error("Error parsing saved projects:", error);
      }
    }

    if (savedDate) {
      try {
        initialDate = dayjs(savedDate);
      } catch (error) {
        console.error("Error parsing saved date:", error);
      }
    }

    const savedQuery = localStorage.getItem("averageResolutionTimeQuery");
    const savedSelectedStates = localStorage.getItem(
      "averageResolutionTimeSelectedStates"
    );
    let initialSelectedStates: string[] = [];

    if (savedSelectedStates) {
      try {
        initialSelectedStates = JSON.parse(savedSelectedStates);
      } catch (error) {
        console.error("Error parsing saved selected states:", error);
      }
    }

    // Load saved queries
    const savedQueriesJson = localStorage.getItem(
      "averageResolutionTimeSavedQueries"
    );
    let initialSavedQueries: SavedQuery[] = [];
    if (savedQueriesJson) {
      try {
        initialSavedQueries = JSON.parse(savedQueriesJson);
      } catch (error) {
        console.error("Error parsing saved queries:", error);
      }
    }

    this.state = {
      projectKeys: initialProjects,
      selectedDate: initialDate,
      isLoading: false,
      issues: [],
      projects: [],
      isLoadingProjects: false,
      selectedStates: initialSelectedStates,
      availableStates: [],
      jqlQuery: savedQuery || "",
      modalVisible: false,
      modalIssues: [],
      modalQuarter: "",
      modalQuarterData: null,
      savedQueries: initialSavedQueries,
      saveQueryModalVisible: false,
      saveQueryName: "",
    };
  }

  componentDidMount() {
    this.loadProjects();
    // Generate query if we have projects and date from localStorage
    if (this.state.projectKeys.length > 0 && this.state.selectedDate) {
      this.generateQuery();
    }
  }

  loadProjects = () => {
    this.setState({ isLoadingProjects: true });

    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => {
        const projects: Project[] = JSON.parse(data.data);
        this.setState({
          projects: projects,
          isLoadingProjects: false,
        });
      })
      .catch((error) => {
        console.error("Projects API Error:", error);
        this.setState({
          isLoadingProjects: false,
          projects: [],
        });
      });
  };

  handleProjectChange = (values: string[]) => {
    this.setState({ projectKeys: values }, () => {
      this.generateQuery();
    });
    localStorage.setItem(
      "averageResolutionTimeProjects",
      JSON.stringify(values)
    );
  };

  handleDateChange = (date: Dayjs | null) => {
    this.setState({ selectedDate: date }, () => {
      this.generateQuery();
    });
    if (date) {
      localStorage.setItem("averageResolutionTimeDate", date.toISOString());
    } else {
      localStorage.removeItem("averageResolutionTimeDate");
    }
  };

  generateQuery = () => {
    const { projectKeys, selectedDate } = this.state;

    if (projectKeys.length === 0 || !selectedDate) {
      this.setState({ jqlQuery: "" });
      return;
    }

    const projectQuery = projectKeys
      .map((key) => `project = "${key}"`)
      .join(" OR ");
    const dateStr = selectedDate.format("YYYY-MM-DD");
    const generatedQuery = `(${projectQuery}) AND created >= "${dateStr}" ORDER BY created DESC`;

    this.setState({ jqlQuery: generatedQuery });
  };

  handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const query = e.target.value;
    this.setState({ jqlQuery: query });
    localStorage.setItem("averageResolutionTimeQuery", query);
  };

  handleGetIssues = () => {
    const { jqlQuery } = this.state;

    if (!jqlQuery || jqlQuery.trim().length === 0) {
      return;
    }

    this.setState({ isLoading: true, issues: [] });

    fetch(`/api/averageResolutionTime?jql=${encodeURIComponent(jqlQuery)}`)
      .then((response) => response.json())
      .then((data) => {
        const issues: ResolutionTimeIssue[] = JSON.parse(data.data);

        console.log("Received issues:", issues.length);
        if (issues.length > 0) {
          console.log("Sample issue:", issues[0]);
          console.log("Sample createdDate:", issues[0].createdDate);
        }

        // Extract all unique states from all issues
        const allStates = new Set<string>();
        issues.forEach((issue) => {
          issue.timeInStates.forEach((state) => {
            allStates.add(state.status);
          });
        });
        const sortedStates = Array.from(allStates).sort();

        // Preserve previously selected states, intersect with available states
        const previousSelectedStates = this.state.selectedStates;
        let newSelectedStates: string[];

        if (previousSelectedStates.length > 0) {
          // Keep only states that are both previously selected and available
          newSelectedStates = previousSelectedStates.filter((state) =>
            sortedStates.includes(state)
          );
          // If no previously selected states are available, select all
          if (newSelectedStates.length === 0) {
            newSelectedStates = sortedStates;
          }
        } else {
          // If no previous selection, select all states
          newSelectedStates = sortedStates;
        }

        this.setState({
          issues: issues,
          isLoading: false,
          availableStates: sortedStates,
          selectedStates: newSelectedStates,
        });

        // Save the updated selected states
        localStorage.setItem(
          "averageResolutionTimeSelectedStates",
          JSON.stringify(newSelectedStates)
        );
      })
      .catch((error) => {
        console.error("Error fetching resolution time data:", error);
        this.setState({
          isLoading: false,
          issues: [],
        });
      });
  };

  handleStateChange = (values: string[]) => {
    this.setState({ selectedStates: values });
    localStorage.setItem(
      "averageResolutionTimeSelectedStates",
      JSON.stringify(values)
    );
  };

  getQuarterFromDate = (date: string): string => {
    if (!date) return "";
    const d = dayjs(date);
    if (!d.isValid()) {
      console.warn("Invalid date for quarter calculation:", date);
      return "";
    }
    const month = d.month() + 1; // dayjs months are 0-indexed
    const year = d.year();
    let quarter: number;

    if (month <= 3) quarter = 1;
    else if (month <= 6) quarter = 2;
    else if (month <= 9) quarter = 3;
    else quarter = 4;

    return `Q${quarter} ${year}`;
  };

  categorizeIssue = (
    issue: ResolutionTimeIssue,
    createdQuarter: string,
    selectedStates: string[]
  ): ResolutionCategory => {
    if (!issue.resolutionDate) {
      return "Unresolved";
    }

    // Calculate total time in selected states only
    let totalTimeInSelectedStates = 0;
    selectedStates.forEach((state) => {
      const timeInState = issue.timeInStates.find(
        (stateData) => stateData.status === state
      );
      if (timeInState) {
        totalTimeInSelectedStates += timeInState.days;
      }
    });

    // Calculate time periods (in days)
    const oneMonth = 30;
    const oneQuarter = 90;
    const twoQuarters = 180;
    const oneYear = 365;

    if (totalTimeInSelectedStates <= oneMonth) {
      return "Resolved within 1 month";
    } else if (totalTimeInSelectedStates <= oneQuarter) {
      return "Resolved within 1 quarter";
    } else if (totalTimeInSelectedStates <= twoQuarters) {
      return "Resolved within 2 quarters";
    } else if (totalTimeInSelectedStates <= oneYear) {
      return "Resolved within 1 year";
    } else {
      return "Resolved greater than 1 year";
    }
  };

  groupIssuesByQuarter = (
    issues: ResolutionTimeIssue[],
    selectedStates: string[]
  ): QuarterData[] => {
    const grouped = new Map<string, QuarterData>();

    console.log("Grouping issues by quarter. Total issues:", issues.length);

    issues.forEach((issue) => {
      if (!issue.createdDate) {
        console.warn("Issue missing createdDate:", issue.key);
        return;
      }

      const quarter = this.getQuarterFromDate(issue.createdDate);
      if (!quarter) {
        console.warn(
          "Could not determine quarter for issue:",
          issue.key,
          "createdDate:",
          issue.createdDate
        );
        return;
      }

      if (!grouped.has(quarter)) {
        grouped.set(quarter, {
          quarter: quarter,
          unresolved: [],
          resolvedWithin1Month: [],
          resolvedWithin1Quarter: [],
          resolvedWithin2Quarters: [],
          resolvedWithin1Year: [],
          resolvedGreaterThan1Year: [],
        });
      }

      const quarterData = grouped.get(quarter)!;
      const category = this.categorizeIssue(issue, quarter, selectedStates);

      switch (category) {
        case "Unresolved":
          quarterData.unresolved.push(issue);
          break;
        case "Resolved within 1 month":
          quarterData.resolvedWithin1Month.push(issue);
          break;
        case "Resolved within 1 quarter":
          quarterData.resolvedWithin1Quarter.push(issue);
          break;
        case "Resolved within 2 quarters":
          quarterData.resolvedWithin2Quarters.push(issue);
          break;
        case "Resolved within 1 year":
          quarterData.resolvedWithin1Year.push(issue);
          break;
        case "Resolved greater than 1 year":
          quarterData.resolvedGreaterThan1Year.push(issue);
          break;
      }
    });

    console.log("Grouped into quarters:", Array.from(grouped.keys()));

    // Convert to array and sort
    return Array.from(grouped.values()).sort((a, b) => {
      const [qA, yA] = a.quarter.split(" ");
      const [qB, yB] = b.quarter.split(" ");
      const yearA = parseInt(yA);
      const yearB = parseInt(yB);
      if (yearA !== yearB) return yearB - yearA;
      const quarterA = parseInt(qA.replace("Q", ""));
      const quarterB = parseInt(qB.replace("Q", ""));
      return quarterB - quarterA;
    });
  };

  groupIssuesByTypeAndQuarter = (
    issues: ResolutionTimeIssue[],
    selectedStates: string[]
  ): Map<string, QuarterData[]> => {
    // First group by type
    const issuesByType = new Map<string, ResolutionTimeIssue[]>();

    issues.forEach((issue) => {
      const issueType = issue.type || "Unknown";
      if (!issuesByType.has(issueType)) {
        issuesByType.set(issueType, []);
      }
      issuesByType.get(issueType)!.push(issue);
    });

    // Then group each type by quarter
    const result = new Map<string, QuarterData[]>();

    issuesByType.forEach((typeIssues, issueType) => {
      const quarterlyData = this.groupIssuesByQuarter(
        typeIssues,
        selectedStates
      );
      result.set(issueType, quarterlyData);
    });

    return result;
  };

  handleViewIssues = (quarterData: QuarterData) => {
    this.setState({
      modalVisible: true,
      modalIssues: [], // Will be set in render based on quarterData
      modalQuarter: quarterData.quarter,
      modalQuarterData: quarterData,
    });
  };

  handleCloseModal = () => {
    this.setState({
      modalVisible: false,
      modalIssues: [],
      modalQuarter: "",
      modalQuarterData: null,
    });
  };

  handleSaveQuery = () => {
    const { jqlQuery, saveQueryName, savedQueries } = this.state;

    if (!saveQueryName.trim() || !jqlQuery.trim()) {
      return;
    }

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: saveQueryName.trim(),
      jqlQuery: jqlQuery,
      savedAt: new Date().toISOString(),
    };

    const updatedQueries = [...savedQueries, newQuery];
    this.setState({
      savedQueries: updatedQueries,
      saveQueryModalVisible: false,
      saveQueryName: "",
    });

    localStorage.setItem(
      "averageResolutionTimeSavedQueries",
      JSON.stringify(updatedQueries)
    );
  };

  handleLoadQuery = (savedQuery: SavedQuery) => {
    this.setState({
      jqlQuery: savedQuery.jqlQuery,
    });
    localStorage.setItem("averageResolutionTimeQuery", savedQuery.jqlQuery);
  };

  handleDeleteQuery = (queryId: string) => {
    const { savedQueries } = this.state;
    const updatedQueries = savedQueries.filter((q) => q.id !== queryId);
    this.setState({ savedQueries: updatedQueries });
    localStorage.setItem(
      "averageResolutionTimeSavedQueries",
      JSON.stringify(updatedQueries)
    );
  };

  handleOpenSaveQueryModal = () => {
    this.setState({
      saveQueryModalVisible: true,
      saveQueryName: "",
    });
  };

  handleCloseSaveQueryModal = () => {
    this.setState({
      saveQueryModalVisible: false,
      saveQueryName: "",
    });
  };

  render() {
    const {
      projectKeys,
      selectedDate,
      isLoading,
      issues,
      projects,
      isLoadingProjects,
      selectedStates,
      availableStates,
      modalVisible,
      modalQuarter,
      modalQuarterData,
    } = this.state;

    // Group issues by type, then by quarter and categorize
    const issuesByType = this.groupIssuesByTypeAndQuarter(
      issues,
      selectedStates
    );

    // Build columns for quarterly summary table
    const quarterlyColumns: ColumnsType<QuarterData> = [
      {
        title: "Quarter",
        dataIndex: "quarter",
        key: "quarter",
      },
      {
        title: "Total",
        key: "total",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          return total;
        },
        sorter: (a: QuarterData, b: QuarterData) => {
          const totalA =
            a.unresolved.length +
            a.resolvedWithin1Month.length +
            a.resolvedWithin1Quarter.length +
            a.resolvedWithin2Quarters.length +
            a.resolvedWithin1Year.length +
            a.resolvedGreaterThan1Year.length;
          const totalB =
            b.unresolved.length +
            b.resolvedWithin1Month.length +
            b.resolvedWithin1Quarter.length +
            b.resolvedWithin2Quarters.length +
            b.resolvedWithin1Year.length +
            b.resolvedGreaterThan1Year.length;
          return totalA - totalB;
        },
      },
      {
        title: "Unresolved",
        key: "unresolved",
        dataIndex: "unresolved",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.unresolved.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.unresolved.length - b.unresolved.length,
      },
      {
        title: "Resolved within 1 month",
        key: "resolvedWithin1Month",
        dataIndex: "resolvedWithin1Month",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.resolvedWithin1Month.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.resolvedWithin1Month.length - b.resolvedWithin1Month.length,
      },
      {
        title: "Resolved within 1 quarter",
        key: "resolvedWithin1Quarter",
        dataIndex: "resolvedWithin1Quarter",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.resolvedWithin1Quarter.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.resolvedWithin1Quarter.length - b.resolvedWithin1Quarter.length,
      },
      {
        title: "Resolved within 2 quarters",
        key: "resolvedWithin2Quarters",
        dataIndex: "resolvedWithin2Quarters",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.resolvedWithin2Quarters.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.resolvedWithin2Quarters.length - b.resolvedWithin2Quarters.length,
      },
      {
        title: "Resolved within 1 year",
        key: "resolvedWithin1Year",
        dataIndex: "resolvedWithin1Year",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.resolvedWithin1Year.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.resolvedWithin1Year.length - b.resolvedWithin1Year.length,
      },
      {
        title: "Resolved greater than 1 year",
        key: "resolvedGreaterThan1Year",
        dataIndex: "resolvedGreaterThan1Year",
        render: (_: any, record: QuarterData) => {
          const total =
            record.unresolved.length +
            record.resolvedWithin1Month.length +
            record.resolvedWithin1Quarter.length +
            record.resolvedWithin2Quarters.length +
            record.resolvedWithin1Year.length +
            record.resolvedGreaterThan1Year.length;
          const count = record.resolvedGreaterThan1Year.length;
          const percentage =
            total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
          return `${percentage}% (${count})`;
        },
        sorter: (a: QuarterData, b: QuarterData) =>
          a.resolvedGreaterThan1Year.length - b.resolvedGreaterThan1Year.length,
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: any, record: QuarterData) => (
          <Button type="link" onClick={() => this.handleViewIssues(record)}>
            View Details
          </Button>
        ),
      },
    ];

    // Build columns for modal table
    const modalColumns: ColumnsType<ResolutionTimeIssue> = [
      {
        title: "Key",
        dataIndex: "key",
        key: "key",
        render: (text: string, record) => (
          <a href={record.url} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ),
      },
      {
        title: "Summary",
        dataIndex: "summary",
        key: "summary",
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
      },
      {
        title: "Current Status",
        dataIndex: "status",
        key: "status",
      },
      {
        title: "Resolution Date",
        dataIndex: "resolutionDate",
        key: "resolutionDate",
        render: (date: string) => {
          if (!date) return "-";
          return dayjs(date).format("YYYY-MM-DD");
        },
      },
      {
        title: "Time in States",
        key: "timeInStates",
        render: (_: any, record: ResolutionTimeIssue) => (
          <div>
            {record.timeInStates.map((state) => (
              <div key={state.status}>
                {state.status}: {state.days.toFixed(2)} days
              </div>
            ))}
          </div>
        ),
      },
    ];

    return (
      <div style={{ padding: "16px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <h2>Average Resolution Time</h2>
            <Text
              type="secondary"
              style={{ fontSize: "14px", display: "block" }}
            >
              Find all JIRAs in selected projects created after the selected
              date. Issues are grouped by quarter and categorized by resolution
              time.
            </Text>
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Projects:
            </Text>
            <Select
              placeholder="Select one or more projects"
              value={projectKeys}
              onChange={this.handleProjectChange}
              style={{ width: 400 }}
              loading={isLoadingProjects}
              mode="multiple"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                if (option && option.children) {
                  return (
                    option.children
                      .toString()
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  );
                }
                return false;
              }}
            >
              {projects.map((project) => (
                <Select.Option key={project.key} value={project.key}>
                  {project.key} - {project.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              Created Date After:
            </Text>
            <DatePicker
              value={selectedDate}
              onChange={this.handleDateChange}
              format="YYYY-MM-DD"
              style={{ width: 200 }}
            />
          </div>

          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              JQL Query (editable):
            </Text>
            <TextArea
              value={this.state.jqlQuery}
              onChange={this.handleQueryChange}
              rows={4}
              placeholder="JQL query will be generated automatically when you select projects and date"
              style={{ fontFamily: "monospace", fontSize: "12px" }}
            />
            <Text
              type="secondary"
              style={{ fontSize: "12px", display: "block", marginTop: 4 }}
            >
              You can edit this query manually before fetching issues
            </Text>
            <Space style={{ marginTop: 8 }}>
              <Button
                onClick={this.handleOpenSaveQueryModal}
                disabled={
                  !this.state.jqlQuery ||
                  this.state.jqlQuery.trim().length === 0
                }
              >
                Save Query
              </Button>
              {this.state.savedQueries.length > 0 && (
                <Select
                  placeholder="Load saved query"
                  style={{ width: 200 }}
                  onChange={(value) => {
                    const query = this.state.savedQueries.find(
                      (q) => q.id === value
                    );
                    if (query) {
                      this.handleLoadQuery(query);
                    }
                  }}
                >
                  {this.state.savedQueries.map((query) => (
                    <Select.Option key={query.id} value={query.id}>
                      {query.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </Space>
          </div>

          <div>
            <Button
              type="primary"
              onClick={this.handleGetIssues}
              disabled={
                !this.state.jqlQuery || this.state.jqlQuery.trim().length === 0
              }
              loading={isLoading}
            >
              Get Issues
            </Button>
          </div>

          {issues.length > 0 && availableStates.length > 0 && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Select States (multiple selection):
              </Text>
              <Text
                type="secondary"
                style={{ fontSize: "12px", display: "block", marginBottom: 8 }}
              >
                Only time spent in selected states will be used to categorize
                issues by resolution time.
              </Text>
              <Select
                value={selectedStates}
                onChange={this.handleStateChange}
                mode="multiple"
                style={{ width: "100%", maxWidth: 600, marginBottom: 16 }}
                placeholder="Select states to include in resolution time calculation"
              >
                {availableStates.map((state) => (
                  <Select.Option key={state} value={state}>
                    {state}
                  </Select.Option>
                ))}
              </Select>
              {availableStates.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Excluded States:
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {availableStates
                      .filter((state) => !selectedStates.includes(state))
                      .map((state) => (
                        <Tag key={state} color="default">
                          {state}
                        </Tag>
                      ))}
                    {availableStates.filter(
                      (state) => !selectedStates.includes(state)
                    ).length === 0 && (
                      <Text type="secondary">No excluded states</Text>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {issues.length > 0 && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Found {issues.length} issue(s) grouped by type and quarter
              </Text>
              {Array.from(issuesByType.entries()).map(
                ([issueType, quarterlyData]) => (
                  <div key={issueType} style={{ marginBottom: 32 }}>
                    <Text
                      strong
                      style={{
                        fontSize: "18px",
                        display: "block",
                        marginBottom: 16,
                      }}
                    >
                      {issueType} (
                      {quarterlyData.reduce((sum, q) => {
                        return (
                          sum +
                          q.unresolved.length +
                          q.resolvedWithin1Month.length +
                          q.resolvedWithin1Quarter.length +
                          q.resolvedWithin2Quarters.length +
                          q.resolvedWithin1Year.length +
                          q.resolvedGreaterThan1Year.length
                        );
                      }, 0)}{" "}
                      issues)
                    </Text>
                    {quarterlyData.length === 0 ? (
                      <Text
                        type="warning"
                        style={{ display: "block", marginTop: 16 }}
                      >
                        No quarters found for this type. This might indicate
                        that issues are missing createdDate fields. Check the
                        browser console for details.
                      </Text>
                    ) : (
                      <Table
                        columns={quarterlyColumns}
                        dataSource={quarterlyData}
                        pagination={false}
                      />
                    )}
                  </div>
                )
              )}
            </div>
          )}

          <Modal
            title={`Issues for ${modalQuarter}`}
            open={modalVisible}
            onCancel={this.handleCloseModal}
            footer={[
              <Button key="close" onClick={this.handleCloseModal}>
                Close
              </Button>,
            ]}
            width={1400}
          >
            {modalQuarterData && (
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                {modalQuarterData.unresolved.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Unresolved ({modalQuarterData.unresolved.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.unresolved}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
                {modalQuarterData.resolvedWithin1Month.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Resolved within 1 month (
                      {modalQuarterData.resolvedWithin1Month.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.resolvedWithin1Month}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
                {modalQuarterData.resolvedWithin1Quarter.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Resolved within 1 quarter (
                      {modalQuarterData.resolvedWithin1Quarter.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.resolvedWithin1Quarter}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
                {modalQuarterData.resolvedWithin2Quarters.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Resolved within 2 quarters (
                      {modalQuarterData.resolvedWithin2Quarters.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.resolvedWithin2Quarters}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
                {modalQuarterData.resolvedWithin1Year.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Resolved within 1 year (
                      {modalQuarterData.resolvedWithin1Year.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.resolvedWithin1Year}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
                {modalQuarterData.resolvedGreaterThan1Year.length > 0 && (
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: "16px",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Resolved greater than 1 year (
                      {modalQuarterData.resolvedGreaterThan1Year.length})
                    </Text>
                    <Table
                      columns={modalColumns}
                      dataSource={modalQuarterData.resolvedGreaterThan1Year}
                      pagination={{ pageSize: 10 }}
                      size="small"
                    />
                  </div>
                )}
              </Space>
            )}
          </Modal>

          <Modal
            title="Save Query"
            open={this.state.saveQueryModalVisible}
            onOk={this.handleSaveQuery}
            onCancel={this.handleCloseSaveQueryModal}
            okText="Save"
            cancelText="Cancel"
          >
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Query Name:
              </Text>
              <Input
                value={this.state.saveQueryName}
                onChange={(e) =>
                  this.setState({ saveQueryName: e.target.value })
                }
                placeholder="Enter a name for this query"
                onPressEnter={this.handleSaveQuery}
              />
              <Text
                type="secondary"
                style={{ fontSize: "12px", display: "block", marginTop: 8 }}
              >
                This will save the current JQL query for future use.
              </Text>
            </div>
          </Modal>

          {this.state.savedQueries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Saved Queries:
              </Text>
              <Space direction="vertical" style={{ width: "100%" }}>
                {this.state.savedQueries.map((query) => (
                  <div
                    key={query.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px",
                      border: "1px solid #d9d9d9",
                      borderRadius: "4px",
                    }}
                  >
                    <div>
                      <Text strong>{query.name}</Text>
                      <Text
                        type="secondary"
                        style={{ display: "block", fontSize: "12px" }}
                      >
                        {dayjs(query.savedAt).format("YYYY-MM-DD HH:mm")}
                      </Text>
                    </div>
                    <Space>
                      <Button
                        size="small"
                        onClick={() => this.handleLoadQuery(query)}
                      >
                        Load
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => this.handleDeleteQuery(query.id)}
                      >
                        Delete
                      </Button>
                    </Space>
                  </div>
                ))}
              </Space>
            </div>
          )}
        </Space>
      </div>
    );
  }
}
