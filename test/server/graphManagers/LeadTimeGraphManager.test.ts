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

  it("should request the modified query from the Jirarequest with date filter", async () => {
    let ltm = new LeadTimeGraphManager(mockJiraRequester);
    await ltm.getLeadTimeData(
      'project="Project 1"',
      defaultCurrentSprinStartDate,
      defaultNumberOfSprints
    );
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith(
      'project="Project 1" AND status="Done" AND resolved >= 2024-09-23'
    );
  });

  it("should return the data in two week intervals", async () => {
    let ltm = new LeadTimeGraphManager(mockJiraRequester);
    let result = await ltm.getLeadTimeData(
      'project="Project 1"',
      defaultCurrentSprinStartDate,
      defaultNumberOfSprints
    );
    expect(result.sprints[0].sprintStartingDate).toEqual(
      new Date("2024-10-21T09:00:00.000Z")
    );
    expect(result.sprints[1].sprintStartingDate).toEqual(
      new Date("2024-10-07T09:00:00.000Z")
    );
  });
});
