import {
  DatePicker,
  DatePickerProps,
  InputNumber,
  Radio,
  RadioChangeEvent,
  AutoComplete,
  Button,
} from "antd";
import Select from "./Select";
import React from "react";
import dayjs from "dayjs";
import {
  LeadTimeSprints,
  LeadTimeSprintData,
  LeadTimeData,
  MinimumLeadTimeIssueInfo,
} from "../server/graphManagers/LeadTimeGraphManager";
import Column from "antd/es/table/Column";
import ColumnChart, { CategoryData, ColumnType } from "./ColumnChart";
import { LeadTimeIssueInfo } from "../server/graphManagers/GraphManagerTypes";
import { MinimumIssueInfo } from "../Types";

interface Props {}
interface State {
  input: string;
  queryHistory: string[];
  currentSprintStartDate: string;
  numberOfSprints: number;
  splitMode: "timebooked" | "statuses";
  viewMode: "sprint" | "combined";
  leadTimeData: LeadTimeSprints | null;
  allStatuses: { value: string; label: string }[];
  statusesSelected: string[];
  allTicketTypes: { value: string; label: string }[];
  ticketTypesSelected: string[];
}

export default class LeadTime extends React.Component<Props, State> {
  constructor(props) {
    super(props);

    // Load saved query history from localStorage
    const savedQueryHistory = localStorage.getItem("leadTimeQueryHistory");
    const queryHistory = savedQueryHistory ? JSON.parse(savedQueryHistory) : [];

    this.state = {
      input: localStorage.getItem("throughputQuery") || "",
      queryHistory: queryHistory,
      currentSprintStartDate: dayjs().toString(),
      numberOfSprints: 5,
      splitMode: "statuses",
      viewMode: "combined",
      leadTimeData: null,
      allStatuses: [],
      statusesSelected: [],
      allTicketTypes: [],
      ticketTypesSelected: [],
    };
  }

  // Add a query to history, keeping only the latest 5 unique entries
  addToQueryHistory = (query: string) => {
    if (!query.trim()) return;

    // Create a new array with the current query at the beginning
    let newHistory = [query];

    // Add previous unique queries, up to a total of 5
    this.state.queryHistory.forEach((historyItem) => {
      if (historyItem !== query && newHistory.length < 5) {
        newHistory.push(historyItem);
      }
    });

    // Update state and localStorage
    this.setState({ queryHistory: newHistory });
    localStorage.setItem("leadTimeQueryHistory", JSON.stringify(newHistory));
  };

  onSprintStartDateChange: DatePickerProps["onChange"] = (date, dateString) => {
    this.setState({ currentSprintStartDate: date.toString() });
  };
  onNumberOfSprintsChange = (value) => {
    this.setState({ numberOfSprints: value });
  };
  handleSplitModeChange = (e: RadioChangeEvent) => {
    this.setState({ splitMode: e.target.value });
  };

  handleViewModeChange = (e: RadioChangeEvent) => {
    this.setState({ viewMode: e.target.value });
  };

  filterIssuesByTicketType = (
    issues: LeadTimeIssueInfo[]
  ): LeadTimeIssueInfo[] => {
    if (this.state.ticketTypesSelected.length === 0) {
      return issues; // If no types selected, show all
    }
    return issues.filter(
      (issue) =>
        issue.type && this.state.ticketTypesSelected.includes(issue.type)
    );
  };

