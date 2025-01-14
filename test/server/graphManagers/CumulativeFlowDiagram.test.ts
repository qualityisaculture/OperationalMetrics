import CumulativeFlowDiagramManager from "../../../src/server/graphManagers/CumulativeFlowDiagramManager";
import Jira from "../../../src/server/Jira";
import JiraRequester from "../../../src/server/JiraRequester";
import { defaultJiraJSON } from "../Jira.test";

describe("CumulativeFlowDiagram", () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira, mockJira2: Jira;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJira = new Jira(defaultJiraJSON);
    mockJira2 = new Jira({ ...defaultJiraJSON, key: "KEY-2" });
    mockJiraRequester = new JiraRequester();
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
    process.env.JIRA_DOMAIN = "localhost:8080";
  });

  describe("getCumulativeFlowTimeline", () => {
    it("should request the query from the Jirarequest", async () => {
      let cfdm = new CumulativeFlowDiagramManager(mockJiraRequester);
      await cfdm.getCumulativeFlowDiagramTimeline(
        'project="Project 1"',
        new Date("2024-11-01"),
        new Date("2024-11-01")
      );
      expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
        'project="Project 1"'
      );
    });

    it("should request the state for each date", async () => {
      mockJira.getStatus = jest.fn().mockResolvedValue("To Do");
      let cfdm = new CumulativeFlowDiagramManager(mockJiraRequester);
      let result = await cfdm.getCumulativeFlowDiagramTimeline(
        'project="Project 1"',
        new Date("2024-11-01"),
        new Date("2024-11-03")
      );
      expect(mockJira.getStatus).toHaveBeenCalledTimes(3);
      expect(mockJira.getStatus).toHaveBeenCalledWith(new Date("2024-11-01"));
      expect(mockJira.getStatus).toHaveBeenCalledWith(new Date("2024-11-02"));
      expect(mockJira.getStatus).toHaveBeenCalledWith(new Date("2024-11-03"));
    });

    it("should return the jiras in their appropriate state", async () => {
      mockJira.getStatus = jest.fn().mockResolvedValue("To Do");
      mockJira2.getStatus = jest.fn().mockResolvedValue("In Progress");
      mockJiraRequester.getQuery = jest
        .fn()
        .mockResolvedValue([mockJira, mockJira2]);
      let cfdm = new CumulativeFlowDiagramManager(mockJiraRequester);
      let result = await cfdm.getCumulativeFlowDiagramTimeline(
        'project="Project 1"',
        new Date("2024-11-01"),
        new Date("2024-11-01")
      );
      expect(mockJira.getStatus).toHaveBeenCalledTimes(1);
      expect(mockJira2.getStatus).toHaveBeenCalledTimes(1);
      expect(result[0].statuses.length).toEqual(2);
      expect(result[0].date).toEqual(new Date("2024-11-01"));
      expect(result[0].statuses[0].status).toEqual("To Do");
      expect(result[0].statuses[0].issues[0].key).toEqual("KEY-1");
      expect(result[0].statuses[1].status).toEqual("In Progress");
      expect(result[0].statuses[1].issues[0].key).toEqual("KEY-2");
    });
  });

  describe("getCumulativeFlowDiagramData", () => {
    it("should return the data in the correct format", async () => {
      mockJira.getStatus = jest.fn().mockResolvedValue("To Do");
      mockJira2.getStatus = jest.fn().mockResolvedValue("In Progress");
      mockJiraRequester.getQuery = jest
        .fn()
        .mockResolvedValue([mockJira, mockJira2]);
      let cfdm = new CumulativeFlowDiagramManager(mockJiraRequester);
      let result = await cfdm.getCumulativeFlowDiagramData(
        'project="Project 1"',
        new Date("2024-11-01"),
        new Date("2024-11-01")
      );
      expect(result.allStatuses).toEqual(["To Do", "In Progress"]);
      expect(result.timeline.length).toEqual(1);
      expect(result.timeline[0].date).toEqual(new Date("2024-11-01"));
      expect(result.timeline[0].statuses.length).toEqual(2);
      expect(result.timeline[0].statuses[0].status).toEqual("To Do");
      expect(result.timeline[0].statuses[0].issues[0].key).toEqual("KEY-1");
      expect(result.timeline[0].statuses[1].status).toEqual("In Progress");
      expect(result.timeline[0].statuses[1].issues[0].key).toEqual("KEY-2");
    });
  });
});
