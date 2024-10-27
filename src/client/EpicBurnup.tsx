import React from 'react';
import { BurnupDataArray } from '../server/BurnupGraphManager';

interface Props {}
interface State {
  input: string;
}

const google = globalThis.google;

class Button extends React.Component<Props, State> {
  state: { input: string }; //Remove when TS is fixed.
  setState: any; //Remove when TS is fixed.
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: 'AF-15921',
    };
  }
  onClick() {
    console.log('Button clicked');
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
      return [new Date(item.date), item.doneCount, item.scopeCount];
    });

    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Done');
    data.addColumn('number', 'Scope');
    data.addRows(googleBurnupDataArray);
    console.log(googleBurnupDataArray);

    var options = {
      title: 'Issue Burnup',
      curveType: 'function',
      legend: { position: 'bottom' }
    };

    var chart = new google.visualization.LineChart(document.getElementById('chart_div'));

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

export { Button };
