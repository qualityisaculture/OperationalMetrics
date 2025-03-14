import React from "react";
import type { SelectProps, RadioChangeEvent } from "antd";
import { DatePicker, Radio } from "antd";
import dayjs, { Dayjs } from "dayjs";

import Select from "./Select";

import { EpicBurnup } from "../server/graphManagers/BurnupGraphManager";
import LineChart from "./LineChart";
import type { GoogleDataTableType } from "./LineChart";
import {
  getEarliestDate,
  getLastDate,
  getSelectedEpics,
  getGoogleDataTableFromMultipleBurnupData,
  getGapDataFromBurnupData,
} from "./BurnupManager";

interface Props {}
interface State {
  input: string;
  epicSelectList: SelectProps["options"];
  selectedEpics: string[];
  selectedEpicsData: GoogleDataTableType[];
  allEpicsData: EpicBurnup[];
  estimationMode: "count" | "estimate";
  startDate: Dayjs;
  endDate: Dayjs;
}

export default class EpicBurnupClass extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onDataRequested = this.onDataRequested.bind(this);
    this.state = {
      input: localStorage.getItem("epicIssueKey") || "",
      epicSelectList: [],
      selectedEpics: [],
      selectedEpicsData: [],
      allEpicsData: [],
      estimationMode: "count",
      startDate: dayjs(),
      endDate: dayjs(),
    };
  }
  getSelectedEpics = (
    allEpicsData: EpicBurnup[] = this.state.allEpicsData,
    selectedEpics: string[] = this.state.selectedEpics
  ) => {
    let selectedEpicsIndex: number[] = selectedEpics.map((item) =>
      parseInt(item)
    );
    return getSelectedEpics(allEpicsData, selectedEpicsIndex);
  };
  onDataRequested = () => {
    localStorage.setItem("epicIssueKey", this.state.input);
    //Request to the server /api/metrics
    fetch("/api/epicBurnup?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let allEpicsData: EpicBurnup[] = JSON.parse(data.data);
        let epicSelectList = allEpicsData.map((item, i) => {
          return { label: item.key + " - " + item.summary, value: i };
        });
        this.setState({
          allEpicsData,
          epicSelectList,
          startDate: dayjs(getEarliestDate(allEpicsData)),
          endDate: dayjs(getLastDate(allEpicsData)),
        });
      });
  };
  onSelectedEpicsChanged = (selected: string[]) => {
    let filteredEpics = this.getSelectedEpics(
      this.state.allEpicsData,
      selected
    );
    this.setState({
      selectedEpics: selected,
      startDate: dayjs(getEarliestDate(filteredEpics)),
      endDate: dayjs(getLastDate(filteredEpics)),
    });
  };
  onEstimationModeChange = (e: RadioChangeEvent) => {
    this.setState({ estimationMode: e.target.value });
  };
  render() {
    let data = getGoogleDataTableFromMultipleBurnupData(
      this.getSelectedEpics(),
      this.state.estimationMode === "estimate",
      this.state.startDate.toDate(),
      this.state.endDate.toDate()
    );
    let gapData = getGapDataFromBurnupData(data);

    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        <button onClick={this.onDataRequested}>Click me</button>
        <Radio.Group
          value={this.state.estimationMode}
          onChange={this.onEstimationModeChange}
        >
          <Radio.Button value="count">Count</Radio.Button>
          <Radio.Button value="estimate">Estimate</Radio.Button>
        </Radio.Group>
        <br />
        <Select
          options={this.state.epicSelectList}
          onChange={this.onSelectedEpicsChanged}
        />
        <br />
        <DatePicker
          onChange={(date, dateString) => {
            this.setState({ endDate: date });
          }}
          value={this.state.endDate}
        />
        <LineChart burnupDataArray={data} />
        <LineChart burnupDataArray={gapData} />
      </div>
    );
  }
}
