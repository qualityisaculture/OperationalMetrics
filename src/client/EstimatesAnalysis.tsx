import React from 'react';
import {
  EstimatesData,
} from '../server/graphManagers/EstimatesGraphManager';
import Select from './Select';
import EstimateChart from './EstimateChart';

interface Props {}
interface State {
  input: string;
  allStates: string[];
  allTypes: string[];
  statesSelected: string[];
  typesSelected: string[];
}

export default class EstimatesAnalysis extends React.Component<Props, State> {
  state: State; //Remove when TS is fixed.
  setState: any; //Remove when TS is fixed.
  estimatesData: EstimatesData | null;
  constructor(props) {
    super(props);
    this.estimatesData = null;
    this.onClick = this.onClick.bind(this);
    let tempQuery = new URLSearchParams(window.location.search).get(
      'estimatesQuery'
    );
    this.state = {
      input: tempQuery ? tempQuery : 'AF-15921',
      allStates: [],
      statesSelected: [],
      allTypes: [],
      typesSelected: [],
    };
  }
  onClick() {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch('/api/estimates?query=' + this.state.input)
      .then((response) => response.json())
      .then((data) => {
        console.log(JSON.parse(data.data));
        let estimatesData: EstimatesData = JSON.parse(data.data);
        this.estimatesData = estimatesData;
        let uniqueStatuses = estimatesData.uniqueStatuses;
        let uniqueTypesSet = new Set<string>();
        estimatesData.estimateData.forEach((item) => {
          uniqueTypesSet.add(item.type);
        });
        this.setState({
          allStates: uniqueStatuses,
          allTypes: Array.from(uniqueTypesSet),
          statesSelected: uniqueStatuses,
          typesSelected: Array.from(uniqueTypesSet),
        });
      });
  }

  createCSV(estimatesData: EstimatesData) {
    var csv =
      'key,type,originalEstimate,timeSpent,' +
      estimatesData.uniqueStatuses.join(',') +
      '\n';
    estimatesData.estimateData.forEach((item) => {
      if (item.originalEstimate) {
        csv +=
          item.key +
          ',' +
          item.type +
          ',' +
          item.originalEstimate +
          ',' +
          item.timeSpent +
          ',';
        estimatesData.uniqueStatuses.forEach((status) => {
          let statusTime = item.statusTimes.find(
            (statusTime) => statusTime.status === status
          );
          csv += statusTime ? statusTime.time : 0;
          csv += ',';
        });
        csv += '\n';
      }
    });
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'estimates.csv';
    hiddenElement.click();
  }
  stateSelectedChange = (selected: string[]) => {
    this.setState({ statesSelected: selected });
  };
  typeSelectedChange = (selected: string[]) => {
    this.setState({ typesSelected: selected });
  };
  render() {
    let typeOptions = this.state.allTypes.map((type) => {
      return { value: type, label: type };
    });
    let stateOptions = this.state.allStates.map((state) => {
      return { value: state, label: state };
    });
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
        <Select
          options={stateOptions}
          onChange={this.stateSelectedChange}
        />
        <Select
          options={typeOptions}
          onChange={this.typeSelectedChange}
        />
        <EstimateChart estimatesData={this.estimatesData} typesSelected={this.state.typesSelected} />
      </div>
    );
  }
}
