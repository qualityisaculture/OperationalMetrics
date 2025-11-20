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
        this.props.selected !== undefined
          ? this.props.selected
          : props.options.map((item) => item.value),
    };
  }
  componentDidUpdate(prevProps: Props) {
    if (prevProps.options !== this.props.options) {
      // If selected prop is provided, use it; otherwise select all options
      if (this.props.selected !== undefined) {
        this.setState({
          optionsSelected: this.props.selected,
        });
        // Only call onChange if the selected value is different from current state
        if (
          JSON.stringify(this.state.optionsSelected) !==
          JSON.stringify(this.props.selected)
        ) {
          this.handleChange(this.props.selected);
        }
      } else {
        let options = this.props.options
          ? this.props.options.map((item) => item.value)
          : [];
        this.setState({
          optionsSelected: options,
        });
        this.handleChange(options);
      }
    }
    // Sync with selected prop if it's provided and changed
    if (
      this.props.selected !== undefined &&
      prevProps.selected !== this.props.selected
    ) {
      this.setState({
        optionsSelected: this.props.selected,
      });
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
