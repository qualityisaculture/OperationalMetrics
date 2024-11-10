import React from 'react';
import { BurnupDataArray, BurnupData } from '../server/graphManagers/BurnupGraphManager';
import Select from './Select';
import type { SelectProps } from 'antd';

interface Props {}
interface State {
  input: string;
  epics: SelectProps['options'];
  selectedEpics: string[];
}

const google = globalThis.google;

export default class EpicBurnup extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: localStorage.getItem('epicIssueKey') || '',
      epics: [],
      selectedEpics: [],
    };
  }
  onClick() {
    console.log('Button clicked');
    localStorage.setItem('epicIssueKey', this.state.input);
    //Request to the server /api/metrics
    fetch('/api/epicBurnup?query=' + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let burnupDataArrays: BurnupDataArray[] = JSON.parse(data.data);
        this.setState({
          epics: burnupDataArrays.map((item) => {
            return { label: item.key + ' - ' + item.summary, value: item.key };
          }),
        });
        this.drawChart(burnupDataArrays[0].data);
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.
  drawChart(burnupDataArray: BurnupData[]) {
    let googleBurnupDataArray = burnupDataArray.map((item) => {
      return [
        new Date(item.date),
        item.doneCount,
        item.scopeCount,
        item.idealTrend,
        item.forecastTrend,
      ];
    });

    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Done');
    data.addColumn('number', 'Scope');
    data.addColumn('number', 'Ideal Trend');
    data.addColumn('number', 'Forecast Trend');
    data.addRows(googleBurnupDataArray);
    console.log(googleBurnupDataArray);

    var options = {
      title: 'Issue Burnup',
      legend: { position: 'bottom' },
      series: {
        0: { color: 'blue' }, //done
        1: { color: 'green' }, //scope
        2: { color: 'red' }, //ideal
        3: { color: 'orange', lineDashStyle: [4, 4] }, //forecast
      }
    };

    var chart = new google.visualization.LineChart(
      document.getElementById('chart_div')
    );

    chart.draw(data, options);
  }
  onSelectedEpicsChanged = (selected: string[]) => {
    this.setState({ selectedEpics: selected });
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
        <Select options={this.state.epics} onChange={this.onSelectedEpicsChanged} />
      </div>
    );
  }
}
