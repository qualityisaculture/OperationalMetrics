import React from "react";
import type { SelectProps } from "antd";
import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";

import {
  EpicBurnup,
  EpicBurnupResponse,
} from "../server/graphManagers/BurnupGraphManager";
import LineChart from "./LineChart";
import type { GoogleDataTableType } from "./LineChart";
import Select from "./Select";
import {
  getEarliestDate,
  getLastDate,
  getGoogleDataTableFromMultipleBurnupData,
  getGapDataFromBurnupData,
  getSelectedEpics,
} from "./BurnupManager";

interface Props {
  query: string;
  estimationMode: "count" | "estimate";
  onDataLoaded?: (epicData: EpicBurnup[]) => void;
}

interface State {
  epicData: EpicBurnup[];
  epicSelectList: SelectProps["options"];
  selectedEpics: string[];
  startDate: Dayjs;
  endDate: Dayjs;
  originalKey: string;
  originalSummary: string;
  originalType: string;
}

export default class EpicBurnupChart extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      epicData: [],
      epicSelectList: [],
      selectedEpics: [],
      startDate: dayjs(),
      endDate: dayjs(),
      originalKey: "",
      originalSummary: "",
      originalType: "",
    };
  }

  componentDidMount() {
    this.fetchData();
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.query !== this.props.query) {
      this.fetchData();
    }
  }

  fetchData = () => {
    fetch("/api/epicBurnup?query=" + this.props.query)
      .then((response) => response.json())
      .then((data) => {
        const response: EpicBurnupResponse = JSON.parse(data.data);
        const epicSelectList = response.epicBurnups.map((item, i) => ({
          label: item.key + " - " + item.summary,
          value: i,
        }));
        const selectedEpics = response.epicBurnups.map((_, i) => i.toString());
        this.setState({
          epicData: response.epicBurnups,
          epicSelectList,
          selectedEpics,
          startDate: dayjs(getEarliestDate(response.epicBurnups)),
          endDate: dayjs(getLastDate(response.epicBurnups)),
          originalKey: response.originalKey,
          originalSummary: response.originalSummary,
          originalType: response.originalType,
        });
        if (this.props.onDataLoaded) {
          this.props.onDataLoaded(response.epicBurnups);
        }
      });
  };

  getSelectedEpics = () => {
    const selectedEpicsIndex: number[] = this.state.selectedEpics.map((item) =>
      parseInt(item)
    );
    return getSelectedEpics(this.state.epicData, selectedEpicsIndex);
  };

  onSelectedEpicsChanged = (selected: string[]) => {
    const filteredEpics = this.getSelectedEpics();
    this.setState({
      selectedEpics: selected,
      startDate: dayjs(getEarliestDate(filteredEpics)),
      endDate: dayjs(getLastDate(filteredEpics)),
    });
  };

  render() {
    const data = getGoogleDataTableFromMultipleBurnupData(
      this.getSelectedEpics(),
      this.props.estimationMode === "estimate",
      this.state.startDate.toDate(),
      this.state.endDate.toDate()
    );
    const gapData = getGapDataFromBurnupData(data);

    return (
      <div className="epic-burnup-chart">
        <h3>
          {this.state.originalKey} - {this.state.originalSummary} (
          {this.state.originalType})
        </h3>
        <Select
          options={this.state.epicSelectList}
          onChange={this.onSelectedEpicsChanged}
        />
        <DatePicker
          onChange={(date) => {
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