  onClick = () => {
    localStorage.setItem("throughputQuery", this.state.input);

    // Add current query to history
    this.addToQueryHistory(this.state.input);

    console.log("Button clicked");
    fetch(
      "/api/leadTime?query=" +
        this.state.input +
        "&currentSprintStartDate=" +
        this.state.currentSprintStartDate +
        "&numberOfSprints=" +
        this.state.numberOfSprints
    )
      .then((response) => response.json())
      .then((data) => {
        let leadTimeData: LeadTimeSprints = JSON.parse(data.data);
        let allStatusesSet = new Set<string>();
        let allTicketTypesSet = new Set<string>();
        leadTimeData.sprints.forEach((sprint) => {
          sprint.issues.forEach((issue) => {
            issue.statusTimes.forEach((statusTime) => {
              allStatusesSet.add(statusTime.status);
            });
            if (issue.type) {
              allTicketTypesSet.add(issue.type);
            }
          });
        });
        let allStatuses = Array.from(allStatusesSet).map((status) => {
          return { value: status, label: status };
        });
        let allTicketTypes = Array.from(allTicketTypesSet).map((type) => {
          return { value: type, label: type };
        });
        this.setState({
          leadTimeData,
          allStatuses,
          statusesSelected: [],
          allTicketTypes,
          ticketTypesSelected: allTicketTypes.map((type) => type.value), // Default to all selected
        });
      });
  };

  handleQueryChange = (value: string) => {
    this.setState({ input: value });
  };

  getClickData = (leadTimeData: LeadTimeSprintData) => {
    let logHTML = "";
    this.getIssueInfoBySizeBucket(
      leadTimeData.issues,
      this.state.splitMode == "statuses"
    ).forEach((bucket, index) => {
      logHTML += `<h3>${index} days</h3>`;
      bucket.issues.forEach((issue) => {
        logHTML += `<a href="${issue.url}" target="_blank">${issue.key} ${issue.summary}</a><br>`;
        logHTML += `Time spent: ${issue.timeSpentInDays} days<br>`;
        issue.statusTimes.forEach((status) => {
          if (this.state.statusesSelected.includes(status.status)) {
            logHTML += `${status.status} ${status.days} days<br>`;
          }
        });
      });
    });
    return logHTML;
  };
  getTimeInSelectedStatuses = (issue: LeadTimeIssueInfo): number => {
    let timeInSelectedStatuses = 0;
    issue.statusTimes.forEach((statusTime) => {
      if (this.state.statusesSelected.includes(statusTime.status)) {
        timeInSelectedStatuses += statusTime.days;
      }
    });
    return timeInSelectedStatuses;
  };

  calculateAverageLeadTime = (issues: LeadTimeIssueInfo[]): number => {
    const filteredIssues = this.filterIssuesByTicketType(issues);
    const validIssues = filteredIssues.filter((issue) => {
      if (this.state.splitMode === "statuses") {
        return this.getTimeInSelectedStatuses(issue) > 0;
      } else {
        return issue.timespent !== null && issue.timespent > 0;
      }
    });

    if (validIssues.length === 0) return 0;

    const totalTime = validIssues.reduce((sum, issue) => {
      if (this.state.splitMode === "statuses") {
        return sum + this.getTimeInSelectedStatuses(issue);
      } else {
        return sum + (issue.timespent || 0);
      }
    }, 0);

    return totalTime / validIssues.length;
  };

  getValidIssuesCount = (issues: LeadTimeIssueInfo[]): number => {
    const filteredIssues = this.filterIssuesByTicketType(issues);
    return filteredIssues.filter((issue) => {
      if (this.state.splitMode === "statuses") {
        return this.getTimeInSelectedStatuses(issue) > 0;
      } else {
        return issue.timespent !== null && issue.timespent > 0;
      }
    }).length;
  };

