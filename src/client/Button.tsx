import React from 'react';

interface Props {};
interface State {
  input: string;
};

class Button extends React.Component<Props, State> {
  state: { input: string; }; //Remove when TS is fixed.
  setState: any; //Remove when TS is fixed.
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.state = {
      input: 'AF-15921',
    };
  }
  onClick() {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch('/api/epicBurnup?epicIssueKey=' + this.state.input)
      .then((response) => response.json())
      .then((data) => console.log(data));
  }
  render() {
    return (
      <div>
        <input
          type="text"
          value={this.state.input}
          onChange={(e) => {
            console.log('Input changed');
            this.setState({ input: e.target.value });
          }}
        />
        <button onClick={this.onClick}>Click me</button>
      </div>
    );
  }
}

export { Button };
