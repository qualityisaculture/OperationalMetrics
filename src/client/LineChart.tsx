import React from "react";
const google = globalThis.google;

export type GoogleDataTableType = {
  data: [Date, number | null, number | null, number | null];
  clickData?: string;
};

interface ChartProps {
  burnupDataArray: GoogleDataTableType[];
}
interface ChartState {}
export default class LineChart extends React.Component<ChartProps, ChartState> {
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

  handleColumnClick = (chart) => {
    var selection = chart.getSelection();
    let clickData: string = this.props.burnupDataArray[selection[0].row]
      .clickData as string;
    let notesElement = document.getElementById("notes");
    if (notesElement) notesElement.innerHTML = clickData;
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn("date", "Date");
    data.addColumn("number", "Done");
    data.addColumn("number", "In Progress or Done");
    data.addColumn("number", "Scope");
    data.addRows(this.props.burnupDataArray.map((item) => item.data));

    var options = {
      title: "Issue Burnup",
      legend: { position: "bottom" },
      series: {
        0: { color: "blue" }, //done
        1: { color: "orange" }, //in progress
        2: { color: "green" }, //scope
      },
    };

    var chart = new google.visualization.LineChart(
      document.getElementById(this.randomId)
    );
    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handleColumnClick(chart);
      }.bind(this)
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
