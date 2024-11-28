import React from "react";
import {
  BurnupEpicData,
  BurnupDateData,
} from "../server/graphManagers/BurnupGraphManager";
import Select from "./Select";
import type { SelectProps, RadioChangeEvent } from "antd";
import { Radio } from "antd";
import { getSize } from "./Utils";

interface Props {}
interface State {
  input: string;
  epicSelectList: SelectProps["options"];
  selectedEpics: string[];
  selectedEpicsData: GoogleDataTableType[];
  allEpicsData: BurnupEpicData[];
  sizeMode: "count" | "estimate";
}

type GoogleDataTableType = [Date, number, number, number, number];

const google = globalThis.google;

export default class EpicBurnup extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: localStorage.getItem("epicIssueKey") || "",
      epicSelectList: [],
      selectedEpics: [],
      selectedEpicsData: [],
      allEpicsData: [],
      sizeMode: "count",
    };
  }
  onClick() {
    console.log("Button clicked");
    localStorage.setItem("epicIssueKey", this.state.input);
    //Request to the server /api/metrics
    fetch("/api/epicBurnup?query=" + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let burnupDataArrays: BurnupEpicData[] = JSON.parse(data.data);
        this.setState({ allEpicsData: burnupDataArrays });
        this.setState({
          epicSelectList: burnupDataArrays.map((item, i) => {
            return { label: item.key + " - " + item.summary, value: i };
          }),
        });
        let selectedEpicsData = this.getGoogleDataTableFromMultipleBurnupData(
          burnupDataArrays,
          false
        );
        this.setState({ selectedEpicsData });

        // this.drawChart(burnupDataArrays[0].data);
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.

  getGoogleDataTableFromMultipleBurnupData(
    allEpicsData: BurnupEpicData[],
    estimate: boolean,
    selectedEpics?: number[]
  ) {
    let filteredData = selectedEpics
      ? allEpicsData.filter((item, index) => selectedEpics.includes(index))
      : allEpicsData;
    let googleBurnupDataArray = filteredData.map((item) => {
      return this.getGoogleDataTableFromBurnupDateData(item.dateData, estimate);
    });
    let earliestDate = googleBurnupDataArray.reduce((acc, val) => {
      return acc < val[0][0] ? acc : val[0][0];
    }, new Date());
    let lastDate = googleBurnupDataArray.reduce((acc, val) => {
      return acc > val[val.length - 1][0] ? acc : val[val.length - 1][0];
    }, new Date());
    let allDates: GoogleDataTableType[] = [];
    for (
      let d = new Date(earliestDate);
      d <= lastDate;
      d.setDate(d.getDate() + 1)
    ) {
      let tomorrow = new Date(d);
      tomorrow.setDate(tomorrow.getDate() + 1);
      let dataBetweenDates = googleBurnupDataArray.map(
        (burnupDateDataArray) => {
          let data = burnupDateDataArray.find(
            (item) => item[0] >= d && item[0] < tomorrow
          );
          return data ? data : [d, 0, 0, 0, 0];
        }
      );
      let sumDone = dataBetweenDates.reduce((acc, val) => acc + val[1], 0);
      let sumScope = dataBetweenDates.reduce((acc, val) => acc + val[2], 0);
      let sumIdeal = dataBetweenDates.reduce((acc, val) => acc + val[3], 0);
      let sumForecast = dataBetweenDates.reduce((acc, val) => acc + val[4], 0);
      allDates.push([new Date(d), sumDone, sumScope, sumIdeal, sumForecast]);
    }
    return allDates;
  }

  getGoogleDataTableFromBurnupDateData(
    burnupDataArray: BurnupDateData[],
    estimate: boolean
  ) {
    let googleBurnupDataArray = burnupDataArray.map((item) => {
      return [
        new Date(item.date),
        estimate ? item.doneEstimate / 3600 / 8 : item.doneCount,
        estimate ? item.scopeEstimate / 3600 / 8 : item.scopeCount,
        item.idealTrend,
        item.forecastTrend,
      ];
    });
    return googleBurnupDataArray;
  }

  onSelectedEpicsChanged = (selected: string[]) => {
    let x = this.getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      this.state.sizeMode === "estimate",
      selected.map((item) => parseInt(item))
    );
    this.setState({
      selectedEpics: selected,
      selectedEpicsData: x,
    });
  };
  handleSizeChange = (e: RadioChangeEvent) => {
    this.setState({ sizeMode: e.target.value });
    let x = this.getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      e.target.value === "estimate",
      this.state.selectedEpics.map((item) => parseInt(item))
    );
    this.setState({
      selectedEpicsData: x,
    });
  };
  render() {
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
          value={this.state.sizeMode}
          onChange={this.handleSizeChange}
        >
          <Radio.Button value="count">Count</Radio.Button>
          <Radio.Button value="estimate">Estimate</Radio.Button>
        </Radio.Group>
        <Select
          options={this.state.epicSelectList}
          onChange={this.onSelectedEpicsChanged}
        />
        <LineChart burnupDataArray={this.state.selectedEpicsData} />
      </div>
    );
  }
}

interface ChartProps {
  burnupDataArray: GoogleDataTableType[];
  // initiativesSelected: string[];
  // sizeMode: "count" | "time booked";
}
interface ChartState {}

class LineChart extends React.Component<ChartProps, ChartState> {
  randomId: string;
  constructor(props) {
    super(props);
    this.randomId = Math.random().toString(36).substring(7);
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.burnupDataArray) {
        return;
      }
      this.drawChart();
    }
  }

  drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn("date", "Date");
    data.addColumn("number", "Done");
    data.addColumn("number", "Scope");
    data.addColumn("number", "Ideal Trend");
    data.addColumn("number", "Forecast Trend");
    data.addRows(this.props.burnupDataArray);
    console.log(this.props.burnupDataArray);

    var options = {
      title: "Issue Burnup",
      legend: { position: "bottom" },
      series: {
        0: { color: "blue" }, //done
        1: { color: "green" }, //scope
        2: { color: "red" }, //ideal
        3: { color: "orange", lineDashStyle: [4, 4] }, //forecast
      },
    };

    var chart = new google.visualization.LineChart(
      document.getElementById(this.randomId)
    );

    chart.draw(data, options);
  }

  render(): React.ReactNode {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
