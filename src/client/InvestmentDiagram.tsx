import SankeyDiagram, { SankeyLink } from "./SankeyDiagram";
import { IssueInfo } from "../server/graphManagers/GraphManagerTypes";
import React from "react";
import { SankeyObject } from "./SankeyObject";
import Select from "./Select";
import { DefaultOptionType } from "antd/es/select";

interface Props {
  issues: IssueInfo[];
}
interface State {
  diagramSelected: string;
  selectedSplitBy: string;
  options: { value: string; label: string }[];
  optionsSelected: string[];
}

const splitByOptions: DefaultOptionType[] = [
  { value: "All", label: "All" },
  { value: "None", label: "None" },
  { value: "Initiative", label: "Initiative" },
  { value: "Labels", label: "Labels" },
];

export default class InvestmentDiagram extends React.Component<Props, State> {
  // startSankeyObject: SankeyObject;
  constructor(props) {
    super(props);
    this.state = {
      diagramSelected: "Start",
      selectedSplitBy: "All",
      options: [{ value: "All", label: "All" }],
      optionsSelected: ["All"],
    };
    // this.startSankeyObject = new SankeyObject(
    //   "Start",
    //   this.props.issues,
    //   "All"
    // );
  }

  componentDidUpdate(
    prevProps: Readonly<Props>,
    prevState: Readonly<State>,
    snapshot?: any
  ): void {
    if (prevProps.issues !== this.props.issues) {
      // this.startSankeyObject = new SankeyObject(
      //   "Start",
      //   this.props.issues,
      //   "All"
      // );
      // // let options = this.startSankeyObject.options.map((item) => {
      //   return { value: item, label: item };
      // });
      // this.setState({ options });
    }
  }

  objectSelected = (source: string) => {
    this.setState({ diagramSelected: source });
  };

  splitByChanged = (value: string) => {
    // let allSankeyObjects =
    //   this.startSankeyObject.getAllChildrenAndSelfRecursive();
    // let sankeyObjectSelected = allSankeyObjects.find(
    //   (item) => item.name === this.state.diagramSelected
    // );
    // if (sankeyObjectSelected) {
    //   sankeyObjectSelected.setSplitBy(value as any);
    //   let options = sankeyObjectSelected.options.map((item) => {
    //     return { value: item, label: item };
    //   });
    //   this.setState({ selectedSplitBy: value, options });
    // }
  };

  optionsSelectedChanged = (value: string[]) => {
    // let allSankeyObjects =
    //   this.startSankeyObject.getAllChildrenAndSelfRecursive();
    // let sankeyObjectSelected = allSankeyObjects.find(
    //   (item) => item.name === this.state.diagramSelected
    // );
    // if (sankeyObjectSelected) {
    //   sankeyObjectSelected.setSelectedOptions(value);
    // }
    // this.setState({ optionsSelected: value });
  };

  render() {
    // let links: SankeyLink[] = this.startSankeyObject.getLinks();
    // console.log("LINKS", links);
    return (
      <div>
        {this.state.diagramSelected}
        {/* <Select
          mode="single"
          options={splitByOptions}
          onChange={(value) => {
            this.splitByChanged(value as string);
          }}
        />
        <Select
          options={this.state.options}
          onChange={(value) => {
            this.optionsSelectedChanged(value as string[]);
          }}
        /> */}
        <SankeyObject
          name="Start"
          issues={this.props.issues}
          splitBy="All"
          splitSelected={["All"]}
        />

        {/* <SankeyDiagram
          links={links}
          onClick={(source) => {
            this.objectSelected(source);
          }}
        /> */}
      </div>
    );
  }
}