  getDateRange = (
    issues: LeadTimeIssueInfo[]
  ): { startDate: string | null; endDate: string | null } => {
    const filteredIssues = this.filterIssuesByTicketType(issues);
    const validIssues = filteredIssues.filter((issue) => {
      if (this.state.splitMode === "statuses") {
        return this.getTimeInSelectedStatuses(issue) > 0;
      } else {
        return issue.timespent !== null && issue.timespent > 0;
      }
    });

    if (validIssues.length === 0) {
      return { startDate: null, endDate: null };
    }

    const resolvedDates = validIssues
      .map((issue) => issue.resolved)
      .filter((date) => date) // Filter out null/undefined dates
      .map((date) => new Date(date));

    if (resolvedDates.length === 0) {
      return { startDate: null, endDate: null };
    }

    const startDate = new Date(
      Math.min(...resolvedDates.map((d) => d.getTime()))
    );
    const endDate = new Date(
      Math.max(...resolvedDates.map((d) => d.getTime()))
    );

    return {
      startDate: startDate.toISOString().split("T")[0], // YYYY-MM-DD format
      endDate: endDate.toISOString().split("T")[0],
    };
  };
  getIssueInfoBySizeBucket(
    leadTimeIssueInfos: LeadTimeIssueInfo[],
    byStatus: boolean = false
  ): LeadTimeData[] {
    const filteredIssues = this.filterIssuesByTicketType(leadTimeIssueInfos);
    const maxBucketSize = 10;
    let sizeBuckets: LeadTimeData[] = [];
    let issues = filteredIssues.filter((issueInfo) =>
      byStatus
        ? this.getTimeInSelectedStatuses(issueInfo) == 0
        : issueInfo.timespent === null
    );
    let remainingIssues = filteredIssues.filter((issueInfo) =>
      byStatus
        ? this.getTimeInSelectedStatuses(issueInfo) !== 0
        : issueInfo.timespent !== null
    );
    sizeBuckets.push({
      timeSpentInDays: 0,
      label: "null",
      issues: issues.map((issueInfo) => {
        let data: MinimumLeadTimeIssueInfo = {
          key: issueInfo.key,
          summary: issueInfo.summary,
          url: issueInfo.url,
          status: issueInfo.status,
          type: issueInfo.type,
          originalEstimate: issueInfo.timeoriginalestimate,
          timeSpent: issueInfo.timespent,
          statusTimes: issueInfo.statusTimes,
          timeSpentInDays: issueInfo.timespent || 0,
        };
        return data;
      }),
    });
    for (let bucketSize = 1; bucketSize < maxBucketSize; bucketSize++) {
      let issues = remainingIssues.filter((issueInfo) => {
        const timeSpent = byStatus
          ? this.getTimeInSelectedStatuses(issueInfo)
          : issueInfo.timespent;
        return timeSpent !== null && timeSpent <= bucketSize;
      });
      remainingIssues = remainingIssues.filter((issueInfo) => {
        const timeSpent = byStatus
          ? this.getTimeInSelectedStatuses(issueInfo)
          : issueInfo.timespent;
        return timeSpent !== null && timeSpent > bucketSize;
      });
      sizeBuckets.push({
        timeSpentInDays: bucketSize,
        label: `${bucketSize} day${bucketSize > 1 ? "s" : ""}`,
        issues: issues.map((issueInfo) => {
          return {
            key: issueInfo.key,
            summary: issueInfo.summary,
            url: issueInfo.url,
            status: issueInfo.status,
            statusTimes: issueInfo.statusTimes,
            timeSpentInDays: issueInfo.timespent || 0,
            type: issueInfo.type,
            originalEstimate: issueInfo.timeoriginalestimate,
            timeSpent: issueInfo.timespent,
          };
        }),
      });
    }
    sizeBuckets.push({
      timeSpentInDays: maxBucketSize,
      label: `${maxBucketSize}+ days`,
      issues: remainingIssues.map((issueInfo) => {
        return {
          key: issueInfo.key,
          summary: issueInfo.summary,
          url: issueInfo.url,
          status: issueInfo.status,
          statusTimes: issueInfo.statusTimes,
          timeSpentInDays: issueInfo.timespent || 0,
          type: issueInfo.type,
          originalEstimate: issueInfo.timeoriginalestimate,
          timeSpent: issueInfo.timespent,
        };
      }),
    });
    return sizeBuckets;
  }
  getLeadTimeData(leadTimeData: LeadTimeSprintData[]): {
    data: CategoryData;
    columns: ColumnType[];
  } {
    let columns: ColumnType[] = [];
    columns.push({
      type: "date",
      identifier: "sprintDate",
      label: this.state.viewMode === "sprint" ? "Start Date" : "All Data",
    });
    columns.push({
      type: "number",
      identifier: 0,
      label: "Null",
    });
    for (var i = 1; i < 10; i++) {
      columns.push({
        type: "number",
        identifier: i,
        label: `${i} days`,
      });
    }
    columns.push({
      type: "number",
      identifier: 10,
      label: "10+ days",
    });
    columns.push({
      type: "number",
      identifier: "average",
      label: "Average (days)",
    });
    let data: CategoryData = [];

    if (this.state.viewMode === "sprint") {
      // Original sprint-based view
      leadTimeData.forEach((sprint) => {
        let row = {};
        row["sprintDate"] = new Date(sprint.sprintStartingDate);
        this.getIssueInfoBySizeBucket(
          sprint.issues,
          this.state.splitMode == "statuses"
        ).forEach((bucket, index) => {
          row[index] = bucket.issues.length;
        });

        // Calculate average for this sprint
        const averageTime = this.calculateAverageLeadTime(sprint.issues);
        row["average"] = averageTime;

        // Add ticket count and date range
        row["ticketCount"] = this.getValidIssuesCount(sprint.issues);
        const dateRange = this.getDateRange(sprint.issues);
        row["startDate"] = dateRange.startDate;
        row["endDate"] = dateRange.endDate;

        let clickData = this.getClickData(sprint);
        row["clickData"] = clickData;
        data.push(row);
      });
    } else {
      // Combined view - merge all issues from all sprints
      let allIssues: LeadTimeIssueInfo[] = [];
      leadTimeData.forEach((sprint) => {
        allIssues = allIssues.concat(sprint.issues);
      });

      let row = {};
      row["sprintDate"] = new Date(); // Use current date for combined view
      this.getIssueInfoBySizeBucket(
        allIssues,
        this.state.splitMode == "statuses"
      ).forEach((bucket, index) => {
        row[index] = bucket.issues.length;
      });

      // Calculate average for all issues
      const averageTime = this.calculateAverageLeadTime(allIssues);
      row["average"] = averageTime;

      // Add ticket count and date range
      row["ticketCount"] = this.getValidIssuesCount(allIssues);
      const dateRange = this.getDateRange(allIssues);
      row["startDate"] = dateRange.startDate;
      row["endDate"] = dateRange.endDate;

      // Create combined click data
      let combinedClickData = "";
      this.getIssueInfoBySizeBucket(
        allIssues,
        this.state.splitMode == "statuses"
      ).forEach((bucket, index) => {
        combinedClickData += `<h3>${index} days</h3>`;
        bucket.issues.forEach((issue) => {
          combinedClickData += `<a href="${issue.url}" target="_blank">${issue.key} ${issue.summary}</a><br>`;
          combinedClickData += `Time spent: ${issue.timeSpentInDays} days<br>`;
          issue.statusTimes.forEach((status) => {
            if (this.state.statusesSelected.includes(status.status)) {
              combinedClickData += `${status.status} ${status.days} days<br>`;
            }
          });
        });
      });
      row["clickData"] = combinedClickData;
      data.push(row);
    }

    return { data, columns };
  }
  statusesSelected = (statusesSelected) => {
    this.setState({ statusesSelected });
  };

