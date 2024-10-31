import React from 'react';
import { Select as AntSelect, Space } from 'antd';
import type { SelectProps } from 'antd';

interface Props {
  options: string[];
  onChange: (value: string[]) => void;
}
interface State {
  optionsSelected: string[];
}

export default class Select extends React.Component<Props, State> {
  props: Props; //Remove when TS is fixed.
  state: State; //Remove when TS is fixed.
  setState: any; //Remove when TS is fixed.
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {
      optionsSelected: this.props.options
    };
  }
  componentDidUpdate(prevProps: Props) {
    if (prevProps.options !== this.props.options) {
      this.setState({ optionsSelected: this.props.options });
    }
  }
  handleChange(value: string[]) {
    this.setState({ optionsSelected: value });
    this.props.onChange(value);
  }
  render() {
    const options: SelectProps['options'] = [];
    this.props.options.forEach((state) => {
      options.push({ label: state, value: state });
    });
    return (
      <AntSelect
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Please select"
        value={this.state.optionsSelected}
        defaultValue={this.state.optionsSelected}
        onChange={this.handleChange.bind(this)}
        options={options}
      />
    );
  }
}
