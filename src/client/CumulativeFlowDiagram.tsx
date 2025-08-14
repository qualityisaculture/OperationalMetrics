import React from "react";
import AreaChart, { AreaType, CategoryData, XAxisData } from "./AreaChart";
import { DatePicker, Select as AntSelect, Input, Button } from "antd";
import dayjs from "dayjs";
import {
  CumulativeFlowDiagramData,
  CumulativeFlowDiagramDateStatus,
} from "../server/graphManagers/CumulativeFlowDiagramManager";
import Select from "./Select";
import { DefaultOptionType, SelectProps } from "antd/es/select";
import { cli } from "webpack";
import { MinimumIssueInfo } from "../Types";

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
  allStates: SelectProps["options"];
  selectedStates: string[];
  allTypes: SelectProps["options"];
  selectedTypes: string[];
  cfdData: CumulativeFlowDiagramData | null;
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjects: string[];
}

export default class CumulativeFlowDiagram extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);
    const savedProjects = localStorage.getItem("cfdSelectedProjects");
    let initialProjects: string[] = [];

    if (savedProjects) {
      try {
        initialProjects = JSON.parse(savedProjects);
      } catch (error) {
        console.error("Error parsing saved projects:", error);
      }
    }

    this.state = {
      input: localStorage.getItem("cumulativeFlowQuery") || "",
      startDate: new Date(),
      endDate: new Date(),
      cfdData: null,
      allStates: [],
      selectedStates: [],
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

    console.log("Loading projects from API for CFD...");

    fetch("/api/projects")
      .then((response) => response.json())
      .then((data) => {
        console.log("Projects API Response for CFD:", data);
        const projects: Project[] = JSON.parse(data.data);
        console.log("Parsed Projects for CFD:", projects);

        this.setState({
          projects: projects,
          isLoadingProjects: false,
        });
      })
      .catch((error) => {
        console.error("Projects API Error for CFD:", error);
        this.setState({
          isLoadingProjects: false,
          projects: [], // Fallback to empty array on error
        });
      });
  };

  handleProjectChange = (values: string[]) => {
    this.setState({ selectedProjects: values });
    localStorage.setItem("cfdSelectedProjects", JSON.stringify(values));

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

    // Format start date for JQL (YYYY-MM-DD format)
    const startDateStr = this.state.startDate.toISOString().split("T")[0];

    // Build comprehensive query:
    // - All open tickets (not resolved/closed)
    // - All resolved tickets that were resolved after the start date
    const timeBasedQuery = `(
      statusCategory != Done 
      OR 
      (statusCategory = Done AND resolved >= "${startDateStr}")
    )`;

    const fullQuery = `${projectQuery} AND ${timeBasedQuery} ORDER BY updated DESC`;

    this.setState({ input: fullQuery });
    localStorage.setItem("cumulativeFlowQuery", fullQuery);
  };

  // Update query when start date changes too
  onStartDateChange = (date, dateString) => {
    this.setState({ startDate: new Date(date) }, () => {
      // Regenerate query if projects are selected
      if (this.state.selectedProjects.length > 0) {
        this.generateAndSetQuery(this.state.selectedProjects);
      }
    });
  };

  onEndDateChange = (date, dateString) => {
    this.setState({ endDate: date.toString() });
  };

  onClick = () => {
    localStorage.setItem("cumulativeFlowQuery", this.state.input);
    console.log("Button clicked");
    //Request to the server /api/metrics
    fetch(
      "/api/cumulativeFlowDiagram?query=" +
        this.state.input +
        "&startDate=" +
        this.state.startDate +
        "&endDate=" +
        this.state.endDate
    )
      .then((response) => response.json())
      .then((data) => {
        let cfdData: CumulativeFlowDiagramData = JSON.parse(data.data);
        console.log(cfdData);
        let allStates = cfdData.allStatuses.map((status) => {
          return { label: status, value: status };
        });
        let selectedStates = cfdData.allStatuses;

        // Extract unique types from all issues in the timeline
        let allTypesSet = new Set<string>();
        cfdData.timeline.forEach((day) => {
          day.statuses.forEach((status) => {
            status.issues.forEach((issue) => {
              if (issue.type) {
                allTypesSet.add(issue.type);
              }
            });
          });
        });
        let allTypes = Array.from(allTypesSet).map((type) => {
          return { label: type, value: type };
        });
        let selectedTypes = Array.from(allTypesSet); // Default to all types selected

        this.setState({
          cfdData,
          selectedStates,
          allStates,
          allTypes,
          selectedTypes,
        });
      });
  };

  statesSelected(value) {
    this.setState({ selectedStates: value });
  }

  typesSelected(value) {
    this.setState({ selectedTypes: value });
  }

  getClickData(
    timeline: CumulativeFlowDiagramDateStatus,
    activeStatuses: string[]
  ) {
    let clickData = "";
    let totalIssues = timeline.statuses.reduce((acc, status) => {
      if (activeStatuses.includes(status.status)) {
        return acc + status.issues.length;
      }
      return acc;
    }, 0);
    clickData += "Date: " + timeline.date + "<br>";
    clickData += "Total issues: " + totalIssues + "<br>";
    timeline.statuses.forEach((status) => {
      clickData += status.status + ": " + status.issues.length + "<br>";
      status.issues.forEach((issue: MinimumIssueInfo) => {
        clickData +=
          "<a href='" +
          issue.url +
          "'>" +
          issue.key +
          " " +
          issue.summary +
          "</a><br>";
      });
    });
    return clickData;
  }

  render() {
    const { projects, isLoadingProjects, selectedProjects } = this.state;

    // Filter the data based on selected types
    let filteredData = this.state.cfdData
      ? this.state.cfdData.timeline.map((timeline) => {
          let filteredStatuses = timeline.statuses.map((status) => ({
            ...status,
            issues: status.issues.filter((issue) =>
              this.state.selectedTypes.includes(issue.type)
            ),
          }));
          return {
            ...timeline,
            statuses: filteredStatuses,
          };
        })
      : null;

    let columns: AreaType[] = [];
    columns.push({ type: "date", identifier: "date", label: "Date" });
    this.state.selectedStates.forEach((label) => {
      columns.push({
        type: "number",
        identifier: label.toString(),
        label: label.toString(),
      });
    });

    let data = filteredData
      ? filteredData.map((timeline) => {
          let row: CategoryData = {};
          row["date"] = new Date(timeline.date);
          for (let status in this.state.selectedStates) {
            let statusIndex = this.state.selectedStates[status];
            let issuesLength =
              timeline.statuses.find((status) => status.status === statusIndex)
                ?.issues.length || 0;
            row[statusIndex] = issuesLength;
          }
          row.clickData = this.getClickData(
            timeline,
            this.state.selectedStates
          );
          return row;
        })
      : [];

    console.log(columns, data);
    return (
      <div>
        <h2>Cumulative Flow Diagram</h2>

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
            Custom Query (includes open tickets + resolved tickets after start
            date):
          </label>
          <Input.TextArea
            value={this.state.input}
            onChange={(e) => {
              this.setState({ input: e.target.value });
            }}
            style={{ width: "100%" }}
            placeholder="Select projects and start date to auto-generate query, or enter custom JQL"
            rows={3}
          />
          <small style={{ color: "#666", display: "block", marginTop: 4 }}>
            Auto-generated query includes: all open tickets + all tickets
            resolved after the start date
          </small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={this.onClick} size="large">
            Generate Diagram
          </Button>
        </div>

        {this.state.cfdData && (
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

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 8 }}>
                Status Filter:
              </label>
              <Select
                onChange={this.statesSelected.bind(this)}
                options={this.state.allStates}
              />
            </div>
          </>
        )}

        <AreaChart
          title="Cumulative Flow Diagram"
          data={data}
          columns={columns}
          targetElementId="cfd-notes"
        />

        {/* Notes div for displaying click data */}
        <div
          id="cfd-notes"
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #d9d9d9",
            borderRadius: "6px",
            backgroundColor: "#fafafa",
            minHeight: "100px",
          }}
        >
          <h4>Chart Details</h4>
          <div id="cfd-notes-content">
            {/* Click data will be populated here */}
          </div>
        </div>
      </div>
    );
  }
}
