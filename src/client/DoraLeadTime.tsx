import React from "react";

type State = {
  projectName: string;
};

export default class DoraLeadTime extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = {
      projectName: "",
    };
  }

  handleClick = async () => {
    try {
      const response = await fetch(
        `/api/doraLeadTime?projectName=${this.state.projectName}`
      );
      const data = await response.json();
      console.log(JSON.parse(data.data));
    } catch (error) {
      console.error("Error fetching Dora lead time:", error);
    }
  };

  handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ projectName: e.target.value });
  };

  render() {
    return (
      <div>
        <input
          type="text"
          value={this.state.projectName}
          onChange={this.handleChange}
          placeholder="Enter Project Name"
        />
        <button onClick={this.handleClick}>Fetch Dora Lead Time</button>
      </div>
    );
  }
}
