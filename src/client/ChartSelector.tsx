import React from 'react';
import { Radio } from 'antd';
import type { RadioChangeEvent } from 'antd';
import Throughput from './Throughput';
import EstimatesAnalysis from './EstimatesAnalysis';
import EpicBurnup from './EpicBurnup';
import BambooBuilds from './BambooBuilds';

interface Props {}

interface State {
  chart: 'burnup' | 'estimate' | 'throughput' | 'bamboo'
}

export default class ChartSelector extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      chart: 'bamboo',
    };
  }
  handleChartChange = (e: RadioChangeEvent) => {
    this.setState({
      chart: e.target.value,
    });
  };
  render() {
    return (
      <div>
        <div>
          <Radio.Group
            value={this.state.chart}
            onChange={this.handleChartChange}
          >
            <Radio.Button value="burnup">Burnup</Radio.Button>
            <Radio.Button value="estimate">Estimate</Radio.Button>
            <Radio.Button value="throughput">Throughput</Radio.Button>
            <Radio.Button value="bamboo">Bamboo Builds</Radio.Button>
          </Radio.Group>
        </div>
        <div>
          {this.state.chart === 'burnup' && <EpicBurnup />}
          {this.state.chart === 'estimate' && <EstimatesAnalysis />}
          {this.state.chart === 'throughput' && <Throughput />}
          {this.state.chart === 'bamboo' && <BambooBuilds />}
        </div>
      </div>
    );
  }
}
