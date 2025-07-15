import React from "react";
import { DatePicker, Select as AntSelect, Input, Button } from "antd";
import dayjs from "dayjs";
import Select from "./Select";
import { DefaultOptionType, SelectProps } from "antd/es/select";
import LineChart, { GoogleDataTableType } from "./LineChart";
import { CreatedResolvedData } from "../server/graphManagers/CreatedResolvedGraphManager";

type Project = {
  id: string;
  key: string;
  name: string;
};

interface Props {}
interface State {
  input: string;
  startDate: Date;
  endDate: Date;
  allTypes: SelectProps["options"];
  selectedTypes: string[];
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjects: string[];
  createdResolvedData: CreatedResolvedData | null;
}

export default class CreatedResolved extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    const savedProjects = localStorage.getItem(
      "createdResolvedSelectedProjects"
    );
    let initialProjects: string[] = [];

    if (savedProjects) {
      try {
        initialProjects = JSON.parse(savedProjects);
      } catch (error) {
        console.error("Error parsing saved projects:", error);
      }
    }

    this.state = {
      input: localStorage.getItem("createdResolvedQuery") || "",
      startDate: new Date(),
      endDate: new Date(),
      createdResolvedData: null,
      allTypes: [],
      selectedTypes: [],
      projects: [],
      isLoadingProjects: false,
      selectedProjects: initialProjects,
    };
  }

  componentDidMount() {
    this.loadProjects();
  }

  loadProjects = () => {
    this.setState({ isLoadingProjects: true });

    console.log("Loading projects from API for Created/Resolved...");

    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => {
        console.log("Projects API Response for Created/Resolved:", data);
        const projects: Project[] = JSON.parse(data.data);
        console.log("Parsed Projects for Created/Resolved:", projects);

        this.setState({
          projects: projects,
          isLoadingProjects: false,
        });
      })
      .catch((error) => {
        console.error("Projects API Error for Created/Resolved:", error);
        this.setState({
          isLoadingProjects: false,
          projects: [], // Fallback to empty array on error
        });
      });
  };

  handleProjectChange = (values: string[]) => {
    this.setState({ selectedProjects: values });
    localStorage.setItem(
      "createdResolvedSelectedProjects",
      JSON.stringify(values)
    );

    // Auto-update the query when projects are selected
    if (values.length > 0) {
      this.generateAndSetQuery(values);
    }
  };

  generateAndSetQuery = (projectKeys: string[]) => {
    // Build project conditions
    let projectQuery;
    if (projectKeys.length === 1) {
      projectQuery = `project = "${projectKeys[0]}"`;
    } else {
      const projectConditions = projectKeys
        .map((project) => `project = "${project}"`)
        .join(" OR ");
      projectQuery = `(${projectConditions})`;
    }

    // Build query with just project filters - backend will handle date filtering and ordering
    const fullQuery = projectQuery;

    this.setState({ input: fullQuery });
    localStorage.setItem("createdResolvedQuery", fullQuery);
  };

  // Update query when dates change
  onStartDateChange = (date, dateString) => {
    this.setState({ startDate: new Date(date) }, () => {
      // Regenerate query if projects are selected
      if (this.state.selectedProjects.length > 0) {
        this.generateAndSetQuery(this.state.selectedProjects);
      }
    });
  };

  onEndDateChange = (date, dateString) => {
    this.setState({ endDate: new Date(date) }, () => {
      // Regenerate query if projects are selected
      if (this.state.selectedProjects.length > 0) {
        this.generateAndSetQuery(this.state.selectedProjects);
      }
    });
  };

  onClick = () => {
    localStorage.setItem("createdResolvedQuery", this.state.input);

    const url =
      "/api/createdResolved?query=" +
      encodeURIComponent(this.state.input) +
      "&startDate=" +
      encodeURIComponent(this.state.startDate.toString()) +
      "&endDate=" +
      encodeURIComponent(this.state.endDate.toString());

    // Request to the server /api/createdResolved
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        let createdResolvedData: CreatedResolvedData = JSON.parse(data.data);

        // Extract unique types from all issues
        let allTypesSet = new Set<string>();
        if (createdResolvedData.dailyData) {
          createdResolvedData.dailyData.forEach((day) => {
            if (day.createdIssues) {
              day.createdIssues.forEach((issue) => {
                if (issue.type) {
                  allTypesSet.add(issue.type);
                }
              });
            }
            if (day.resolvedIssues) {
              day.resolvedIssues.forEach((issue) => {
                if (issue.type) {
                  allTypesSet.add(issue.type);
                }
              });
            }
          });
        }

        let allTypes = Array.from(allTypesSet).map((type) => {
          return { label: type, value: type };
        });
        let selectedTypes = Array.from(allTypesSet); // Default to all types selected

        this.setState({
          createdResolvedData,
          allTypes,
          selectedTypes,
        });
      })
      .catch((error) => {
        console.error("Created/Resolved API Error:", error);
      });
  };

  typesSelected(value) {
    this.setState({ selectedTypes: value });
  }

  // Process data for LineChart component
  processDataForChart(): GoogleDataTableType[] {
    if (
      !this.state.createdResolvedData ||
      !this.state.createdResolvedData.dailyData
    ) {
      return [];
    }

    // Filter data based on selected types
    const filteredData = this.state.createdResolvedData.dailyData.map(
      (day) => ({
        ...day,
        createdIssues: day.createdIssues.filter((issue) =>
          this.state.selectedTypes.includes(issue.type)
        ),
        resolvedIssues: day.resolvedIssues.filter((issue) =>
          this.state.selectedTypes.includes(issue.type)
        ),
      })
    );

    // Calculate cumulative totals
    let cumulativeCreated = 0;
    let cumulativeResolved = 0;

    return filteredData.map((day) => {
      cumulativeCreated += day.createdIssues.length;
      cumulativeResolved += day.resolvedIssues.length;

      return {
        data: [
          new Date(day.date), // Date
          cumulativeCreated, // doneDev (Created cumulative)
          null, // inProgressDev
          cumulativeResolved, // scopeDev (Resolved cumulative)
          null, // annotation
          null, // annotationHover
          null, // doneTest
          null, // inProgressTest
          null, // scopeTest
          null, // timeSpent
          null, // timeSpentDev
          null, // timeSpentTest
        ],
        clickData: this.getClickData(day),
      };
    });
  }

  getClickData(day) {
    let clickData = "";
    clickData += "Date: " + day.date + "<br>";
    clickData += "Created: " + day.createdIssues.length + "<br>";
    clickData += "Resolved: " + day.resolvedIssues.length + "<br><br>";

    if (day.createdIssues.length > 0) {
      clickData += "<strong>Created Issues:</strong><br>";
      day.createdIssues.forEach((issue) => {
        clickData += `<a href="${issue.url}">${issue.key} ${issue.summary}</a> (${issue.type})<br>`;
      });
      clickData += "<br>";
    }

    if (day.resolvedIssues.length > 0) {
      clickData += "<strong>Resolved Issues:</strong><br>";
      day.resolvedIssues.forEach((issue) => {
        clickData += `<a href="${issue.url}">${issue.key} ${issue.summary}</a> (${issue.type})<br>`;
      });
    }

    return clickData;
  }

  render() {
    const { projects, isLoadingProjects, selectedProjects } = this.state;
    const chartData = this.processDataForChart();

    return (
      <div>
        <h2>Created / Resolved</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>Projects:</label>
          <AntSelect
            placeholder="Select one or more projects"
            value={selectedProjects}
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
              <AntSelect.Option key={project.key} value={project.key}>
                {project.key} - {project.name}
              </AntSelect.Option>
            ))}
          </AntSelect>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Selected projects ({selectedProjects.length}):{" "}
            {selectedProjects.length > 0 ? selectedProjects.join(", ") : "None"}
          </label>
        </div>

        <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8 }}>
              Start Date:
            </label>
            <DatePicker
              onChange={this.onStartDateChange}
              value={dayjs(this.state.startDate)}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 8 }}>
              End Date:
            </label>
            <DatePicker
              onChange={this.onEndDateChange}
              value={dayjs(this.state.endDate)}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 8 }}>
            Custom Query (includes tickets created or resolved in date range):
          </label>
          <Input.TextArea
            value={this.state.input}
            onChange={(e) => {
              this.setState({ input: e.target.value });
            }}
            style={{ width: "100%" }}
            placeholder="Select projects and dates to auto-generate query, or enter custom JQL"
            rows={3}
          />
          <small style={{ color: "#666", display: "block", marginTop: 4 }}>
            Auto-generated query includes: all tickets created or resolved
            within the selected date range
          </small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={this.onClick} size="large">
            Generate Chart
          </Button>
        </div>

        {this.state.createdResolvedData && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Type Filter:
              </label>
              <Select
                onChange={this.typesSelected.bind(this)}
                options={this.state.allTypes}
                selected={this.state.selectedTypes}
              />
            </div>

            {this.state.createdResolvedData.summary && (
              <div
                style={{
                  marginBottom: 16,
                  padding: 16,
                  background: "#f5f5f5",
                  borderRadius: 4,
                }}
              >
                <h4>Summary</h4>
                <p>
                  Total Created:{" "}
                  {this.state.createdResolvedData.summary.totalCreated}
                </p>
                <p>
                  Total Resolved:{" "}
                  {this.state.createdResolvedData.summary.totalResolved}
                </p>
                <p>
                  Date Range:{" "}
                  {this.state.createdResolvedData.summary.dateRange.start} to{" "}
                  {this.state.createdResolvedData.summary.dateRange.end}
                </p>
              </div>
            )}

            {chartData.length > 0 && (
              <LineChart
                burnupDataArray={chartData}
                labels={{
                  doneDev: "Created (Cumulative)",
                  scopeDev: "Resolved (Cumulative)",
                }}
              />
            )}
          </>
        )}
      </div>
    );
  }
}
