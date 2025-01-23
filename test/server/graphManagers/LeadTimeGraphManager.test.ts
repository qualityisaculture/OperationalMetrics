import { IssueInfo } from "../../../src/server/graphManagers/GraphManagerTypes";
import LeadTimeGraphManager from "../../../src/server/graphManagers/LeadTimeGraphManager";
import Jira from "../../../src/server/Jira";
import JiraRequester from "../../../src/server/JiraRequester";
import { defaultJiraJSON } from "../Jira.test";
jest.mock("../../../src/server/JiraRequester");

describe("LeadTimeGraphManager", () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira, mockJira2: Jira, mockJira2WeeksAgo: Jira;
  let defaultCurrentSprinStartDate = new Date("2024-10-21T09:00:00.000Z");
  let defaultNumberOfSprints = 2;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJira = new Jira(defaultJiraJSON);
    mockJira2 = new Jira({ ...defaultJiraJSON, key: "KEY-2" });
    mockJira2WeeksAgo = new Jira({
      ...defaultJiraJSON,
      fields: {
        ...defaultJiraJSON.fields,
        resolutiondate: "2024-10-07T12:00:00.000Z",
      },
    });
    mockJiraRequester = new JiraRequester();
    mockJiraRequester.getQuery = jest
      .fn()
      .mockResolvedValue([mockJira, mockJira2WeeksAgo]);
    process.env.JIRA_DOMAIN = "localhost:8080";
  });

  it("should request the query from the Jirarequest", async () => {
    let ltm = new LeadTimeGraphManager(mockJiraRequester);
    await ltm.getLeadTimeData(
      'project="Project 1"',
      defaultCurrentSprinStartDate,
      defaultNumberOfSprints
    );
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
      'project="Project 1"'
    );
  });

  it("should return the data in two week intervals", async () => {
    let ltm = new LeadTimeGraphManager(mockJiraRequester);
    let result = await ltm.getLeadTimeData(
      'project="Project 1"',
      defaultCurrentSprinStartDate,
      defaultNumberOfSprints
    );
    console.log(result.sprints[0]);
    expect(result.sprints[0].sprintStartingDate).toEqual(
      new Date("2024-10-21T09:00:00.000Z")
    );
    expect(result.sprints[1].sprintStartingDate).toEqual(
      new Date("2024-10-07T09:00:00.000Z")
    );
  });

  describe("getIssueInfoBySizeBucket", () => {
    let mockIssueInfo: IssueInfo, mockIssueInfo2: IssueInfo;
    beforeEach(() => {
      mockIssueInfo = {
        key: "KEY-1",
        summary: "Summary",
        url: "localhost:8080/browse/KEY-1",
        timespent: 5,
        status: "Done",
        type: "Task",
        created: "2024-10-01T09:00:00.000Z",
        resolved: "2024-10-05T09:00:00.000Z",
        priority: "High",
        labels: ["label1"],
        components: ["component1"],
        resolution: "Done",
        epicKey: "Epic 1",
        epicName: "Epic 1",
        initiativeKey: "Initiative 1",
        initiativeName: "Initiative 1",
        fixVersions: ["fixVersion1"],
        timeoriginalestimate: 10,
      };
      mockIssueInfo2 = {
        key: "KEY-2",
        summary: "Summary",
        url: "localhost:8080/browse/KEY-2",
        timespent: 5,
        status: "Done",
        type: "Task",
        created: "2024-10-01T09:00:00.000Z",
        resolved: "2024-10-05T09:00:00.000Z",
        priority: "High",
        labels: ["label1"],
        components: ["component1"],
        resolution: "Done",
        epicKey: "Epic 1",
        epicName: "Epic 1",
        initiativeKey: "Initiative 1",
        initiativeName: "Initiative 1",
        fixVersions: ["fixVersion1"],
        timeoriginalestimate: 10,
      };
    });
    it("should return 11 empty buckets if no Jiras passed", () => {
      let ltm = new LeadTimeGraphManager(mockJiraRequester);
      let result = ltm.getIssueInfoBySizeBucket([]);
      expect(result.length).toEqual(11);
      expect(result[0].timeSpentInDays).toEqual(0);
      expect(result[0].label).toEqual("null");
      expect(result[0].issues).toEqual([]);
      expect(result[1].timeSpentInDays).toEqual(1);
      expect(result[1].label).toEqual("1 day");
      expect(result[1].issues).toEqual([]);
      expect(result[9].timeSpentInDays).toEqual(9);
      expect(result[9].label).toEqual("9 days");
      expect(result[9].issues).toEqual([]);
      expect(result[10].timeSpentInDays).toEqual(10);
      expect(result[10].label).toEqual("10+ days");
      expect(result[10].issues).toEqual([]);
    });

    it("should return IssueInfo with no time spent in the 0 bucket", () => {
      let ltm = new LeadTimeGraphManager(mockJiraRequester);
      mockIssueInfo.timespent = null;
      let result = ltm.getIssueInfoBySizeBucket([mockIssueInfo]);
      expect(result.length).toEqual(11);
      expect(result[0].timeSpentInDays).toEqual(0);
      expect(result[0].label).toEqual("null");
      expect(result[0].issues).toEqual([
        {
          key: "KEY-1",
          summary: "Summary",
          url: "localhost:8080/browse/KEY-1",
        },
      ]);
    });

    it("should return jiras in the single bucket they are smaller than", () => {
      let ltm = new LeadTimeGraphManager(mockJiraRequester);
      mockIssueInfo.timespent = 0.5;
      let result = ltm.getIssueInfoBySizeBucket([mockIssueInfo]);
      expect(result.length).toEqual(11);
      expect(result[1].timeSpentInDays).toEqual(1);
      expect(result[1].label).toEqual("1 day");
      expect(result[1].issues).toEqual([
        {
          key: "KEY-1",
          summary: "Summary",
          url: "localhost:8080/browse/KEY-1",
        },
      ]);
      expect(result[10].timeSpentInDays).toEqual(10);
      expect(result[10].label).toEqual("10+ days");
      expect(result[10].issues).toEqual([]);
    });

    it("should return jiras greater than size 9 in the 10+ bucket", () => {
      let ltm = new LeadTimeGraphManager(mockJiraRequester);
      mockIssueInfo.timespent = 10;
      mockIssueInfo2.timespent = 11;
      let result = ltm.getIssueInfoBySizeBucket([
        mockIssueInfo,
        mockIssueInfo2,
      ]);
      expect(result.length).toEqual(11);
      expect(result[1].timeSpentInDays).toEqual(1);
      expect(result[1].label).toEqual("1 day");
      expect(result[1].issues).toEqual([]);
      expect(result[10].timeSpentInDays).toEqual(10);
      expect(result[10].label).toEqual("10+ days");
      expect(result[10].issues).toEqual([
        {
          key: "KEY-1",
          summary: "Summary",
          url: "localhost:8080/browse/KEY-1",
        },
        {
          key: "KEY-2",
          summary: "Summary",
          url: "localhost:8080/browse/KEY-2",
        },
      ]);
    });
  });
});
