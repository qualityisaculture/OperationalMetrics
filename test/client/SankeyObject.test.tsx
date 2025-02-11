import React from "react";
import { render, screen } from "@testing-library/react";
import { SankeyObject } from "../../src/client/SankeyObject";
import { IssueInfo } from "../../src/server/graphManagers/GraphManagerTypes";

function getIssueInfos(numberOfIssues: number) {
  let issueInfos: IssueInfo[] = [];
  for (let i = 0; i < numberOfIssues; i++) {
    issueInfos.push({
      key: `KEY-${i}`,
      summary: `Summary-${i}`,
      status: `Status-${i}`,
      type: `Type-${i}`,
      created: `Created-${i}`,
      resolved: `Resolved-${i}`,
      resolution: `Resolution-${i}`,
      epicKey: `EpicKey-${i}`,
      epicName: `EpicName-${i}`,
      initiativeKey: `InitiativeKey-${i}`,
      initiativeName: `InitiativeName-${i}`,
      labels: [`Label-${i}`],
      priority: `Priority-${i}`,
      components: [`Component-${i}`],
      fixVersions: [`FixVersion-${i}`],
      url: `URL-${i}`,
      timeoriginalestimate: i,
      timespent: i,
    });
  }
  return issueInfos;
}
describe("InvestmentDiagram", () => {
  describe("All", () => {
    it("displays the key, summary, daysInStatuses and daysBooked", () => {
      let issueInfo: IssueInfo[] = getIssueInfos(2);
      const { getByText } = render(
        <SankeyObject
          name="Start"
          issues={issueInfo}
          splitBy="All"
          splitSelected={[]}
        />
      );
      expect(getByText("All")).toBeTruthy();
    });
  });

  describe("Initiative", () => {
    let issueInfo: IssueInfo[];
    beforeEach(() => {
      issueInfo = getIssueInfos(5);
      issueInfo[0].initiativeKey = "InitiativeKey-1";
      issueInfo[1].initiativeKey = "InitiativeKey-1";
      issueInfo[2].initiativeKey = "InitiativeKey-2";
      issueInfo[3].initiativeKey = "InitiativeKey-2";
      issueInfo[4].initiativeKey = "InitiativeKey-3";
    });

    it.only("should set options based on initiatives", () => {
      // let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      // expect(sankeyObject.options.length).toBe(3);
      // expect(sankeyObject.options[0]).toBe("InitiativeKey-1");
      // expect(sankeyObject.options[1]).toBe("InitiativeKey-2");
      // expect(sankeyObject.options[2]).toBe("InitiaticveKey-3");

      //get a select from the sankey object
      //set the selected options
      let { getByText, getByRole } = render(
        <SankeyObject
          name="Start"
          issues={issueInfo}
          splitBy="Initiative"
          splitSelected={[]}
        />
      );
      let dropdown = getByRole("combobox");
      expect(dropdown).toBeTruthy();
      //expect combobox to have 3 options
      expect(dropdown.children.length).toBe(3);
    });

    it("should put all initiatives into 'Other' if no optionsSelected", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(1);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
    });

    it("should split by initiative optionsSelected", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(1);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
      sankeyObject.setSelectedOptions(["InitiativeKey-1"]);
      links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
      expect(links[0].label).toBe("InitiativeKey-1");
      expect(links[0].value).toBe(1);
      expect(links[1].label).toBe("Other");
      expect(links[1].value).toBe(9);
    });

    it("should split by initiatives optionsSelected", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(1);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
      sankeyObject.setSelectedOptions(["InitiativeKey-1", "InitiativeKey-2"]);
      links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
      expect(links[0].label).toBe("InitiativeKey-1,InitiativeKey-2");
      expect(links[0].value).toBe(6);
      expect(links[1].label).toBe("Other");
      expect(links[1].value).toBe(4);
    });
  });

  describe("Labels", () => {
    let issueInfo: IssueInfo[];
    beforeEach(() => {
      issueInfo = getIssueInfos(5);
      issueInfo[0].labels = ["Label-1"];
      issueInfo[1].labels = ["Label-1"];
      issueInfo[2].labels = ["Label-2"];
      issueInfo[3].labels = ["Label-2"];
      issueInfo[4].labels = ["Label-3"];
    });

    it("should set options based on labels", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Labels");
      expect(sankeyObject.options.length).toBe(3);
      expect(sankeyObject.options[0]).toBe("Label-1");
      expect(sankeyObject.options[1]).toBe("Label-2");
      expect(sankeyObject.options[2]).toBe("Label-3");
    });
    it("should put all issues in other", () => {
      let issueInfo: IssueInfo[] = getIssueInfos(5);
      issueInfo[0].labels = ["Label-1"];
      issueInfo[1].labels = ["Label-1"];
      issueInfo[2].labels = ["Label-2"];
      issueInfo[3].labels = ["Label-2"];
      issueInfo[4].labels = ["Label-3"];
      let sankeyObject = new SankeyObject("Start", issueInfo, "Labels");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(1);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
    });

    it("should select issues for label selected", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Labels");
      sankeyObject.setSelectedOptions(["Label-1"]);
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
      expect(links[0].label).toBe("Label-1");
      expect(links[0].value).toBe(1);
      expect(links[1].label).toBe("Other");
      expect(links[1].value).toBe(9);
    });

    it("should select issues for labels selected", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Labels");
      sankeyObject.setSelectedOptions(["Label-1", "Label-2"]);
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
      expect(links[0].label).toBe("Label-1,Label-2");
      expect(links[0].value).toBe(6);
      expect(links[1].label).toBe("Other");
      expect(links[1].value).toBe(4);
    });
  });

  describe("getAllChildrenRecursive", () => {
    let issueInfo: IssueInfo[];
    beforeEach(() => {
      issueInfo = getIssueInfos(5);
      issueInfo[0].initiativeKey = "InitiativeKey-1";
      issueInfo[1].initiativeKey = "InitiativeKey-1";
      issueInfo[2].initiativeKey = "InitiativeKey-2";
      issueInfo[3].initiativeKey = "InitiativeKey-2";
      issueInfo[4].initiativeKey = "InitiativeKey-3";
    });
    it("should return just itselft and own children when children are childless", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      let children = sankeyObject.getAllChildrenAndSelfRecursive();
      expect(children.length).toBe(2);
      expect(children[0].props.name).toBe("Start");
      expect(children[1].props.name).toBe("Other");
    });

    it("should return its children and their children", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      sankeyObject.children[0].setSplitBy("All");
      let children = sankeyObject.getAllChildrenAndSelfRecursive();
      expect(children.length).toBe(3);
      expect(children[0].props.name).toBe("Start");
      expect(children[1].props.name).toBe("Other");
      expect(children[2].props.name).toBe("All");
    });
  });

  describe("setSelectedOptions", () => {
    let issueInfo: IssueInfo[];
    beforeEach(() => {
      issueInfo = getIssueInfos(5);
      issueInfo[0].initiativeKey = "InitiativeKey-1";
      issueInfo[1].initiativeKey = "InitiativeKey-1";
      issueInfo[2].initiativeKey = "InitiativeKey-2";
      issueInfo[3].initiativeKey = "InitiativeKey-2";
      issueInfo[4].initiativeKey = "InitiativeKey-3";
    });
    it("should set the selected options", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      expect(sankeyObject.getLinks().length).toBe(1);
      sankeyObject.setSelectedOptions(["InitiativeKey-1"]);
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
    });
  });

  describe("getLinks", () => {
    let issueInfo: IssueInfo[];
    beforeEach(() => {
      issueInfo = getIssueInfos(5);
      issueInfo[0].initiativeKey = "InitiativeKey-1";
      issueInfo[1].initiativeKey = "InitiativeKey-1";
      issueInfo[2].initiativeKey = "InitiativeKey-2";
      issueInfo[3].initiativeKey = "InitiativeKey-2";
      issueInfo[4].initiativeKey = "InitiativeKey-3";
    });
    it("should return just 1 link to Other if no children", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(1);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
    });

    it("should return the links between its children and grandchildren", () => {
      let sankeyObject = new SankeyObject("Start", issueInfo, "Initiative");
      sankeyObject.children[0].setSplitBy("All");
      let links = sankeyObject.getLinks();
      expect(links.length).toBe(2);
      expect(links[0].label).toBe("Other");
      expect(links[0].value).toBe(10);
      expect(links[1].label).toBe("All");
      expect(links[1].value).toBe(10);
    });
  });
});
