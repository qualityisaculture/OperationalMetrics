import React from "react";
import AreaChart, { AreaType, CategoryData } from "./AreaChart";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import {
  CumulativeFlowDiagramData,
  CumulativeFlowDiagramDateStatus,
} from "../server/graphManagers/CumulativeFlowDiagramManager";
import Select from "./Select";
import { SelectProps } from "antd/es/select";
import { MinimumIssueInfo } from "../Types";

interface Props {
  data: CumulativeFlowDiagramData | null;
  loading?: boolean;
  error?: string | null;
  onDateChange?: (startDate: Date, endDate: Date) => void;
  onTypeFilterChange?: (selectedTypes: string[]) => void;
  onStatusFilterChange?: (selectedStates: string[]) => void;
  showDateSelectors?: boolean;
  showFilters?: boolean;
  showNotes?: boolean;
  title?: string;
  targetElementId?: string;
}

interface State {
  allStates: SelectProps["options"];
  selectedStates: string[];
  allTypes: SelectProps["options"];
  selectedTypes: string[];
  chartStartDate: Date;
  chartEndDate: Date;
  allData: CumulativeFlowDiagramData | null;
}

export default class CumulativeFlowDiagramChart extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);

    this.state = {
      allStates: [],
      selectedStates: [],
      allTypes: [],
      selectedTypes: [],
      chartStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      chartEndDate: new Date(),
      allData: null,
    };
  }

  componentDidMount() {
    if (this.props.data) {
      this.processData(this.props.data);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.data !== prevProps.data && this.props.data) {
      this.processData(this.props.data);
    }
  }

  componentDidMount() {
    if (this.props.data) {
      this.processData(this.props.data);
    }
  }

  processData = (data: CumulativeFlowDiagramData) => {
    // Extract unique types and statuses from all data for filter options
    let allTypesSet = new Set<string>();
    data.timeline.forEach((day) => {
      day.statuses.forEach((status) => {
        status.issues.forEach((issue) => {
          if (issue.type) {
            allTypesSet.add(issue.type);
          }
        });
      });
    });

    let allStates = data.allStatuses.map((status) => {
      return { label: status, value: status };
    });

    // Filter out "NOT_CREATED_YET" and "Closed" by default
    let selectedStates = data.allStatuses.filter(
      (status) => status !== "NOT_CREATED_YET" && status !== "Closed"
    );

    let allTypes = Array.from(allTypesSet).map((type) => {
      return { label: type, value: type };
    });
    let selectedTypes = Array.from(allTypesSet);

    this.setState(
      {
        allData: data,
        selectedStates,
        allStates,
        allTypes,
        selectedTypes,
      },
      () => {
        this.applyChartFiltering();
        // Auto-populate details with the final date's data
        this.populateDetailsWithFinalDate();
      }
    );
  };

  // Chart date filtering handlers
  onChartStartDateChange = (date, dateString) => {
    this.setState({ chartStartDate: new Date(date) }, () => {
      this.applyChartFiltering();
      if (this.props.onDateChange) {
        this.props.onDateChange(
          this.state.chartStartDate,
          this.state.chartEndDate
        );
      }
    });
  };

  onChartEndDateChange = (date, dateString) => {
    this.setState({ chartEndDate: new Date(date) }, () => {
      this.applyChartFiltering();
      if (this.props.onDateChange) {
        this.props.onDateChange(
          this.state.chartStartDate,
          this.state.chartEndDate
        );
      }
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
    this.setState(
      {
        allData: filteredData,
      },
      () => {
        this.populateDetailsWithFinalDate();
      }
    );
  };

  statesSelected = (value) => {
    this.setState({ selectedStates: value }, () => {
      this.populateDetailsWithFinalDate();
    });
    if (this.props.onStatusFilterChange) {
      this.props.onStatusFilterChange(value);
    }
  };

  typesSelected = (value) => {
    this.setState({ selectedTypes: value }, () => {
      this.populateDetailsWithFinalDate();
    });
    if (this.props.onTypeFilterChange) {
      this.props.onTypeFilterChange(value);
    }
  };

  getClickData(
    timeline: CumulativeFlowDiagramDateStatus,
    activeStatuses: string[],
    selectedTypes: string[]
  ) {
    let clickData = "";

    // Filter the timeline data based on selected types and statuses
    const filteredStatuses = timeline.statuses
      .filter((status) => activeStatuses.includes(status.status))
      .map((status) => ({
        ...status,
        issues: status.issues.filter((issue) =>
          selectedTypes.includes(issue.type)
        ),
      }));

    let totalIssues = filteredStatuses.reduce((acc, status) => {
      return acc + status.issues.length;
    }, 0);

    clickData += "Date: " + timeline.date + "<br>";
    clickData += "Total issues (filtered): " + totalIssues + "<br>";

    filteredStatuses.forEach((status) => {
      if (status.issues.length > 0) {
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
      }
    });
    return clickData;
  }

  populateDetailsWithFinalDate = () => {
    if (!this.state.allData || !this.state.allData.timeline.length) {
      return;
    }

    // Get the final date from the filtered data
    const filteredData = this.getFilteredData();
    if (!filteredData || !filteredData.length) {
      return;
    }

    const finalDateData = filteredData[filteredData.length - 1];
    const clickData = this.getClickData(
      finalDateData,
      this.state.selectedStates,
      this.state.selectedTypes
    );

    // Populate the details section
    const notesElement = document.getElementById(
      this.props.targetElementId || "cfd-notes"
    );
    if (notesElement) {
      const contentElement = notesElement.querySelector(
        `#${this.props.targetElementId || "cfd-notes"}-content`
      );
      if (contentElement) {
        contentElement.innerHTML = clickData;
      } else {
        notesElement.innerHTML = clickData;
      }
    }
  };

  getFilteredData = () => {
    if (!this.state.allData) return null;

    // Filter the data based on selected types
    return this.state.allData.timeline.map((timeline) => {
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
    });
  };

  render() {
    const {
      data,
      loading = false,
      error = null,
      showDateSelectors = true,
      showFilters = true,
      showNotes = true,
      title = "Cumulative Flow Diagram",
      targetElementId = "cfd-notes",
    } = this.props;

    if (loading) {
      return <div>Loading chart...</div>;
    }

    if (error) {
      return <div>Error: {error}</div>;
    }

    if (!data) {
      return <div>No data available</div>;
    }

    // Filter the data based on selected types
    let filteredData = this.state.allData
      ? this.state.allData.timeline.map((timeline) => {
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

    let chartData = filteredData
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
            this.state.selectedStates,
            this.state.selectedTypes
          );
          return row;
        })
      : [];

    return (
      <div>
        {showDateSelectors && this.state.allData && (
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
              <button
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
              </button>
            </div>
          </div>
        )}

        {showFilters && this.state.allData && (
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
                selected={this.state.selectedStates}
              />
            </div>
          </>
        )}

        <AreaChart
          title={title}
          data={chartData}
          columns={columns}
          targetElementId={targetElementId}
        />

        {showNotes && (
          <div
            id={targetElementId}
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
            <div id={`${targetElementId}-content`}>
              {/* Click data will be populated here */}
            </div>
          </div>
        )}
      </div>
    );
  }
}
