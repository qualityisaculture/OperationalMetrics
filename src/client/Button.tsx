import React from 'react';

class Button extends React.Component {
  onClick() {
    console.log('Button clicked');
    //Request to the server /api/metrics
    fetch('/api/metrics')
      .then(response => response.json())
      .then(data => console.log(data));
  }
  render() {
    return <button onClick={this.onClick}>Click me</button>;
  }
}

export { Button };
