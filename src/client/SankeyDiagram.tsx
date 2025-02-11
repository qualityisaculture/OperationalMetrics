import React from "react";
const google = globalThis.google;

export type SankeyLink = {
  label: string;
  value: number;
  tooltip: string;
};

interface ChartProps {
  links: SankeyLink[];
  onClick: (source: string) => void;
}
interface ChartState {}
export default class SankeyDiagram extends React.Component<
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
      if (!this.props.links) {
        return;
      }
      this.drawChart();
    }
  }

  handleClick = (chart) => {
    var selection = chart.getSelection();
    this.props.onClick(selection[0].name);
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    data.addColumn("string", "From");
    data.addColumn("string", "To");
    data.addColumn("number", "Weight");
    data.addColumn({ type: "string", role: "tooltip" });
    data.addRows(
      this.props.links.map((item) => [
        item.label,
        item.label,
        item.value,
        item.tooltip,
      ])
    );

    // Set chart options
    var options = {
      width: 600,
      height: 400,
      sankey: {
        node: {
          interactivity: true,
        },
      },
    };

    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.Sankey(
      document.getElementById(this.randomId)
    );

    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handleClick(chart);
      }.bind(this)
    );
    chart.draw(data, options);
  }

  render(): React.ReactNode {
    return (
      <div>
        <div id={this.randomId}></div>
      </div>
    );
  }
}
