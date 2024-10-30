import React from 'react';
import { EstimatesData } from '../server/graphManagers/EstimatesGraphManager';
import type { DatePickerProps } from 'antd';
import { DatePicker } from 'antd';
import Chart from './Chart';
import dayjs from 'dayjs';

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
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
    };
  }
  onClick() {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch('/api/throughput?query=' + this.state.input + '&currentSprintStartDate=' + this.state.currentSprintStartDate)
      .then((response) => response.json())
      .then((data) => {
        console.log(JSON.parse(data.data));
        let estimatesData: EstimatesData = JSON.parse(data.data);
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
        {/* <Chart
          estimatesData={this.estimatesData}
          typesSelected={this.state.typesSelected}
        /> */}
      </div>
    );
  }
}
