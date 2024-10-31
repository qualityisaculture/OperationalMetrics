import React from 'react';
import { EstimatesData } from '../server/graphManagers/EstimatesGraphManager';
import type { DatePickerProps, InputNumberProps } from 'antd';
import { DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { ThroughputDataType } from '../server/graphManagers/ThroughputGraphManager';
import Select from './Select';
import type { SelectProps } from 'antd';

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  throughputData: ThroughputDataType[];
}

export default class Throughput extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    let tempQuery = new URLSearchParams(window.location.search).get(
      'estimatesQuery'
    );
    this.state = {
      input: tempQuery ? tempQuery : '',
      currentSprintStartDate: '2024-10-23',
      numberOfSprints: 4,
      throughputData: [],
    };
  }
  onClick = () => {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch(
      '/api/throughput?query=' +
        this.state.input +
        '&currentSprintStartDate=' +
        this.state.currentSprintStartDate +
        '&numberOfSprints=' +
        this.state.numberOfSprints
    )
      .then((response) => response.json())
      .then((data) => {
        let throughputData: ThroughputDataType[] = JSON.parse(data.data);
        this.setState({ throughputData });
      });
  };
  onSprintStartDateChange: DatePickerProps['onChange'] = (date, dateString) => {
    this.setState({ currentSprintStartDate: date.toString() });
  };
  onNumberOfSprintsChange = (value) => {
    this.setState({ numberOfSprints: value });
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
        <DatePicker
          onChange={this.onSprintStartDateChange}
          defaultValue={dayjs('2024/10/23')}
        />
        <InputNumber
          value={this.state.numberOfSprints}
          onChange={this.onNumberOfSprintsChange}
        />

        <button onClick={this.onClick}>Click me</button>
        <Chart throughputData={this.state.throughputData} />
      </div>
    );
  }
}

const google = globalThis.google;

interface ChartProps {
  throughputData: ThroughputDataType[];
}
interface ChartState {
  parents: { label: string; key: string }[];
}

class Chart extends React.Component<ChartProps, ChartState> {
  constructor(props) {
    super(props);
    this.state = { parents: [] };
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.throughputData) {
        return;
      }
      this.setParents();
      this.drawChart();
    }
  }

  setParents = () => {
    let parentMap = new Map<string, {label: string, key: string}>();
    this.props.throughputData.forEach((item) => {
      item.issueList.forEach((issue) => {
        if (issue.parentKey) parentMap.set(issue.parentKey, { label: issue.parentKey + ":" + issue.parentName, key: issue.parentKey });
      });
    });
    let arrayOfAllParents = Array.from(parentMap.values());
    this.setState({ parents: arrayOfAllParents });
  };

  epicsSelected = (selected: string[]) => {
    console.log(selected);
  };

  drawChart() {
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
      },
    };
    var chart = new google.visualization.ColumnChart(
      document.getElementById('chart_div')
    );

    chart.draw(data, options);
  }

  render() {
    const options: SelectProps['options'] = [];
    this.state.parents.forEach((state) => {
      options.push({ label: state.label, value: state.key });
    });
    console.log(options);
    return (
      <div>
        <Select onChange={this.epicsSelected} options={options} />
      </div>
    );
  }
}
