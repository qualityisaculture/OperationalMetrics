import React from 'react';

interface Props {}
interface State {
  input: string;
}

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
        console.log(JSON.parse(data.data));
        this.drawChart();
      });
  }
  // Callback that creates and populates a data table,
  // instantiates the pie chart, passes in the data and
  // draws it.
  drawChart() {
    // Create the data table.
    var data = new globalThis.google.visualization.DataTable();
    data.addColumn('string', 'Topping');
    data.addColumn('number', 'Slices');
    data.addRows([
      ['Mushrooms', 3],
      ['Onions', 1],
      ['Olives', 1],
      ['Zucchini', 1],
      ['Pepperoni', 2],
    ]);

    // Set chart options
    var options = {
      title: 'How Much Pizza I Ate Last Night',
      width: 400,
      height: 300,
    };

    // Instantiate and draw our chart, passing in some options.
    var chart = new globalThis.google.visualization.PieChart(
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

export { Button };
