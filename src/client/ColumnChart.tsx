const google = globalThis.google;
import React from "react";
import { WithWildcards } from "../Types";

export type ColumnType = {
  type: string;
  identifier: string | number;
  label: string;
};
type GoogleDataType = { addRow: (arg0: any[]) => void };

export type ColumnData = WithWildcards<{}>;
export type CategoryData = ColumnData[];

interface ChartProps {
  title: string;
  columns: ColumnType[];
  data: CategoryData;
  extraOptions?: any;
}
interface ChartState {}

export default class ColumnChart extends React.Component<
  ChartProps,
  ChartState
> {
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

  handleColumnClick = (chart) => {
    var selection = chart.getSelection();
    let clickData: string = this.props.data[selection[0].row]
      .clickData as string;
    let notesElement = document.getElementById("notes");
    if (notesElement) notesElement.innerHTML = clickData;
  };

  addBreakdown(data: GoogleDataType) {
    const columnSums: { [key: string]: number } = {};
    let totalSum = 0;

    this.props.data.forEach((categoryData) => {
      this.props.columns.forEach((column) => {
        const value = categoryData[column.identifier];
        if (typeof value === "number") {
          columnSums[column.label] = (columnSums[column.label] || 0) + value;
          totalSum += value;
        }
      });
    });

    const summary = Object.entries(columnSums)
      .map(([label, sum]) => {
        const flooredSum = Math.floor(sum);
        const percentage =
          totalSum > 0 ? ((flooredSum / totalSum) * 100).toFixed(2) : "0.00";
        return `${label}: ${flooredSum} (${percentage}%)`;
      })
      .join("<br>");

    const notesElement = document.getElementById("notes");
    if (notesElement) {
      notesElement.innerHTML = summary;
    }
  }

  drawChart() {
    var data = new google.visualization.DataTable();
    this.addColumns(data);
    this.addDataToChart(data);
    this.addBreakdown(data);

    var options = {
      title: this.props.title,
      legend: { position: "bottom" },
      vAxis: {
        minValue: 0,
      },
    };
    if (this.props.extraOptions) {
      options = { ...options, ...this.props.extraOptions };
    }
    var chart = new google.visualization.ColumnChart(
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

  render() {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
