import DoraLeadTimeForChanges from "../../../src/server/graphManagers/DoraLeadTimeForChanges";
import JiraRequester from "../../../src/server/JiraRequester";
import Jira from "../../../src/server/Jira";
import { defaultJiraJSON } from "../Jira.test";
jest.mock("../../../src/server/JiraRequester");
import { Releases } from "../../../src/server/graphManagers/DoraLeadTimeForChanges";

describe("DoraLeadTimeForChanges", () => {
  let mockJiraRequester: JiraRequester;
  let doraLeadTimeForChanges: DoraLeadTimeForChanges;
  let mockJira: Jira;

  beforeEach(() => {
    mockJiraRequester = new JiraRequester();
    doraLeadTimeForChanges = new DoraLeadTimeForChanges(mockJiraRequester);
    mockJira = new Jira(defaultJiraJSON);
    mockJiraRequester.getQuery = jest.fn().mockResolvedValue([mockJira]);
  });

  it("should request the last X released releases from Jira", async () => {
    // ...test implementation...
  });

  it("should get all the Jiras from those releases", async () => {
    // ...test implementation...
  });

  it("should get the required Jira data", async () => {
    // ...test implementation...
  });

  it("should request the last 10 releases and their Jira data, returning an array of releases with a list of Jira keys, resolution dates, and Dora lead time included per release", async () => {
    const releases = [
      { id: "1", name: "Release 1", releaseDate: "2024-10-21T09:00:00.000+0100" },
      { id: "2", name: "Release 2", releaseDate: "2024-10-22T09:00:00.000+0100" },
      // ...more releases...
    ];
    const keys = [
      { key: "KEY-1" },
      { key: "KEY-2" },
      // ...more keys...
    ];
    const jiraData = [
      {
        key: "KEY-1",
        fields: {
          fixVersions: [{ name: "Release 1" }],
          summary: "Summary 1",
          resolutiondate: "2024-10-20T09:00:00.000+0100",
        },
      },
      {
        key: "KEY-2",
        fields: {
          fixVersions: [{ name: "Release 2" }],
          summary: "Summary 2",
          resolutiondate: "2024-10-21T09:00:00.000+0100",
        },
      },
      // ...more jira data...
    ];
    mockJiraRequester.getReleasesFromProject = jest
      .fn()
      .mockResolvedValue(releases);
    mockJiraRequester.getJiraKeysInQuery = jest.fn().mockResolvedValue(keys);
    mockJiraRequester.getEssentialJiraDataFromKeys = jest
      .fn()
      .mockResolvedValue(jiraData);

    const result = await doraLeadTimeForChanges.getDoraLeadTime("TEST");

    expect(mockJiraRequester.getReleasesFromProject).toHaveBeenCalledWith(
      "TEST",
      10
    );
    expect(mockJiraRequester.getJiraKeysInQuery).toHaveBeenCalledWith(
      'project="TEST" AND fixVersion="Release 1" OR project="TEST" AND fixVersion="Release 2"'
    );
    expect(mockJiraRequester.getEssentialJiraDataFromKeys).toHaveBeenCalledWith(
      ["KEY-1", "KEY-2"]
    );
    expect(result).toEqual([
      { release: "Release 1", resolvedDate: "2024-10-21T09:00:00.000+0100", jiras: [{ key: "KEY-1", resolutiondate: "2024-10-20T09:00:00.000+0100" }], doraLeadTime: 1 },
      { release: "Release 2", resolvedDate: "2024-10-22T09:00:00.000+0100", jiras: [{ key: "KEY-2", resolutiondate: "2024-10-21T09:00:00.000+0100" }], doraLeadTime: 1 },
    ]);
  });
});

describe("calculateDoraLeadTime", () => {
  let doraLeadTimeForChanges: DoraLeadTimeForChanges;

  beforeEach(() => {
    const mockJiraRequester = new JiraRequester();
    doraLeadTimeForChanges = new DoraLeadTimeForChanges(mockJiraRequester);
  });

  it("should calculate the average lead time correctly", () => {
    const releaseDate = "2024-10-21T09:00:00.000+0100";
    const resolvedDates = [
      "2024-10-20T09:00:00.000+0100",
      "2024-10-19T09:00:00.000+0100",
    ];
    const result = doraLeadTimeForChanges.calculateDoraLeadTime(
      releaseDate,
      resolvedDates
    );
    expect(result).toBe(1.5);
  });

  it("should ignore Jira resolution dates after the release date", () => {
    const releaseDate = "2024-10-21T09:00:00.000+0100";
    const resolvedDates = [
      "2024-10-20T09:00:00.000+0100",
      "2024-10-22T09:00:00.000+0100",
    ];
    const result = doraLeadTimeForChanges.calculateDoraLeadTime(
      releaseDate,
      resolvedDates
    );
    expect(result).toBe(1);
  });

  it("should return 0 if all Jira resolution dates are after the release date", () => {
    const releaseDate = "2024-10-21T09:00:00.000+0100";
    const resolvedDates = [
      "2024-10-22T09:00:00.000+0100",
      "2024-10-23T09:00:00.000+0100",
    ];
    const result = doraLeadTimeForChanges.calculateDoraLeadTime(
      releaseDate,
      resolvedDates
    );
    expect(result).toBe(0);
  });
});
