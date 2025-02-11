import React from "react";
import { Select as AntSelect, Space } from "antd";
import type { SelectProps } from "antd";

interface Props {
  options: SelectProps["options"];
  onChange: (value: (string | number | null | undefined)[]) => void;
  mode?: "multiple" | "single";
  selected?: (string | number | null | undefined)[];
}
interface State {
  optionsSelected: (string | number | null | undefined)[];
}

export default class Select extends React.Component<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      optionsSelected:
        this.props.selected || props.options.map((item) => item.value),
    };
  }
  componentDidUpdate(prevProps: Props) {
    if (prevProps.options !== this.props.options) {
      let options = this.props.options
        ? this.props.options.map((item) => item.value)
        : [];
      this.setState({
        optionsSelected: options,
      });
      this.handleChange(options);
    }
  }
  handleChange = (value: (string | number | null | undefined)[]) => {
    this.props.onChange(value);
    this.setState({
      optionsSelected: value,
    });
  };
  render() {
    return (
      <AntSelect
        mode={this.props.mode ? undefined : "multiple"}
        allowClear
        style={{ width: "100%" }}
        placeholder="Please select"
        value={this.state.optionsSelected}
        onChange={this.handleChange}
        options={this.props.options}
      />
    );
  }
}
