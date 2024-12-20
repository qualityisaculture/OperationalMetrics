import React from "react";
import {
  EpicBurnup,
  DoneAndScopeCount,
  DoneAndScopeCountWithForecast,
} from "../server/graphManagers/BurnupGraphManager";
import Select from "./Select";
import type { SelectProps, RadioChangeEvent } from "antd";
import { Radio } from "antd";
import { getSize } from "./Utils";
import { TDateISODate } from "../Types";

interface Props {}
interface State {
  input: string;
  epicSelectList: SelectProps["options"];
  selectedEpics: string[];
  selectedEpicsData: GoogleDataTableType[];
  allEpicsData: EpicBurnup[];
  sizeMode: "count" | "estimate";
}

type GoogleDataTableType = [Date, number, number, number, number];

const google = globalThis.google;

export function getDataBetweenDates(
  burnupDateDataArray: (number | Date)[][],
  today: Date,
  tomorrow: Date
): (number | Date)[] {
  let dataOnDate = burnupDateDataArray.find(
    (item) => item[0] >= today && item[0] < tomorrow
  );
  if (dataOnDate) {
    return dataOnDate;
  }
  let lastData = burnupDateDataArray[burnupDateDataArray.length - 1];
  if (today > lastData[0]) {
    return [today, lastData[1], lastData[2], lastData[3], lastData[4]];
  }
  return [today, 0, 0, 0, 0];
}

export function getSelectedEpics(
  allEpicsData: EpicBurnup[],
  selectedEpics?: number[]
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
  return allEpicsData.reduce((acc, val) => {
    return acc > val.endDate ? acc : val.endDate;
  }, new Date());
}

