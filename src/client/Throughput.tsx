import React from 'react';
import { EstimatesData } from '../server/graphManagers/EstimatesGraphManager';
import type { DatePickerProps, InputNumberProps } from 'antd';
import { DatePicker, InputNumber } from 'antd';
import dayjs from 'dayjs';
import { ThroughputDataType } from '../server/graphManagers/ThroughputGraphManager';
import Select from './Select';
import type { SelectProps } from 'antd';
import { IssueInfo } from '../server/graphManagers/GraphManagerTypes';

type GoogleDataTableType = {
  addColumn: (type: string, label: string) => void;
  addRow: (row: GoogleDataRowType) => void;
};

type GoogleDataRowType = {
  push: (value: any) => void;
};

type ClickDataType = { initiativeKey: string; issues: IssueInfo[] }
type ClickDataColumnType = ClickDataType[];

class ConcatableMap extends Map {
  concat(key, value) {
    let array = this.get(key);
    if (array) {
      this.set(key, array.concat(value));
    } else {
      this.set(key, [value]);
    }
  }
}

interface Props {}
interface State {
  input: string;
  currentSprintStartDate: string;
  numberOfSprints: number;
  throughputData: ThroughputDataType[];
  initiatitives: SelectProps['options'];
  initiativesSelected: string[];
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
      initiatitives: [],
      initiativesSelected: [],
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
        let allInitiatives = new Map<
          string,
          { label: string; value: string }
        >();
        throughputData.forEach((item) => {
          item.issueList.forEach((issue) => {
            if (issue.initiativeKey)
              allInitiatives.set(issue.initiativeKey, {
                label: issue.initiativeKey + ':' + issue.initiativeName,
                value: issue.initiativeKey,
              });
          });
        });
        let arrayOfAllInitiatives: SelectProps['options'] = Array.from(
          allInitiatives.values()
        );
        this.setState({
          throughputData,
          initiatitives: arrayOfAllInitiatives,
          initiativesSelected: [],
        });
      });
  };
  onSprintStartDateChange: DatePickerProps['onChange'] = (date, dateString) => {
    this.setState({ currentSprintStartDate: date.toString() });
  };
  onNumberOfSprintsChange = (value) => {
    this.setState({ numberOfSprints: value });
  };
  initiatitivesSelected = (selected: string[]) => {
    this.setState({ initiativesSelected: selected });
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
        <Select
          onChange={this.initiatitivesSelected.bind(this)}
          options={this.state.initiatitives}
        />

        <button onClick={this.onClick}>Click me</button>
        <Chart
          throughputData={this.state.throughputData}
          initiativesSelected={this.state.initiativesSelected}
        />
      </div>
    );
  }
}

const google = globalThis.google;

interface ChartProps {
  throughputData: ThroughputDataType[];
  initiativesSelected: string[];
}
interface ChartState {}

class Chart extends React.Component<ChartProps, ChartState> {
  constructor(props) {
    super(props);
  }

  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      if (!this.props.throughputData) {
        return;
      }
      this.drawChart();
    }
  }

  addColumns(data: any, initiativesSelected: string[]) {
    data.addColumn('date', 'Sprint Start Date');
    // Add columns for each initiative
    this.props.initiativesSelected.forEach((parent) => {
      data.addColumn('number', parent);
      data.addColumn({ role: 'tooltip', p: { html: true } });
    });
    data.addColumn('number', 'None');
    data.addColumn({ role: 'tooltip', p: { html: true } });
  }

  getIssuesByInitiative(issues: IssueInfo[]) {
    let issuesByInitiative = new ConcatableMap();

    issues.forEach((issue) => {
      if (issue.initiativeKey) {
        issuesByInitiative.concat(issue.initiativeKey, issue);
      } else {
        issuesByInitiative.concat('None', issue);
      }
    });
    return issuesByInitiative;
  }

  addDataToChart(data: any, clickData: ClickDataType[][]) {
    this.props.throughputData.forEach((sprint) => {
      let issuesByInitiative = this.getIssuesByInitiative(sprint.issueList);
      let columnClickData: ClickDataType[] = [];

      let row: GoogleDataRowType = [new Date(sprint.sprintStartingDate)];
      [...this.props.initiativesSelected, 'None'].forEach((parent) => {
        let initiatives = issuesByInitiative.get(parent) || [];
        row.push(initiatives.length);
        row.push(initiatives.map((issue) => issue.key).join(', '));
        columnClickData.push({ initiativeKey: parent, issues: initiatives });
      });

      data.addRow(row);
      clickData.push(columnClickData);
    });
  }

  handleColumnClick = (chart, clickData: ClickDataColumnType) => {
    var selection = chart.getSelection();
    let jiraData = clickData[selection[0].row];
    let logHTML = '';
    jiraData.forEach((data) => {
      if (data.issues.length === 0) return;
      logHTML += `<h3>${data.initiativeKey}</h3>`;
      data.issues.forEach((issue) => {
        logHTML += `<p><a target="_blank" href="${issue.url}">${issue.key} ${issue.summary} - ${issue.type}</a></p>`;
      });
    });
    let notesElement = document.getElementById('notes');
    if (notesElement) notesElement.innerHTML = logHTML;
  }

  drawChart() {
    var data = new google.visualization.DataTable();
    let clickData: ClickDataType[][] = [];
    this.addColumns(data, this.props.initiativesSelected);
    this.addDataToChart(data, clickData);

    var options = {
      title: 'Estimates Analysis',
      curveType: 'function',
      legend: { position: 'bottom' },
      vAxis: {
        minValue: 0,
      },
      isStacked: true,
    };
    var chart = new google.visualization.ColumnChart(
      document.getElementById('chart_div')
    );
    google.visualization.events.addListener(chart, 'select', function () {
      this.handleColumnClick(chart, clickData);
    }.bind(this));

    chart.draw(data, options);
  }

  render() {
    return (
      <div>
        {/* <Select onChange={this.epicsSelected} options={options} /> */}
      </div>
    );
  }
}
