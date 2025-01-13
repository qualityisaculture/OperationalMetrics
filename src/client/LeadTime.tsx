import {
  DatePicker,
  DatePickerProps,
  InputNumber,
  Radio,
  RadioChangeEvent,
} from "antd";
import React from "react";
import dayjs from "dayjs";
import {
  LeadTimeData,
  LeadTimeSprintData,
} from "../server/graphManagers/LeadTimeGraphManager";
import Column from "antd/es/table/Column";
import ColumnChart, { CategoryData, ColumnType } from "./ColumnChart";

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  splitMode: "initiatives" | "labels";
  leadTimeData: LeadTimeData | null;
}

export default class LeadTime extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      input: "",
      currentSprintStartDate: dayjs().toString(),
      numberOfSprints: 5,
      splitMode: "initiatives",
      leadTimeData: null,
    };
  }
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
        let leadTimeData: LeadTimeData = JSON.parse(data.data);
        console.log(leadTimeData);
        this.setState({ leadTimeData });
      });
  };
  getLeadTimeData(leadTimeData: LeadTimeSprintData[]): {
    data: CategoryData;
    columns: ColumnType[];
  } {
    let columns: ColumnType[] = [];
    columns.push({
      type: "number",
      identifier: 0,
      label: "Null",
    });
    for (var i = 1; i < 9; i++) {
      columns.push({
        type: "number",
        identifier: i,
        label: `Sprint ${i}`,
      });
    }
    columns.push({
      type: "number",
      identifier: 9,
      label: "10+",
    });
    let data: CategoryData = [];
    leadTimeData.forEach((sprint) => {
      let row = {};
      sprint.sizeBuckets.forEach((bucket, index) => {
        row[index] = bucket.issues.length;
      });
      data.push(row);
    });
    return { data, columns };
  }
  render() {
    let sprintData = this.state.leadTimeData
      ? this.state.leadTimeData.sprints
      : [];
    let { data, columns } = this.getLeadTimeData(sprintData);
    debugger;
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
          onChange={this.onSprintStartDateChange}
          value={dayjs(this.state.currentSprintStartDate)}
        />
        Number of Sprints to show:
        <InputNumber
          value={this.state.numberOfSprints}
          onChange={this.onNumberOfSprintsChange}
        />
        <Radio.Group
          value={this.state.splitMode}
          onChange={this.handleSplitModeChange}
        >
          <Radio.Button value="initiatives">Initiatives</Radio.Button>
          <Radio.Button value="labels">Labels</Radio.Button>
        </Radio.Group>
        <button onClick={this.onClick}>Click me</button>
        <ColumnChart data={data} columns={columns} title="Lead Time" />
      </div>
    );
  }
}
