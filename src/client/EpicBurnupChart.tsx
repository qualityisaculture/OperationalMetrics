import React from "react";
import type { SelectProps } from "antd";
import { DatePicker, Spin } from "antd";
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
import { SSEResponse } from "../Types";

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
  isLoading: boolean;
  statusMessage: string;
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
      isLoading: false,
      statusMessage: "",
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
    this.setState({ isLoading: true, statusMessage: "Loading..." });

    const eventSource = new EventSource(
      `/api/epicBurnup?query=${this.props.query}`
    );

    eventSource.onmessage = (event) => {
      const response: SSEResponse = JSON.parse(event.data);

      if (response.status === "processing") {
        this.setState({ statusMessage: response.message || "Processing..." });
      } else if (response.status === "complete" && response.data) {
        const epicResponse: EpicBurnupResponse = JSON.parse(response.data);
        const epicSelectList = epicResponse.epicBurnups.map((item, i) => ({
          label: item.key + " - " + item.summary,
          value: i,
        }));
        const selectedEpics = epicResponse.epicBurnups.map((_, i) =>
          i.toString()
        );
        this.setState({
          epicData: epicResponse.epicBurnups,
          epicSelectList,
          selectedEpics,
          startDate: dayjs(getEarliestDate(epicResponse.epicBurnups)),
          endDate: dayjs(getLastDate(epicResponse.epicBurnups)),
          originalKey: epicResponse.originalKey,
          originalSummary: epicResponse.originalSummary,
          originalType: epicResponse.originalType,
          isLoading: false,
          statusMessage: "",
        });
        if (this.props.onDataLoaded) {
          this.props.onDataLoaded(epicResponse.epicBurnups);
        }
        eventSource.close();
      } else if (response.status === "error") {
        this.setState({
          isLoading: false,
          statusMessage: `Error: ${response.message}`,
        });
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      this.setState({
        isLoading: false,
        statusMessage: "Connection error. Please try again.",
      });
      eventSource.close();
    };
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
        {this.state.isLoading && (
          <div style={{ textAlign: "center", margin: "20px" }}>
            <Spin size="large" />
            <p>{this.state.statusMessage}</p>
          </div>
        )}
        {!this.state.isLoading && this.state.statusMessage && (
          <div style={{ textAlign: "center", margin: "20px", color: "red" }}>
            <p>{this.state.statusMessage}</p>
          </div>
        )}
        {!this.state.isLoading && !this.state.statusMessage && (
          <>
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
          </>
        )}
      </div>
    );
  }
}
