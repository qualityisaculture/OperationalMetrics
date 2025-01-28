import JiraRequester from "../../../src/server/JiraRequester";
import Jira from "../../../src/server/Jira";
import TimeInDevManager from "../../../src/server/graphManagers/TimeInDevManager";
import { defaultJiraJSON } from "../Jira.test";
jest.mock("../../../src/server/JiraRequester");

describe("TimeInDevManager", () => {
  let mockJiraRequester: JiraRequester;
  let timeInDevManager: TimeInDevManager;
  let mockJira, mockJira2: Jira;
  beforeEach(() => {
    mockJiraRequester = new JiraRequester();
    timeInDevManager = new TimeInDevManager(mockJiraRequester);
    mockJira = new Jira(defaultJiraJSON);
    mockJira2 = new Jira({ ...defaultJiraJSON, key: "KEY-2" });
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
  });
  it("should request request query", async () => {
    const result = await timeInDevManager.getTimeInDevData("query");
    expect(mockJiraRequester.getQuery).toHaveBeenCalledWith("query");
  });

  it("should return array of Jiras", async () => {
    mockJiraRequester.getQuery = jest
      .fn()
      .mockResolvedValue([mockJira, mockJira2]);
    const result = await timeInDevManager.getTimeInDevData("query");
    expect(result.length).toBe(2);
    expect(result[0].key).toBe("KEY-1");
    expect(result[1].key).toBe("KEY-2");
  });

  it("should return the timespent field", async () => {
    mockJira.fields.timespent = 100;
    const result = await timeInDevManager.getTimeInDevData("query");
    expect(result[0].timespent).toBe(100);
  });
  it("should return 0 if timespent is not defined", async () => {
    mockJira.fields.timespent = undefined;
    const result = await timeInDevManager.getTimeInDevData("query");
    expect(result[0].timespent).toBe(0);
  });

  it("should return the time spent in each status", async () => {
    mockJira.getStatusDays = jest.fn().mockReturnValue([
      { status: "status1", days: 100 },
      { status: "status2", days: 200 },
    ]);
    const result = await timeInDevManager.getTimeInDevData("query");
    expect(result[0].statuses.length).toBe(2);
    expect(result[0].statuses[0].status).toBe("status1");
    expect(result[0].statuses[0].days).toBe(100);
    expect(result[0].statuses[1].status).toBe("status2");
    expect(result[0].statuses[1].days).toBe(200);
  });
});
