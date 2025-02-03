import React from "react";
import { ElapsedTime } from "../server/graphManagers/TimeInDevManager";
import { List, Radio, RadioChangeEvent } from "antd";
import Select from "./Select";
const timeInDevQueryString = "timeInDevQuery";
type Props = {};
type State = {
  input: string;
  stateOptions: { value: string; label: string }[];
  statesSelected: string[];
  issues: ElapsedTime[];
  sortBy: "timespent" | "status";
};

export default class TimeInDev extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      input: localStorage.getItem(timeInDevQueryString) || "",
      stateOptions: [],
      statesSelected: [],
      issues: [],
      sortBy: "timespent",
    };
  }

  onClick = () => {
    console.log("Button clicked");
    localStorage.setItem(timeInDevQueryString, this.state.input);
    //Request to the server /api/metrics
    fetch("/api/timeInDev?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let issues: ElapsedTime[] = JSON.parse(data.data);
        let uniqueStatusesSet = new Set<string>();
        issues.forEach((issue) => {
          issue.statuses.forEach((status) => {
            uniqueStatusesSet.add(status.status);
          });
        });
        let stateOptions = Array.from(uniqueStatusesSet).map((status) => {
          return { value: status, label: status };
        });
        this.setState({
          issues,
          stateOptions,
          statesSelected: Array.from(uniqueStatusesSet),
        });
      });
  };
  stateSelectedChange = (selected: string[]) => {
    this.setState({ statesSelected: selected });
  };
  handleSortByChange = (e: RadioChangeEvent) => {
    this.setState({ sortBy: e.target.value });
  };
  timeInSelectedStatus = (issue: ElapsedTime) => {
    let time = 0;
    issue.statuses.forEach((status) => {
      if (this.state.statesSelected.includes(status.status)) {
        time += status.days;
      }
    });
    return time;
  };
  getSortedIssues = () => {
    if (this.state.sortBy === "timespent") {
      return this.state.issues.sort((a, b) => {
        return b.timespent - a.timespent;
      });
    } else {
      return this.state.issues.sort((a, b) => {
        return this.timeInSelectedStatus(b) - this.timeInSelectedStatus(a);
      });
    }
  };
  render() {
    let sortedIssues = this.getSortedIssues();
    let summaryIssues = sortedIssues.map((issue) => {
      let daysBooked = issue.timespent;
      let daysInStatuses = this.timeInSelectedStatus(issue);
      return {
        key: issue.key,
        summary: issue.summary,
        daysBooked,
        daysInStatuses,
      };
    });

    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        <button onClick={this.onClick}>Click me</button>
        <Radio.Group
          onChange={this.handleSortByChange}
          value={this.state.sortBy}
        >
          <Radio.Button value="timespent">Time Spent</Radio.Button>
          <Radio.Button value="status">Status</Radio.Button>
        </Radio.Group>
        <span
          style={{
            display: this.state.sortBy === "status" ? "block" : "none",
          }}
        >
          <Select
            options={this.state.stateOptions}
            onChange={this.stateSelectedChange}
          />
        </span>
        <TimeInDevSummary issues={summaryIssues} />
        <List
          header="Issues"
          bordered
          dataSource={sortedIssues}
          renderItem={(issue) => (
            <TimeInDevIssueDetail
              issue={issue}
              totalDays={this.timeInSelectedStatus(issue)}
            />
          )}
        />
      </div>
    );
  }
}

export const TimeInDevIssueDetail: React.FC<{
  issue: ElapsedTime;
  totalDays: number;
}> = ({ issue, totalDays }) => {
  return (
    <List.Item>
      <List.Item.Meta
        title={
          <a href={issue.url} target="_blank">
            {issue.key + " - " + issue.summary}
          </a>
        }
        description={
          "Time booked " +
          issue.timespent.toString() +
          " days \n " +
          issue.currentStatus
        }
      />
      <List
        header={"Statuses total: " + totalDays + " days"}
        bordered
        dataSource={issue.statuses}
        style={{ width: "80%" }}
        renderItem={(status) => (
          <List.Item>
            <List.Item.Meta
              title={status.status}
              description={status.days.toString() + " days"}
            />
          </List.Item>
        )}
      />
    </List.Item>
  );
};

type TimeInDevSummaryProps = {
  issues: {
    key: string;
    summary: string;
    daysBooked: number;
    daysInStatuses: number;
  }[];
};

export const TimeInDevSummary: React.FC<TimeInDevSummaryProps> = ({
  issues,
}) => {
  return (
    <div>
      {issues.map((issue) => (
        <li key={issue.key}>
          {issue.key} - {issue.summary} - {issue.daysInStatuses} days in
          progress - {issue.daysBooked} days booked
        </li>
      ))}
    </div>
  );
};
