import React from 'react';
import { Select as AntSelect, Space } from 'antd';
import type { SelectProps } from 'antd';

interface Props {
  options: SelectProps['options'];
  onChange: (value: string[]) => void;
}
interface State {
  optionsSelected: string[];
}

export default class Select extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    // this.state = {
    //   optionsSelected: props.options.map((item) => item.value)
    // };
  }
  componentDidUpdate(prevProps: Props) {
    if (prevProps.options !== this.props.options) {
    }
  }
  handleChange = (value: string[]) => {
    this.props.onChange(value);
  }
  render() {
    return (
      <AntSelect
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Please select"
        defaultValue={this.props.options ? this.props.options.map((item) => item.value) : []}
        // value={this.state.optionsSelected}
        onChange={this.handleChange}
        options={this.props.options}
      />
    );
  }
}
