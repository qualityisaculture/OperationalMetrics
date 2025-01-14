const google = globalThis.google;
import React from "react";

export type AreaType = {
  type: string;
  identifier: string | number;
  label: string;
};
type GoogleDataType = { addRow: (arg0: any[]) => void };

export type XAxisData = string | number | Date;
export type CategoryData = { [key: string]: XAxisData };

interface ChartProps {
  title: string;
  columns: AreaType[];
  data: CategoryData[];
  extraOptions?: any;
}
interface ChartState {}

export default class AreaChart extends React.Component<ChartProps, ChartState> {
  randomId: string;
  constructor(props) {
    super(props);
    this.randomId = Math.random().toString(36).substring(7);
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.data) {
        return;
      }
      this.drawChart();
    }
  }

  addColumns(data: any) {
    this.props.columns.forEach((column) => {
      data.addColumn(column.type, column.label);
    });
  }

  addDataToChart(data: GoogleDataType) {
    this.props.data.forEach((categoryData) => {
      let row: any[] = [];
      this.props.columns.forEach((column) => {
        row.push(categoryData[column.identifier]);
      });
      data.addRow(row);
    });
  }

  handlePointClick = (chart) => {
    var selection = chart.getSelection();
    let clickData: string = this.props.data[selection[0].row]
      .clickData as string;
    let notesElement = document.getElementById("notes");
    if (notesElement) notesElement.innerHTML = clickData;
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    this.addColumns(data);
    this.addDataToChart(data);

    var options = {
      title: this.props.title,
      legend: { position: "bottom" },
      isStacked: true,
      vAxis: {
        minValue: 0,
      },
    };
    if (this.props.extraOptions) {
      options = { ...options, ...this.props.extraOptions };
    }
    var chart = new google.visualization.AreaChart(
      document.getElementById(this.randomId)
    );
    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handlePointClick(chart);
      }.bind(this)
    );

    chart.draw(data, options);
  }

  render() {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