  ticketTypesSelected = (ticketTypesSelected) => {
    this.setState({ ticketTypesSelected });
  };
  render() {
    let sprintData = this.state.leadTimeData
      ? this.state.leadTimeData.sprints
      : [];
    let { data, columns } = this.getLeadTimeData(sprintData);

    // Create options for the AutoComplete
    const options = this.state.queryHistory.map((query) => ({
      value: query,
      label: query,
    }));

    return (
      <div>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <AutoComplete
            style={{ flex: 1 }}
            value={this.state.input}
            options={options}
            onChange={this.handleQueryChange}
            placeholder="Enter query"
          />
          <DatePicker
            onChange={this.onSprintStartDateChange}
            value={dayjs(this.state.currentSprintStartDate)}
          />
          <span style={{ whiteSpace: "nowrap" }}>
            Sprints:
            <InputNumber
              value={this.state.numberOfSprints}
              onChange={this.onNumberOfSprintsChange}
              style={{ marginLeft: "0.5rem" }}
            />
          </span>
          <Button type="primary" onClick={this.onClick}>
            Run Query
          </Button>
        </div>
        <Radio.Group
          value={this.state.splitMode}
          onChange={this.handleSplitModeChange}
          style={{ marginBottom: "1rem" }}
        >
          <Radio.Button value="timebooked">TimeBooked</Radio.Button>
          <Radio.Button value="statuses">Statuses</Radio.Button>
        </Radio.Group>
        <br />
        <Radio.Group
          value={this.state.viewMode}
          onChange={this.handleViewModeChange}
          style={{ marginBottom: "1rem" }}
        >
          <Radio.Button value="sprint">Split by Sprint</Radio.Button>
          <Radio.Button value="combined">All Data Together</Radio.Button>
        </Radio.Group>
        <br />
        <span
          style={{
            display: this.state.splitMode === "statuses" ? "" : "none",
          }}
        >
          <Select
            onChange={this.statusesSelected}
            options={this.state.allStatuses}
          />
        </span>
        <br />
        {this.state.leadTimeData && this.state.allTicketTypes.length > 0 && (
          <span>
            <label style={{ marginRight: "0.5rem", fontWeight: "bold" }}>
              Ticket Types:
            </label>
            <Select
              onChange={this.ticketTypesSelected}
              options={this.state.allTicketTypes}
            />
          </span>
        )}
        <br />
        {this.state.leadTimeData && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "1rem",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0" }}>Summary</h3>
            {this.state.viewMode === "sprint" ? (
              <div>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Average Lead Time by Sprint:</strong>
                </p>
                {data.map((row, index) => (
                  <div
                    key={index}
                    style={{
                      margin: "0.5rem 0",
                      padding: "0.5rem",
                      backgroundColor: "white",
                      borderRadius: "4px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0.25rem 0",
                        fontSize: "0.9rem",
                        fontWeight: "bold",
                      }}
                    >
                      {row.sprintDate instanceof Date
                        ? row.sprintDate.toLocaleDateString()
                        : "All Data"}
                      :
                    </p>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
                      <strong>Average:</strong>{" "}
                      {row.average ? row.average.toFixed(2) : "0.00"} days
                    </p>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
                      <strong>Tickets:</strong> {row.ticketCount || 0}
                    </p>
                    {row.startDate && row.endDate && (
                      <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
                        <strong>Resolved:</strong> {row.startDate} to{" "}
                        {row.endDate}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Overall Average Lead Time:</strong>{" "}
                  <strong style={{ fontSize: "1.2rem", color: "#1890ff" }}>
                    {data.length > 0 && data[0].average
                      ? data[0].average.toFixed(2)
                      : "0.00"}{" "}
                    days
                  </strong>
                </p>
                <p style={{ margin: "0.25rem 0" }}>
                  <strong>Total Tickets:</strong>{" "}
                  {data.length > 0 ? data[0].ticketCount || 0 : 0}
                </p>
                {data.length > 0 && data[0].startDate && data[0].endDate && (
                  <p style={{ margin: "0.25rem 0" }}>
                    <strong>Resolved Date Range:</strong> {data[0].startDate} to{" "}
                    {data[0].endDate}
                  </p>
                )}
              </div>
            )}
            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "0.8rem",
                color: "#666",
              }}
            >
              * Average excludes tickets with no time data
            </p>
          </div>
        )}
        <ColumnChart
          data={data}
          columns={columns}
          title={`Lead Time - ${this.state.viewMode === "sprint" ? "By Sprint" : "All Data Combined"}`}
        />
      </div>
    );
  }
}
