import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  TimeInDevSummary,
  TimeInDevIssueDetail,
} from "../../src/client/TimeInDev";

describe("TimeInDevSummary", () => {
  it("displays the key, summary, daysInStatuses and daysBooked", () => {
    const { getByText } = render(
      <TimeInDevSummary
        issues={[
          { key: "KEY-1", summary: "Hello", daysBooked: 1, daysInStatuses: 2 },
        ]}
      />
    );
    expect(
      getByText("KEY-1 - Hello - 2 days in progress - 1 days booked")
    ).toBeTruthy();
  });
});

describe("TimeInDevIssueDetail", () => {
  it("displays the issue key, summary, timespent and currentStatus", () => {
    render(
      <TimeInDevIssueDetail
        issue={{
          key: "KEY-1",
          summary: "Hello",
          timespent: 1,
          currentStatus: "In progress",
          statuses: [],
          url: "http://example.com",
        }}
        totalDays={1}
      />
    );
    expect(screen.getByRole("heading")).toHaveTextContent("KEY-1 - Hello");
    expect(screen.getByText("Time booked 1 days In progress")).toBeTruthy();
  });

  it("displays the time in all statuses", () => {
    render(
      <TimeInDevIssueDetail
        issue={{
          key: "KEY-1",
          summary: "Hello",
          timespent: 1,
          currentStatus: "In progress",
          statuses: [
            { status: "In progress", days: 1 },
            { status: "Verification", days: 2 },
            { status: "Done", days: 3 },
          ],
          url: "http://example.com",
        }}
        totalDays={3}
      />
    );
    expect(screen.getByText("Statuses total: 3 days")).toBeTruthy();
    expect(screen.getByText("In progress")).toBeTruthy();
    expect(screen.getByText("1 days")).toBeTruthy();
    expect(screen.getByText("Verification")).toBeTruthy();
    expect(screen.getByText("2 days")).toBeTruthy();
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText("3 days")).toBeTruthy();
  });
});
