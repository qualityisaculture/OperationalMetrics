import React from "react";
const google = globalThis.google;

export type GoogleDataTableType = {
  data: [
    Date,
    number | null, // doneDev
    number | null, // inProgressDev
    number | null, // scopeDev
    string | null, // annotation
    string | null, // annotationHover
    number | null, // doneTest
    number | null, // inProgressTest
    number | null, // scopeTest
    number | null, // timeSpent
  ];
  clickData?: string;
};

interface ChartProps {
  burnupDataArray: GoogleDataTableType[];
  labels?: {
    doneDev?: string;
    inProgressDev?: string;
    scopeDev?: string;
    doneTest?: string;
    inProgressTest?: string;
    scopeTest?: string;
    timeSpent?: string;
    doneTrend?: string;
    scopeTrend?: string;
  };
}

const DEFAULT_LABELS = {
  doneDev: "Done Dev",
  inProgressDev: "In Progress or Done Dev",
  scopeDev: "Scope Dev",
  doneTest: "Done Test",
  inProgressTest: "In Progress or Done Test",
  scopeTest: "Scope Test",
  timeSpent: "Time Spent",
  doneTrend: "Done Trend",
  scopeTrend: "Scope Trend",
};

interface ChartState {
  clickedPoints: { date: Date; value: number; type: "done" | "scope" }[];
  doneTrendLineData: (number | null)[];
  scopeTrendLineData: (number | null)[];
  clickData: string;
}

export default class LineChart extends React.Component<ChartProps, ChartState> {
  randomId: string;
  constructor(props) {
    super(props);
    this.randomId = Math.random().toString(36).substring(7);
    this.state = {
      clickedPoints: [],
      doneTrendLineData: [],
      scopeTrendLineData: [],
      clickData: "",
    };
  }

