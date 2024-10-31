import React from 'react';
import { EstimatesData } from '../server/graphManagers/EstimatesGraphManager';
import type { DatePickerProps } from 'antd';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { ThroughputDataType } from '../server/graphManagers/ThroughputGraphManager';

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
  throughputData: ThroughputDataType[];
}

export default class Throughput extends React.Component<Props, State> {
  estimatesData: EstimatesData | null;
  constructor(props) {
    super(props);
    this.estimatesData = null;
    this.onClick = this.onClick.bind(this);
    let tempQuery = new URLSearchParams(window.location.search).get(
      'estimatesQuery'
    );
    this.state = {
      input: tempQuery ? tempQuery : '',
      currentSprintStartDate: '2024-10-23',
      throughputData: [],
    };
  }
  onClick() {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch('/api/throughput?query=' + this.state.input + '&currentSprintStartDate=' + this.state.currentSprintStartDate)
      .then((response) => response.json())
      .then((data) => {
        console.log(JSON.parse(data.data));
        let throughputData: ThroughputDataType[] = JSON.parse(data.data);
        this.setState({ throughputData  });
        // this.estimatesData = estimatesData;
        // let uniqueStatuses = estimatesData.uniqueStatuses;
        // let uniqueTypesSet = new Set<string>();
        // estimatesData.estimateData.forEach((item) => {
        //   uniqueTypesSet.add(item.type);
        // });
      });
  }
  onChange: DatePickerProps['onChange'] = (date, dateString) => {
    console.log(date, dateString);
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
        <DatePicker onChange={this.onChange} defaultValue={dayjs('2024/10/23')} />

        <button onClick={this.onClick}>Click me</button>
        <Chart
          throughputData={this.state.throughputData}
        />
      </div>
    );
  }
}

const google = globalThis.google;

interface ChartProps {throughputData: ThroughputDataType[]}
interface ChartState {}

class Chart extends React.Component<ChartProps, ChartState> {
  constructor(props) {
    super(props);
  }
  //if props change
  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.throughputData) {
        return;
      }

      var data = new google.visualization.DataTable();
      data.addColumn('date', 'Sprint Start Date');
      data.addColumn('number', 'Issues Completed');
      data.addColumn({ role: 'tooltip', p: { html: true } });
      this.props.throughputData.forEach((item) => {
        data.addRow([
          new Date(item.sprintStartingDate),
          item.issueList.length,
          item.issueList.map((issue) => issue.key).join(', '),
        ]);
      });

      var options = {
        title: 'Estimates Analysis',
        curveType: 'function',
        legend: { position: 'bottom' },
        vAxis: {
          minValue: 0,
        }
      };

      // var chart = new google.charts.Scatter(
      //   document.getElementById('chart_div')
      // );
      var chart = new google.visualization.ColumnChart(
        document.getElementById('chart_div')
      );

      chart.draw(data, options);
    }
  }
  render() {
    return <div>Chart</div>;
  }
}

