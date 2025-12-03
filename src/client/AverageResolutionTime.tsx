import React from "react";
import { Select, DatePicker, Button, Table, Space, Typography, Input } from "antd";
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
  resolutionDate: string;
  url: string;
  timeInStates: { status: string; days: number }[];
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
    
    this.state = {
      projectKeys: initialProjects,
      selectedDate: initialDate,
      isLoading: false,
      issues: [],
      projects: [],
      isLoadingProjects: false,
      selectedStates: [],
      availableStates: [],
      jqlQuery: savedQuery || "",
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
    const generatedQuery = `(${projectQuery}) AND resolved >= "${dateStr}" AND (status = "Resolved" OR status = "Closed") ORDER BY resolved DESC`;
    
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

    fetch(
      `/api/averageResolutionTime?jql=${encodeURIComponent(jqlQuery)}`
    )
      .then((response) => response.json())
      .then((data) => {
        const issues: ResolutionTimeIssue[] = JSON.parse(data.data);
        
        // Extract all unique states from all issues
        const allStates = new Set<string>();
        issues.forEach((issue) => {
          issue.timeInStates.forEach((state) => {
            allStates.add(state.status);
          });
        });
        const sortedStates = Array.from(allStates).sort();

        this.setState({
          issues: issues,
          isLoading: false,
          availableStates: sortedStates,
          selectedStates: sortedStates, // Select all states by default
        });
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
    } = this.state;

    // Prepare table data with sum of time in all selected states
    const tableData = issues.map((issue) => {
      // Sum up time in all selected states
      let totalTimeInSelectedStates = 0;
      selectedStates.forEach((state) => {
        const timeInState = issue.timeInStates.find(
          (stateData) => stateData.status === state
        );
        if (timeInState) {
          totalTimeInSelectedStates += timeInState.days;
        }
      });

      return {
        key: issue.key,
        jiraKey: issue.key,
        summary: issue.summary,
        type: issue.type,
        status: issue.status,
        resolutionDate: issue.resolutionDate,
        url: issue.url,
        totalTimeInSelectedStates: totalTimeInSelectedStates.toFixed(2),
      };
    });

    // Build columns dynamically based on selected states
    const columns: ColumnsType<typeof tableData[0]> = [
      {
        title: "Key",
        dataIndex: "jiraKey",
        key: "jiraKey",
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
        title: "Status",
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
        title: `Total Time in Selected States (days)`,
        dataIndex: "totalTimeInSelectedStates",
        key: "totalTimeInSelectedStates",
        sorter: (a: any, b: any) =>
          parseFloat(a.totalTimeInSelectedStates || "0") -
          parseFloat(b.totalTimeInSelectedStates || "0"),
        render: (value: string) => parseFloat(value || "0").toFixed(2),
      },
    ];

    return (
      <div style={{ padding: "16px" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <h2>Average Resolution Time</h2>
            <Text type="secondary" style={{ fontSize: "14px", display: "block" }}>
              Find all JIRAs in selected projects that have a resolution time
              after the selected date, with status Resolved or Closed. View the
              time spent in each state.
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
              Resolution Date After:
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
            <Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: 4 }}>
              You can edit this query manually before fetching issues
            </Text>
          </div>

          <div>
            <Button
              type="primary"
              onClick={this.handleGetIssues}
              disabled={!this.state.jqlQuery || this.state.jqlQuery.trim().length === 0}
              loading={isLoading}
            >
              Get Issues
            </Button>
          </div>

          {issues.length > 0 && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Select States (multiple selection):
              </Text>
              <Select
                value={selectedStates}
                onChange={this.handleStateChange}
                mode="multiple"
                style={{ width: "100%", maxWidth: 600, marginBottom: 16 }}
                placeholder="Select states to display"
              >
                {availableStates.map((state) => (
                  <Select.Option key={state} value={state}>
                    {state}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )}

          {issues.length > 0 && (
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Found {issues.length} issue(s)
              </Text>
              <Table
                columns={columns}
                dataSource={tableData}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} issues`,
                }}
              />
            </div>
          )}
        </Space>
      </div>
    );
  }
}

