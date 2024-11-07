import React from 'react';
import { BurnupDataArray } from '../server/graphManagers/BurnupGraphManager';

interface Props {}
interface State {
  input: string;
}

const google = globalThis.google;

export default class EpicBurnup extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: localStorage.getItem('epicIssueKey') || '',
    };
  }
  onClick() {
    console.log('Button clicked');
    localStorage.setItem('epicIssueKey', this.state.input);
    //Request to the server /api/metrics
    fetch('/api/epicBurnup?epicIssueKey=' + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        let burnupDataArray: BurnupDataArray = JSON.parse(data.data);
        this.drawChart(burnupDataArray);
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.
  drawChart(burnupDataArray: BurnupDataArray) {
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
      </div>
    );
  }
}
