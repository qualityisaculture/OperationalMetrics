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
  leadTimeData: LeadTimeSprints | null;
  allStatuses: { value: string; label: string }[];
  statusesSelected: string[];
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
      splitMode: "timebooked",
      leadTimeData: null,
      allStatuses: [],
      statusesSelected: [],
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

  onClick = () => {
    localStorage.setItem("throughputQuery", this.state.input);

    // Add current query to history
    this.addToQueryHistory(this.state.input);

    console.log("Button clicked");
    //Request to the server /api/metrics
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
        leadTimeData.sprints.forEach((sprint) => {
          sprint.issues.forEach((issue) => {
            issue.statusTimes.forEach((statusTime) => {
              allStatusesSet.add(statusTime.status);
            });
          });
        });
        let allStatuses = Array.from(allStatusesSet).map((status) => {
          return { value: status, label: status };
        });
        this.setState({
          leadTimeData,
          allStatuses,
          statusesSelected: [],
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
  getIssueInfoBySizeBucket(
    leadTimeIssueInfos: LeadTimeIssueInfo[],
    byStatus: boolean = false
  ): LeadTimeData[] {
    const maxBucketSize = 10;
    let sizeBuckets: LeadTimeData[] = [];
    let issues = leadTimeIssueInfos.filter((issueInfo) =>
      byStatus
        ? this.getTimeInSelectedStatuses(issueInfo) == 0
        : issueInfo.timespent === null
    );
    leadTimeIssueInfos = leadTimeIssueInfos.filter((issueInfo) =>
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
      let issues = leadTimeIssueInfos.filter((issueInfo) => {
        const timeSpent = byStatus
          ? this.getTimeInSelectedStatuses(issueInfo)
          : issueInfo.timespent;
        return timeSpent !== null && timeSpent <= bucketSize;
      });
      leadTimeIssueInfos = leadTimeIssueInfos.filter((issueInfo) => {
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
      issues: leadTimeIssueInfos.map((issueInfo) => {
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
      label: "Start Date",
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
    let data: CategoryData = [];
    leadTimeData.forEach((sprint) => {
      let row = {};
      row["sprintDate"] = new Date(sprint.sprintStartingDate);
      this.getIssueInfoBySizeBucket(
        sprint.issues,
        this.state.splitMode == "statuses"
      ).forEach((bucket, index) => {
        row[index] = bucket.issues.length;
      });
      let clickData = this.getClickData(sprint);
      row["clickData"] = clickData;
      data.push(row);
    });
    return { data, columns };
  }
  statusesSelected = (statusesSelected) => {
    this.setState({ statusesSelected });
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
        <ColumnChart data={data} columns={columns} title="Lead Time" />
      </div>
    );
  }
}
