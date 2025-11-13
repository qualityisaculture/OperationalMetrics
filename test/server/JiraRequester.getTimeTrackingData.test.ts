import JiraRequester from "../../src/server/JiraRequester";
import * as fs from "fs";
import * as path from "path";

const jiraResponseData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "test-data", "jira-response-with-histories.json"),
    "utf-8"
  )
);

const jiraResponseData2 = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "test-data", "jira-response-with-histories2.json"),
    "utf-8"
  )
);

describe("JiraRequester.extractLatestWorklogTimespent", () => {
  let jr: JiraRequester;

  beforeEach(() => {
    jr = new JiraRequester();
  });

  it("should extract 3h 30 minutes for 2025-09-22", () => {
    const histories = jiraResponseData.issues[0].changelog.histories;
    const result = jr.extractLatestWorklogTimespent(histories);
    console.log(result);

    // Find the entry for 2025-09-22
    const entryFor20250922 = result.find(
      (entry) => entry.date === "2025-09-22"
    );

    expect(entryFor20250922).toBeDefined();

    // 3h 30 minutes = 3.5 hours = 210 minutes = 12600 seconds
    const expectedSeconds = 2.5 * 60 * 60; // 12600 seconds

    expect(entryFor20250922!.timeSpent).toBe(expectedSeconds);
  });

  it("should extract -45 minutes for 2025-08-21", () => {
    const histories = jiraResponseData2.issues[0].changelog.histories;
    const result = jr.extractLatestWorklogTimespent(histories);
    console.log(result);

    // Find the entry for 2025-08-21
    const entryFor20250821 = result.find(
      (entry) => entry.date === "2025-08-21"
    );

    expect(entryFor20250821).toBeDefined();
    // -45 minutes = -45 * 60 = -2700 seconds
    const expectedSeconds = -45 * 60;
    expect(entryFor20250821!.timeSpent).toBe(expectedSeconds);
  });
});