export function extendEpicBurnup(
  epicBurnups: EpicBurnup,
  earliestDate: Date,
  lastDate: Date
): DoneAndScopeCountWithForecast[] {
  if (earliestDate > epicBurnups.startDate) {
    throw new Error("Earliest date is after start date");
  }
  if (lastDate < epicBurnups.endDate) {
    throw new Error("Last date is before end date");
  }
  let extendedBurnupDataArray: DoneAndScopeCountWithForecast[] = [];
  let currentDate = new Date(earliestDate);
  let doneCountForecast = 0;
  let doneEstimateForecast = 0;
  let doneCountRequired = 0;
  let doneEstimateRequired = 0;
  while (currentDate <= lastDate) {
    let burnupData: DoneAndScopeCount | undefined = epicBurnups.dateData.find(
      (item) => item.date === currentDate.toISOString().split("T")[0]
    );
    if (burnupData) {
      let extendedBurnupData: DoneAndScopeCountWithForecast = {
        ...burnupData,
        doneCountForecast: null,
        doneEstimateForecast: null,
        futureDoneKeys: [],
        doneCountRequired: null,
        doneEstimateRequired: null,
      };
      doneCountForecast += epicBurnups.doneCountIncrement;
      doneEstimateForecast += epicBurnups.doneEstimateIncrement;
      doneCountRequired = Math.min(
        doneCountRequired + epicBurnups.doneCountRequiredIncrement,
        epicBurnups.doneCountLimit
      );
      doneEstimateRequired = Math.min(
        doneEstimateRequired + epicBurnups.doneEstimateRequiredIncrement,
        epicBurnups.doneEstimateLimit
      );
      extendedBurnupDataArray.push(extendedBurnupData);
    } else {
      if (currentDate < epicBurnups.startDate) {
        extendedBurnupDataArray.push({
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
          doneCount: null,
          doneEstimate: null,
          doneKeys: [],
          scopeCount: null,
          scopeEstimate: null,
          scopeKeys: [],
          doneCountForecast: null,
          doneEstimateForecast: null,
          futureDoneKeys: [],
          doneCountRequired: null,
          doneEstimateRequired: null,
        });
      } else if (currentDate > new Date()) {
        extendedBurnupDataArray.push({
          ...epicBurnups.dateData[epicBurnups.dateData.length - 1],
          date: currentDate.toISOString().split("T")[0] as TDateISODate,
          doneCount: null,
          doneEstimate: null,
          doneCountForecast: doneCountForecast,
          doneEstimateForecast: doneEstimateForecast,
          futureDoneKeys: [],
          doneCountRequired: doneCountRequired,
          doneEstimateRequired: doneEstimateRequired,
        });
        doneCountForecast += epicBurnups.doneCountIncrement;
        doneEstimateForecast += epicBurnups.doneEstimateIncrement;
        doneCountRequired = Math.min(
          doneCountRequired + epicBurnups.doneCountRequiredIncrement,
          epicBurnups.doneCountLimit
        );
        doneEstimateRequired = Math.min(
          doneEstimateRequired + epicBurnups.doneEstimateRequiredIncrement,
          epicBurnups.doneEstimateLimit
        );
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // console.log(extendedBurnupDataArray);
  return extendedBurnupDataArray;
}

export function getGoogleDataTableFromMultipleBurnupData(
  allEpicsData: EpicBurnup[],
  estimate: boolean,
  selectedEpics?: number[]
): GoogleDataTableType[] {
  let filteredEpics = getSelectedEpics(allEpicsData, selectedEpics);
  let earliestDate = new Date(getEarliestDate(filteredEpics));
  let lastDate = new Date(getLastDate(filteredEpics));
  let extendedBurnupDataArray = filteredEpics.map((item) => {
    return extendEpicBurnup(item, earliestDate, lastDate);
  });
  // let googleBurnupDataArray = filteredEpics.map((item) => {
  //   return getGoogleDataTableFromBurnupDateData(item.dateData, estimate);
  // });
  let googleBurnupDataArray = extendedBurnupDataArray.map((item) => {
    return getGoogleDataTableFromBurnupDateData(item, estimate);
  });
  let allDates: GoogleDataTableType[] = [];
  for (
    let d = new Date(earliestDate);
    d <= new Date(lastDate);
    d.setDate(d.getDate() + 1)
  ) {
    let tomorrow = new Date(d);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let dataBetweenDates = googleBurnupDataArray.map((burnupDateDataArray) => {
      return getDataBetweenDates(burnupDateDataArray, d, tomorrow);
    });
    let sumDone = dataBetweenDates.reduce((acc, val) => acc + val[1], 0);
    let sumScope = dataBetweenDates.reduce((acc, val) => acc + val[2], 0);
    let sumIdeal = dataBetweenDates.reduce((acc, val) => acc + val[3], 0);
    let sumForecast = dataBetweenDates.reduce((acc, val) => acc + val[4], 0);
    if (sumForecast === 0) {
      sumForecast = null;
    }
    if (sumDone === 0) {
      sumDone = null;
    }
    allDates.push([new Date(d), sumDone, sumScope, sumIdeal, sumForecast]);
  }
  return allDates;
}

export function getGoogleDataTableFromBurnupDateData(
  burnupDataArray: DoneAndScopeCountWithForecast[],
  estimate: boolean
) {
  let googleBurnupDataArray = burnupDataArray.map((item) => {
    return [
      new Date(item.date),
      estimate ? item.doneEstimate / 3600 / 8 : item.doneCount,
      estimate ? item.scopeEstimate / 3600 / 8 : item.scopeCount,
      estimate ? item.doneEstimateRequired / 3600 / 8 : item.doneCountRequired,
      estimate ? item.doneEstimateForecast / 3600 / 8 : item.doneCountForecast,
    ];
  });
  return googleBurnupDataArray;
}

export default class EpicBurnupClass extends React.Component<Props, State> {
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
        let burnupDataArrays: EpicBurnup[] = JSON.parse(data.data);
        this.setState({ allEpicsData: burnupDataArrays });
        this.setState({
          epicSelectList: burnupDataArrays.map((item, i) => {
            return { label: item.key + " - " + item.summary, value: i };
          }),
        });
        let selectedEpicsData = getGoogleDataTableFromMultipleBurnupData(
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

  onSelectedEpicsChanged = (selected: string[]) => {
    let x = getGoogleDataTableFromMultipleBurnupData(
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
    let selectedEpicsData = getGoogleDataTableFromMultipleBurnupData(
      this.state.allEpicsData,
      e.target.value === "estimate",
      this.state.selectedEpics.map((item) => parseInt(item))
    );
    this.setState({
      selectedEpicsData,
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
        2: { color: "red", lineDashStyle: [4, 4] }, //ideal
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
