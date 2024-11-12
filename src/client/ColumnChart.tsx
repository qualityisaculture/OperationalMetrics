const google = globalThis.google;
import React from 'react';

interface ChartProps {
  title: string;
  columns: {type: string, identifier: string, label: string}[];
  data: any[];
}
interface ChartState {}

export default class ColumnChart extends React.Component<ChartProps, ChartState> {
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

  addDataToChart(data: any) {
    this.props.data.forEach((columnData) => {
      let row: any[] = [];
      this.props.columns.forEach((column) => {
        row.push(columnData[column.identifier]);
      });
      data.addRow(row);
    });
  }

  drawChart() {
    var data = new google.visualization.DataTable();
    this.addColumns(data);
    this.addDataToChart(data);

    var options = {
      title: this.props.title,
      legend: { position: 'bottom' },
      vAxis: {
        minValue: 0,
      }
    };
    var chart = new google.visualization.ColumnChart(
      document.getElementById(this.randomId)
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
