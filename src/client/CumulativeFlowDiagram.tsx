import React from "react";
import AreaChart, { AreaType, CategoryData, XAxisData } from "./AreaChart";
import { DatePicker, Input, Button } from "antd";
import dayjs from "dayjs";
import {
  CumulativeFlowDiagramData,
  CumulativeFlowDiagramDateStatus,
} from "../server/graphManagers/CumulativeFlowDiagramManager";
import Select from "./Select";
import { SelectProps } from "antd/es/select";
import { MinimumIssueInfo } from "../Types";

interface Props {}
interface State {
  input: string;
  allStates: SelectProps["options"];
  selectedStates: string[];
  allTypes: SelectProps["options"];
  selectedTypes: string[];
  cfdData: CumulativeFlowDiagramData | null;
  // New state for chart date filtering
  chartStartDate: Date;
  chartEndDate: Date;
  allData: CumulativeFlowDiagramData | null; // Store complete data from server
}

export default class CumulativeFlowDiagram extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);

    this.state = {
      input: localStorage.getItem("cumulativeFlowQuery") || "",
      cfdData: null,
      allStates: [],
      selectedStates: [],
      allTypes: [],
      selectedTypes: [],
      // Initialize chart date range to last 1 year
      chartStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      chartEndDate: new Date(),
      allData: null,
    };
  }

  // Chart date filtering handlers
  onChartStartDateChange = (date, dateString) => {
    this.setState({ chartStartDate: new Date(date) }, () => {
      this.applyChartFiltering();
    });
  };

  onChartEndDateChange = (date, dateString) => {
    this.setState({ chartEndDate: new Date(date) }, () => {
      this.applyChartFiltering();
    });
  };

  // Apply chart filtering based on selected date range
  applyChartFiltering = () => {
    if (!this.state.allData) return;

    const { allData, chartStartDate, chartEndDate } = this.state;

    // Filter timeline data based on chart date range
    const filteredTimeline = allData.timeline.filter((day) => {
      const dayDate = new Date(day.date);
      return dayDate >= chartStartDate && dayDate <= chartEndDate;
    });

    // Create filtered data
    const filteredData: CumulativeFlowDiagramData = {
      allStatuses: allData.allStatuses,
      timeline: filteredTimeline,
    };

    // Only update the chart data, preserve existing filters
    this.setState({
      cfdData: filteredData,
    });
  };

  onClick = () => {
    localStorage.setItem("cumulativeFlowQuery", this.state.input);
    console.log("Button clicked");
    fetch("/api/cumulativeFlowDiagram?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let allData: CumulativeFlowDiagramData = JSON.parse(data.data);
        console.log("All data received:", allData);

        // Extract unique types and statuses from all data for filter options
        let allTypesSet = new Set<string>();
        allData.timeline.forEach((day) => {
          day.statuses.forEach((status) => {
            status.issues.forEach((issue) => {
              if (issue.type) {
                allTypesSet.add(issue.type);
              }
            });
          });
        });

        let allStates = allData.allStatuses.map((status) => {
          return { label: status, value: status };
        });
        // Filter out "NOT_CREATED_YET" and "Closed" by default
        let selectedStates = allData.allStatuses.filter(
          (status) => status !== "NOT_CREATED_YET" && status !== "Closed"
        );
        let allTypes = Array.from(allTypesSet).map((type) => {
          return { label: type, value: type };
        });
        let selectedTypes = Array.from(allTypesSet);

        // Store all data and set up filters, then apply initial chart filtering
        this.setState(
          {
            allData,
            selectedStates,
            allStates,
            allTypes,
            selectedTypes,
          },
          () => {
            this.applyChartFiltering();
          }
        );
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
          <label style={{ display: "block", marginBottom: 8 }}>
            JQL Query:
          </label>
          <Input.TextArea
            value={this.state.input}
            onChange={(e) => {
              this.setState({ input: e.target.value });
            }}
            style={{ width: "100%" }}
            placeholder="Enter your JQL query to fetch issues"
            rows={3}
          />
          <small style={{ color: "#666", display: "block", marginTop: 4 }}>
            Enter a JQL query to fetch issues. Use the chart date picker below
            to filter the display range.
          </small>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={this.onClick} size="large">
            Generate Diagram
          </Button>
        </div>

        {this.state.cfdData && (
          <>
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                gap: 16,
                alignItems: "end",
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: 8 }}>
                  Chart Start Date:
                </label>
                <DatePicker
                  onChange={this.onChartStartDateChange}
                  value={dayjs(this.state.chartStartDate)}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 8 }}>
                  Chart End Date:
                </label>
                <DatePicker
                  onChange={this.onChartEndDateChange}
                  value={dayjs(this.state.chartEndDate)}
                />
              </div>
              <div>
                <Button
                  onClick={() => {
                    // Reset to show all data
                    if (this.state.allData) {
                      const earliestDate = new Date(
                        Math.min(
                          ...this.state.allData.timeline.map((day) =>
                            new Date(day.date).getTime()
                          )
                        )
                      );
                      const latestDate = new Date(
                        Math.max(
                          ...this.state.allData.timeline.map((day) =>
                            new Date(day.date).getTime()
                          )
                        )
                      );
                      this.setState(
                        {
                          chartStartDate: earliestDate,
                          chartEndDate: latestDate,
                        },
                        () => {
                          this.applyChartFiltering();
                        }
                      );
                    }
                  }}
                >
                  Show All Data
                </Button>
              </div>
            </div>

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
                selected={this.state.selectedStates}
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
