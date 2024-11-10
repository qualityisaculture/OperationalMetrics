import React from 'react';
import {
  BurnupEpicData,
  BurnupDateData,
} from '../server/graphManagers/BurnupGraphManager';
import Select from './Select';
import type { SelectProps } from 'antd';

interface Props {}
interface State {
  input: string;
  epicSelectList: SelectProps['options'];
  selectedEpics: string[];
  selectedEpicsData: GoogleDataTableType[];
  allEpicsData: BurnupEpicData[];
}

type GoogleDataTableType = [Date, number, number, number, number];

const google = globalThis.google;

export default class EpicBurnup extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: localStorage.getItem('epicIssueKey') || '',
      epicSelectList: [],
      selectedEpics: [],
      selectedEpicsData: [],
      allEpicsData: [],
    };
  }
  onClick() {
    console.log('Button clicked');
    localStorage.setItem('epicIssueKey', this.state.input);
    //Request to the server /api/metrics
    fetch('/api/epicBurnup?query=' + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let burnupDataArrays: BurnupEpicData[] = JSON.parse(data.data);
        this.setState({ allEpicsData: burnupDataArrays });
        this.setState({
          epicSelectList: burnupDataArrays.map((item, i) => {
            return { label: item.key + ' - ' + item.summary, value: i };
          }),
        });
        let selectedEpicsData = this.getGoogleDataTableFromMultipleBurnupData(burnupDataArrays);
        this.setState({ selectedEpicsData });
        
        // this.drawChart(burnupDataArrays[0].data);
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.

  getGoogleDataTableFromMultipleBurnupData(allEpicsData: BurnupEpicData[], selectedEpics?: number[]) {
    let filteredData = selectedEpics ? allEpicsData.filter((item, index) => selectedEpics.includes(index)) : allEpicsData;
    let googleBurnupDataArray = filteredData.map((item) => {
      return this.getGoogleDataTableFromBurnupDateData(item.dateData);
    });
    let earliestDate = googleBurnupDataArray.reduce((acc, val) => {
      return acc < val[0][0] ? acc : val[0][0]; 
    }, new Date());
    let lastDate = googleBurnupDataArray.reduce((acc, val) => {
      return acc > val[val.length - 1][0] ? acc : val[val.length - 1][0];
    }, new Date());
    let allDates: GoogleDataTableType[] = [];
    for (let d = new Date(earliestDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
      let tomorrow = new Date(d);
      tomorrow.setDate(tomorrow.getDate() + 1);
      let dataBetweenDates = googleBurnupDataArray.map((burnupDateDataArray) => {
        let data = burnupDateDataArray.find((item) => item[0] >= d && item[0] < tomorrow);
        return data ? data : [d, 0, 0, 0, 0];
      });
      let sumDone = dataBetweenDates.reduce((acc, val) => acc + val[1], 0);
      let sumScope = dataBetweenDates.reduce((acc, val) => acc + val[2], 0);
      let sumIdeal = dataBetweenDates.reduce((acc, val) => acc + val[3], 0);
      let sumForecast = dataBetweenDates.reduce((acc, val) => acc + val[4], 0);
      allDates.push([new Date(d), sumDone, sumScope, sumIdeal, sumForecast]);
      debugger;
    }
    return allDates;
  }

  getGoogleDataTableFromBurnupDateData(burnupDataArray: BurnupDateData[]) {
    let googleBurnupDataArray = burnupDataArray.map((item) => {
      return [
        new Date(item.date),
        item.doneCount,
        item.scopeCount,
        item.idealTrend,
        item.forecastTrend,
      ];
    });
    return googleBurnupDataArray;
  }

  onSelectedEpicsChanged = (selected: string[]) => {

    let x= this.getGoogleDataTableFromMultipleBurnupData(this.state.allEpicsData, selected.map((item) => parseInt(item)));
    this.setState({
      selectedEpics: selected,
      selectedEpicsData: x
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
  constructor(props) {
    super(props);
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
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Done');
    data.addColumn('number', 'Scope');
    data.addColumn('number', 'Ideal Trend');
    data.addColumn('number', 'Forecast Trend');
    data.addRows(this.props.burnupDataArray);
    console.log(this.props.burnupDataArray);

    var options = {
      title: 'Issue Burnup',
      legend: { position: 'bottom' },
      series: {
        0: { color: 'blue' }, //done
        1: { color: 'green' }, //scope
        2: { color: 'red' }, //ideal
        3: { color: 'orange', lineDashStyle: [4, 4] }, //forecast
      },
    };

    var chart = new google.visualization.LineChart(
      document.getElementById('chart_div')
    );

    chart.draw(data, options);
  }

  render(): React.ReactNode {
    return <div></div>;
  }
}
