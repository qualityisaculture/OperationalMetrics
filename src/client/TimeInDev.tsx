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
        time += status.time;
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
    let filteredIssues = this.getSortedIssues();
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
        <List
          header="Issues"
          bordered
          dataSource={filteredIssues}
          renderItem={(issue) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <a href={issue.url} target="_blank">
                    {issue.key}
                  </a>
                }
                description={
                  "Time booked " +
                  issue.timespent.toString() +
                  " days" +
                  " \n " +
                  issue.currentStatus
                }
              />
              <List
                header={
                  "Statuses total: " +
                  this.timeInSelectedStatus(issue) +
                  " days"
                }
                bordered
                dataSource={issue.statuses}
                style={{ width: "80%" }}
                renderItem={(status) => (
                  <List.Item>
                    <List.Item.Meta
                      title={status.status}
                      description={status.time.toString() + " days"}
                    />
                  </List.Item>
                )}
              />
            </List.Item>
          )}
        />
        {/* <ul>
          {this.state.issues.map((issue) => {
            return (
              <li key={issue.key}>
                {issue.key} - {issue.timespent}
                <ul>
                  {issue.statuses.map((status) => {
                    return (
                      <li key={status.status}>
                        {status.status} - {status.time}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul> */}
      </div>
    );
  }
}
