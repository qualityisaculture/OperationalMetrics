import React from 'react';
import { EstimateData } from '../server/graphManagers/EstimatesGraphManager';

const google = globalThis.google;

interface Props {estimateData: EstimateData, typesSelected: string[]}
interface State {}

export default class Chart extends React.Component<Props, State> {
  props: any;
  constructor(props) {
    super(props);
  }

  getPearsonCorrelation(x: number[], y: number[]) {
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    let n = x.length;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }
    let r =
      (n * sumXY - sumX * sumY) /
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return r;
  }
  //if props change
  componentDidUpdate(prevProps) {
    if (prevProps !== this.props) {
      console.log('props changed');
      console.log('Drawing chart');
      if (!this.props.estimatesData) {
        return;
      }
      let estimatesData = this.props.estimatesData;
      let dataWithEstimates = estimatesData.estimateData.filter((item) =>
        item.originalEstimate != null &&
        item.timeSpent != null &&
        this.props.typesSelected.includes(item.type)
      );
      let pearsonCorrelation = this.getPearsonCorrelation(
        //@ts-ignore
        dataWithEstimates.map((item) => item.originalEstimate),
        //@ts-ignore
        dataWithEstimates.map((item) => item.timeSpent)
      );
      let notesElement = document.getElementById('notes');
      if (notesElement)
        notesElement.innerText = 'Correlation: ' + pearsonCorrelation;
      let googleBurnupDataArray = dataWithEstimates.map((item) => {
        //@ts-ignore
        let originalEstimateInHours = item.originalEstimate / 3600;
        //@ts-ignore
        let timeSpentInHours = item.timeSpent / 3600;
        return [
          originalEstimateInHours,
          timeSpentInHours,
          item.key +
            ' oe: ' +
            originalEstimateInHours +
            'h ts: ' +
            timeSpentInHours +
            'h',
        ];
      });

      var data = new google.visualization.DataTable();
      data.addColumn('number', 'Original Estimate');
      data.addColumn('number', 'Time Spent');
      data.addColumn({ role: 'tooltip', p: { html: true } });
      data.addRows(googleBurnupDataArray);
      console.log(googleBurnupDataArray);

      var options = {
        title: 'Estimates Analysis',
        curveType: 'function',
        legend: { position: 'bottom' },
        trendlines: {
          0: {
            type: 'linear',
            color: 'green',
            lineWidth: 3,
            opacity: 0.3,
            showR2: true,
            visibleInLegend: true,
          },
        },
      };

      // var chart = new google.charts.Scatter(
      //   document.getElementById('chart_div')
      // );
      var chart = new google.visualization.ScatterChart(
        document.getElementById('chart_div')
      );

      chart.draw(data, options);
    }
  }
  render() {
    return <div>Chart</div>;
  }
}
