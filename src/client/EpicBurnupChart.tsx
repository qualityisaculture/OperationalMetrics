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
  originalUrl: string;
  isLoading: boolean;
  statusMessage: string;
  progress?: {
    current: number;
    total: number;
    currentEpic?: string;
    currentEpicProgress?: number;
    totalEpics?: number;
    totalIssues?: number;
  };
  currentStep?: string;
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
      originalUrl: "",
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
        this.setState({
          statusMessage: response.message || "Processing...",
          progress: response.progress || {
            current: 0,
            total: 0,
            currentEpic: "",
            totalEpics: 0,
            totalIssues: 0,
          },
          currentStep: response.step,
        });
      } else if (response.status === "complete" && response.data) {
        const epicResponse: EpicBurnupResponse = JSON.parse(response.data);
        const epicSelectList = epicResponse.epicBurnups.map((item, i) => ({
          label: item.key + " - " + item.summary,
          value: i,
        }));
        const selectedEpics = epicResponse.epicBurnups.map((_, i) =>
          i.toString()
        );

        this.setState(
          {
            epicData: epicResponse.epicBurnups,
            epicSelectList,
            selectedEpics,
            startDate: dayjs(getEarliestDate(epicResponse.epicBurnups)),
            endDate: dayjs(getLastDate(epicResponse.epicBurnups)),
            originalKey: epicResponse.originalKey,
            originalSummary: epicResponse.originalSummary,
            originalType: epicResponse.originalType,
            originalUrl: epicResponse.originalUrl,
            isLoading: false,
            statusMessage: "",
            progress: undefined,
            currentStep: undefined,
          },
          () => {
            if (this.props.onDataLoaded) {
              this.props.onDataLoaded(epicResponse.epicBurnups);
            }
          }
        );

        eventSource.close();
      } else if (response.status === "error") {
        this.setState({
          isLoading: false,
          statusMessage: `Error: ${response.message}`,
          progress: undefined,
          currentStep: undefined,
        });
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      this.setState({
        isLoading: false,
        statusMessage: "Connection error. Please try again.",
        progress: undefined,
        currentStep: undefined,
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

    const formatProgress = () => {
      if (!this.state.progress) {
        return null;
      }

      const { current, total, currentEpic, totalIssues } = this.state.progress;
      const progressText: string[] = [];

      if (currentEpic) {
        progressText.push(`Current Epic: ${currentEpic}`);
      }
      if (total) {
        progressText.push(`Progress: ${current} of ${total} epics`);
      }
      if (totalIssues) {
        progressText.push(`Total Issues: ${totalIssues}`);
      }

      return progressText.map((text, index) => (
        <p key={index}>
          <strong>{text}</strong>
        </p>
      ));
    };

    return (
      <div className="epic-burnup-chart">
        <h3>
          <a
            href={this.state.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {this.state.originalKey}
          </a>{" "}
          - {this.state.originalSummary} ({this.state.originalType})
        </h3>
        {this.state.isLoading && (
          <div style={{ textAlign: "center", margin: "20px" }}>
            <Spin size="large" />
            <div style={{ marginTop: "10px" }}>
              <p>{this.state.statusMessage}</p>
              {this.state.currentStep && (
                <p>
                  <strong>Current Stage:</strong>{" "}
                  {this.state.currentStep
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              )}
              {this.state.progress && (
                <div
                  style={{
                    textAlign: "left",
                    maxWidth: "400px",
                    margin: "10px auto",
                  }}
                >
                  {formatProgress()}
                </div>
              )}
            </div>
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
            <LineChart
              burnupDataArray={gapData}
              labels={{
                doneDev: "Remaining Unfinished Dev",
                inProgressDev: "Remaining Unstarted Dev",
                scopeDev: "Total Scope Dev",
                doneTest: "Remaining Unfinished Test",
                inProgressTest: "Remaining Unstarted Test",
                scopeTest: "Total Scope Test",
                timeSpent: "Remaining Time",
                doneTrend: "Unfinished Trend",
                scopeTrend: "Scope Trend",
              }}
            />
          </>
        )}
      </div>
    );
  }
}
