import { defaultJiraJSON } from "../Jira.test";
import ThroughputGraphManager from "../../../src/server/graphManagers/ThroughputGraphManager";
import JiraRequester from "../../../src/server/JiraRequester";
import Jira from "../../../src/server/Jira";
import { SprintIssueList } from "../../../src/server/graphManagers/GraphManagerTypes";
jest.mock("../../../src/server/JiraRequester");

describe("ThroughputGraphManager", () => {
  let mockJiraRequester: JiraRequester;
  let mockJira: Jira;
  let mockJira2WeeksAgo: Jira;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    mockJira = new Jira(defaultJiraJSON);
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
  });

  it("should request the query from the Jirarequest", async () => {
    let tgm = new ThroughputGraphManager(mockJiraRequester);
    await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-31"),
      0
    );
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
      'project="Project 1" AND status="Done" AND resolved >= 2024-10-31'
    );
  });

  it("should request the data for all sprints", async () => {
    let tgm = new ThroughputGraphManager(mockJiraRequester);
    await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-31"),
      1
    );
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
      'project="Project 1" AND status="Done" AND resolved >= 2024-10-17'
    );

    await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-31"),
      2
    );
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
      'project="Project 1" AND status="Done" AND resolved >= 2024-10-03'
    );
  });

  it("should return the data in two week intervals", async () => {
    let tgm = new ThroughputGraphManager(mockJiraRequester);
    let result: SprintIssueList[] = await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-21T09:00:00.000Z"),
      1
    );
    expect(result[0].sprintStartingDate).toEqual(
      new Date("2024-10-21T09:00:00.000Z")
    );
    expect(result[1].sprintStartingDate).toEqual(
      new Date("2024-10-07T09:00:00.000Z")
    );
  });

  it('should return the initiativeKey and initiativeName as "Bug" if no initiative', async () => {
    let mockBugJira = new Jira({
      ...defaultJiraJSON,
      fields: { ...defaultJiraJSON.fields, issuetype: { name: "Bug" } },
    });
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockBugJira]);
    let tgm = new ThroughputGraphManager(mockJiraRequester);
    let result: SprintIssueList[] = await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-31"),
      0
    );
    expect(result[1].issueList[0].initiativeKey).toEqual("Bug");
    expect(result[1].issueList[0].initiativeName).toEqual("Bug");
  });

  it("should return the initiativeKey as EPIC:NOINITIATIVE when task has epic but not have initiative", async () => {
    let mockEpicJira = new Jira({
      ...defaultJiraJSON,
      fields: {
        ...defaultJiraJSON.fields,
        parent: {
          key: "EPIC-1",
          fields: { issuetype: { name: "Epic" }, summary: "Epic Name" },
        },
      },
    });
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockEpicJira]);
    let tgm = new ThroughputGraphManager(mockJiraRequester);
    let result: SprintIssueList[] = await tgm.getThroughputData(
      'project="Project 1"',
      new Date("2024-10-31"),
      0
    );
    expect(result[1].issueList[0].initiativeKey).toEqual("EPIC");
    expect(result[1].issueList[0].initiativeName).toEqual("NOINITIATIVE");
  });
});
