import React from "react";
import {
  EpicBurnup,
  DoneAndScopeCount,
  DoneAndScopeCountWithForecast,
} from "../server/graphManagers/BurnupGraphManager";
import Select from "./Select";
import type { SelectProps, RadioChangeEvent } from "antd";
import { DatePicker, Radio } from "antd";
import { getSize } from "./Utils";
import { TDateISODate } from "../Types";
import dayjs, { Dayjs } from "dayjs";
import LineChart from "./LineChart";
import type { GoogleDataTableType } from "./LineChart";
import { getGoogleDataTableFromMultipleBurnupData } from "./BurnupManager";

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

export function getSelectedEpics(
  allEpicsData: EpicBurnup[],
  selectedEpics: number[]
) {
  return selectedEpics
    ? allEpicsData.filter((item, index) => selectedEpics.includes(index))
    : allEpicsData;
}

export function getEarliestDate(allEpicsData: EpicBurnup[]) {
  return allEpicsData.reduce((acc, val) => {
    return acc < val.startDate ? acc : val.startDate;
  }, new Date());
}

export function getLastDate(allEpicsData: EpicBurnup[]) {
  let lastDateInJiras = allEpicsData.reduce((acc, val) => {
    return acc > val.endDate ? acc : val.endDate;
  }, new Date());
  let today = new Date();
  return lastDateInJiras > today ? lastDateInJiras : today;
}

export default class EpicBurnupClass extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onRequestData = this.onRequestData.bind(this);
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
  onRequestData = () => {
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
    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            this.setState({ input: e.target.value });
          }}
        />
        <button onClick={this.onRequestData}>Click me</button>
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
        {/* <DatePicker
        DON'T TURN THIS ON, BECAUSE MOVING THE FIRST DATE MAKES THE BURNUP REQUIRED INCORRECT
          onChange={(date, dateString) => {
            this.setState({ startDate: date });
          }}
          value={this.state.startDate}
        /> */}
        <DatePicker
          onChange={(date, dateString) => {
            this.setState({ endDate: date });
          }}
          value={this.state.endDate}
        />
        <LineChart burnupDataArray={data} />
      </div>
    );
  }
}
