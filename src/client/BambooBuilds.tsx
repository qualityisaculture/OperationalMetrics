import React from 'react';
import ColumnChart from './ColumnChart';
import { Input } from 'antd';

interface Props {}
interface State {
  numberData: any;
  numberColumns: any;
  percentageData: any;
  percentageColumns: any;
  projectBuildKey: string;
}

export default class BambooBuilds extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      numberData: [],
      numberColumns: [],
      percentageData: [],
      percentageColumns: [],
      projectBuildKey: localStorage.getItem('projectBuildKey') || ''
    };
  }
  onClick = async () => {
    let bambooData = await fetch(`/api/bamboo?projectBuildKey=${this.state.projectBuildKey}`)
      .then((response) => response.json())
      .then((data) => {
        let bambooData = JSON.parse(data.data);
        return bambooData;
      })

    console.log(bambooData);
    let numberColumns = [
      { type: 'string', identifier: 'month', label: 'Build Date' },
      { type: 'number', identifier: 'totalBuilds', label: 'Total Builds' },
      { type: 'number', identifier: 'restartedBuilds', label: 'Restarted Builds' },
      { type: 'number', identifier: 'passFirstTimeBuilds', label: 'Build Passed First Time' },
    ];
    let percentageColumns = [
      { type: 'string', identifier: 'month', label: 'Build Date' },
      { type: 'number', identifier: 'successRate', label: 'Success Rate' },
      { type: 'number', identifier: 'failureRate', label: 'Failure Rate' },
      { type: 'number', identifier: 'restartRate', label: 'Restart Rate' },
      { type: 'number', identifier: 'passFirstTimeRate', label: 'Pass First Time Rate' },
    ];
    this.setState({ numberData: bambooData, numberColumns: numberColumns });
    this.setState({ percentageData: bambooData, percentageColumns: percentageColumns });
  }
  onProjectBuildKeyChange = (e: any) => {
    this.setState({ projectBuildKey: e.target.value });
    localStorage.setItem('projectBuildKey', e.target.value);
  }
  render() {
    return (
      <div>
        <h1>Bamboo Builds</h1>
        <Input value={this.state.projectBuildKey} onChange={this.onProjectBuildKeyChange} />
        <button onClick={this.onClick}>Get Bamboo Builds</button>
        <ColumnChart columns={this.state.numberColumns} data={this.state.numberData} title='Total Builds' />
        <ColumnChart columns={this.state.percentageColumns} data={this.state.percentageData} title='Failure Percentage' />
      </div>
    );
  }
}