  updateTrendLines = () => {
    const donePoints = this.state.clickedPoints.filter(
      (p) => p.type === "done"
    );
    const scopePoints = this.state.clickedPoints.filter(
      (p) => p.type === "scope"
    );

    const newState: Pick<
      ChartState,
      "doneTrendLineData" | "scopeTrendLineData"
    > = {
      doneTrendLineData: [],
      scopeTrendLineData: [],
    };

    if (donePoints.length === 2) {
      newState.doneTrendLineData = this.calculateTrendLine(
        donePoints[0],
        donePoints[1]
      );
    }

    if (scopePoints.length === 2) {
      newState.scopeTrendLineData = this.calculateTrendLine(
        scopePoints[0],
        scopePoints[1]
      );
    }

    this.setState(newState);
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.burnupDataArray !== this.props.burnupDataArray) {
      if (!this.props.burnupDataArray) {
        return;
      }
      this.updateTrendLines();
      this.drawChart();
    } else if (
      prevState.doneTrendLineData !== this.state.doneTrendLineData ||
      prevState.scopeTrendLineData !== this.state.scopeTrendLineData
    ) {
      if (!this.props.burnupDataArray) {
        return;
      }
      this.drawChart();
    }
  }

  componentDidMount() {
    if (this.props.burnupDataArray && this.props.burnupDataArray.length > 0) {
      this.drawChart();
    }
  }

  calculateTrendLine = (
    point1: { date: Date; value: number },
    point2: { date: Date; value: number }
  ) => {
    const { burnupDataArray } = this.props;
    const [startDate, endDate] = [point1.date, point2.date].sort(
      (a, b) => a.getTime() - b.getTime()
    );
    const [startValue, endValue] =
      startDate === point1.date
        ? [point1.value, point2.value]
        : [point2.value, point1.value];

    const timeDiff = endDate.getTime() - startDate.getTime();
    const valueDiff = endValue - startValue;
    const slope = valueDiff / timeDiff;

    return burnupDataArray.map((dataPoint) => {
      const [
        date,
        doneDev,
        inProgressDev,
        scopeDev,
        doneTest,
        inProgressTest,
        scopeTest,
        timeSpent,
      ] = dataPoint.data;
      const dateTime = date.getTime();
      const startDateTime = startDate.getTime();

      if (dateTime < startDateTime) return null;

      const timeFromStart = dateTime - startDateTime;
      const trendValue = startValue + slope * timeFromStart;

      if (trendValue < 0) return null;

      return trendValue;
    });
  };

  handleColumnClick = (chart) => {
    var selection = chart.getSelection();
    if (selection.length === 0) return;

    const row = selection[0].row;
    const column = selection[0].column;
    const dataPoint = this.props.burnupDataArray[row];
    const [
      date,
      doneDev,
      inProgressDev,
      scopeDev,
      doneTest,
      inProgressTest,
      scopeTest,
      timeSpent,
    ] = dataPoint.data;

    // Clear trend line if clicking on one
    if (column === 5) {
      // Done trend line
      this.setState({
        clickedPoints: this.state.clickedPoints.filter(
          (p) => p.type !== "done"
        ),
        doneTrendLineData: [],
        clickData: "Cleared Done trend line",
      });
      return;
    }
    if (column === 6) {
      // Scope trend line
      this.setState({
        clickedPoints: this.state.clickedPoints.filter(
          (p) => p.type !== "scope"
        ),
        scopeTrendLineData: [],
        clickData: "Cleared Scope trend line",
      });
      return;
    }

    // Handle clicks on main lines
    let value: number | null = null;
    let type: "done" | "scope" | null = null;

    if (column === 1) {
      value = doneDev;
      type = "done";
    } else if (column === 3) {
      value = scopeDev;
      type = "scope";
    }

    if (value === null || type === null) return;

    // Get existing points of the same type
    const existingPoints = this.state.clickedPoints.filter(
      (p) => p.type === type
    );

    // If we already have 2 points, clear them and start fresh
    if (existingPoints.length === 2) {
      const otherTypePoints = this.state.clickedPoints.filter(
        (p) => p.type !== type
      );
      this.setState({
        clickedPoints: [...otherTypePoints, { date, value, type }],
      });
      return;
    }

    // Add the new point to existing points
    const newClickedPoints = [
      ...this.state.clickedPoints,
      { date, value, type },
    ];

    // If we now have exactly 2 points of this type, draw the trend line
    const updatedTypePoints = newClickedPoints.filter((p) => p.type === type);
    if (updatedTypePoints.length === 2) {
      const trendLineData = this.calculateTrendLine(
        updatedTypePoints[0],
        updatedTypePoints[1]
      );
      this.setState({
        clickedPoints: newClickedPoints,
        doneTrendLineData:
          type === "done" ? trendLineData : this.state.doneTrendLineData,
        scopeTrendLineData:
          type === "scope" ? trendLineData : this.state.scopeTrendLineData,
      });
    } else {
      // Just update clicked points if we don't have 2 points yet
      this.setState({ clickedPoints: newClickedPoints });
    }

    let clickData: string = dataPoint.clickData as string;
    this.setState({ clickData });
  };

  drawChart() {
    var data = new google.visualization.DataTable();
    const labels = { ...DEFAULT_LABELS, ...this.props.labels };
    data.addColumn("date", "Date");
    data.addColumn("number", labels.doneDev);
    data.addColumn("number", labels.inProgressDev);
    data.addColumn("number", labels.scopeDev);
    data.addColumn({ type: "string", role: "annotation" });
    data.addColumn({
      type: "string",
      role: "annotationText",
      p: { html: true },
    });
    data.addColumn("number", labels.doneTest);
    data.addColumn("number", labels.inProgressTest);
    data.addColumn("number", labels.scopeTest);
    data.addColumn("number", labels.timeSpent);

    // Add trend lines after main lines
    if (this.state.doneTrendLineData.length > 0) {
      data.addColumn("number", labels.doneTrend);
    }
    if (this.state.scopeTrendLineData.length > 0) {
      data.addColumn("number", labels.scopeTrend);
    }

    const rows = this.props.burnupDataArray.map((item, index) => {
      const row = [...item.data];
      if (this.state.doneTrendLineData.length > 0) {
        row.push(this.state.doneTrendLineData[index]);
      }
      if (this.state.scopeTrendLineData.length > 0) {
        row.push(this.state.scopeTrendLineData[index]);
      }
      return row;
    });

    data.addRows(rows);

    const options = {
      title: "Issue Burnup",
      legend: { position: "bottom" },
      series: {
        0: { color: "blue" }, // Done Dev (always blue)
        1: { color: "lightblue" }, // In Progress Dev
        2: { color: "green" }, // Scope Dev (always green)
        3: { color: "purple" }, // Done Test
        4: { color: "plum" }, // In Progress Test
        5: { color: "orange" }, // Scope Test
        6: { color: "red", targetAxisIndex: 1 }, // Time Spent (always red)
        7: { color: "blue", lineDashStyle: [4, 4] }, // Done Trend
        8: { color: "green", lineDashStyle: [4, 4] }, // Scope Trend
      },
      vAxes: {
        0: { title: "Story Points" },
        1: { title: "Time Spent (days)" },
      },
      hAxis: {
        title: "Date",
        format: "MMM d",
      },
      tooltip: { isHtml: true },
      chartArea: { width: "80%", height: "70%" },
      width: "100%",
      height: 400,
    };

    var chart = new google.visualization.LineChart(
      document.getElementById(this.randomId)
    );
    google.visualization.events.addListener(
      chart,
      "select",
      function () {
        this.handleColumnClick(chart);
      }.bind(this)
    );

    chart.draw(data, options);
  }

  render(): React.ReactNode {
    return (
      <div>
        <div id={this.randomId}></div>
        {this.state.clickedPoints.length === 1 && (
          <div>Click another point to draw a trend line</div>
        )}
        {this.state.clickData && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
            dangerouslySetInnerHTML={{ __html: this.state.clickData }}
          />
        )}
      </div>
    );
  }
}
