import React from "react";
import AreaChart, { AreaType, CategoryData, XAxisData } from "./AreaChart";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import {
  CumulativeFlowDiagramData,
  CumulativeFlowDiagramDateStatus,
} from "../server/graphManagers/CumulativeFlowDiagramManager";
import Select from "./Select";
import { DefaultOptionType, SelectProps } from "antd/es/select";
import { cli } from "webpack";
import { MinimumIssueInfo } from "../Types";

interface Props {}
interface State {
  input: string;
  startDate: Date;
  endDate: Date;
  allStates: SelectProps["options"];
  selectedStates: string[];
  cfdData: CumulativeFlowDiagramData | null;
}

export default class CumulativeFlowDiagram extends React.Component<
  Props,
  State
> {
  constructor(props) {
    super(props);
    this.state = {
      input: localStorage.getItem("cumulativeFlowQuery") || "",
      startDate: new Date(),
      endDate: new Date(),
      cfdData: null,
      allStates: [],
      selectedStates: [],
    };
  }

  onStartDateChange = (date, dateString) => {
    this.setState({ startDate: date.toString() });
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
        this.setState({ cfdData, selectedStates, allStates });
      });
  };

  statesSelected(value) {
    this.setState({ selectedStates: value });
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
    let columns: AreaType[] = [];
    columns.push({ type: "date", identifier: "date", label: "Date" });
    // for (let status in this.state.cfdData?.allStatuses) {
    //   if (this.state.selectedStates.includes(status)) {
    //     columns.push({
    //       type: "number",
    //       identifier: this.state.cfdData?.allStatuses[status],
    //       label: this.state.cfdData?.allStatuses[status],
    //     });
    //   }
    // }
    this.state.selectedStates.forEach((label) => {
      columns.push({
        type: "number",
        identifier: label.toString(),
        label: label.toString(),
      });
    });

    // this.state.cfdData
    //   ? this.state.cfdData.allStatuses.map((status) => {
    //       return { type: "string", identifier: status, label: status };
    //     })
    //   : [];
    let data = this.state.cfdData
      ? this.state.cfdData.timeline.map((timeline) => {
          let row: CategoryData = {};
          row["date"] = new Date(timeline.date);
          // @ts-ignore
          for (let status in this.state.selectedStates) {
            // let statusIndex = this.state.cfdData?.allStatuses[status] || 0;
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
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        <DatePicker
          onChange={this.onStartDateChange}
          value={dayjs(this.state.startDate)}
        />
        <DatePicker
          onChange={this.onEndDateChange}
          value={dayjs(this.state.endDate)}
        />
        <button onClick={this.onClick}>Click me</button>
        <Select
          onChange={this.statesSelected.bind(this)}
          options={this.state.allStates}
        />
        <AreaChart
          title="Cumulative Flow Diagram"
          data={data}
          columns={columns}
        />
      </div>
    );
  }
}
