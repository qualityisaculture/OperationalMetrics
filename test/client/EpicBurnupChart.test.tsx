import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EpicBurnupChart from "../../src/client/EpicBurnupChart";
import { EpicBurnup } from "../../src/server/graphManagers/BurnupGraphManager";

// Mock the fetch function
global.fetch = jest.fn();

// Mock the LineChart component since we don't need to test its internals
jest.mock("../../src/client/LineChart", () => {
  return function MockLineChart() {
    return <div data-testid="mock-line-chart" />;
  };
});

// Mock the Select component
jest.mock("../../src/client/Select", () => {
  return function MockSelect({
    options,
    onChange,
  }: {
    options: any[];
    onChange: (value: string[]) => void;
  }) {
    return (
      <select
        data-testid="mock-select"
        onChange={(e) => onChange([e.target.value])}
        multiple
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };
});

describe("EpicBurnupChart", () => {
  const mockEpicData: EpicBurnup[] = [
    {
      key: "EPIC-1",
      summary: "Test Epic 1",
      //@ts-ignore
      startDate: "2023-01-01",
      //@ts-ignore
      endDate: "2023-01-02",
      doneCountIncrement: 1,
      doneCountLimit: 10,
      doneEstimateIncrement: 0,
      doneEstimateLimit: 0,
      dateData: [
        {
          date: "2023-01-01",
          doneCount: 5,
          doneEstimate: null,
          doneKeys: [],
          inProgressCount: null,
          inProgressEstimate: null,
          inProgressKeys: [],
          scopeCount: 10,
          scopeEstimate: null,
          scopeKeys: [],
          timeSpent: null,
        },
        {
          date: "2023-01-02",
          doneCount: 7,
          doneEstimate: null,
          doneKeys: [],
          inProgressCount: null,
          inProgressEstimate: null,
          inProgressKeys: [],
          scopeCount: 10,
          scopeEstimate: null,
          scopeKeys: [],
          timeSpent: null,
        },
      ],
      allJiraInfo: [],
    },
    {
      key: "EPIC-2",
      summary: "Test Epic 2",
      //@ts-ignore
      startDate: "2023-01-01",
      //@ts-ignore
      endDate: "2023-01-02",
      doneCountIncrement: 1,
      doneCountLimit: 8,
      doneEstimateIncrement: 0,
      doneEstimateLimit: 0,
      dateData: [
        {
          date: "2023-01-01",
          doneCount: 3,
          doneEstimate: null,
          doneKeys: [],
          inProgressCount: null,
          inProgressEstimate: null,
          inProgressKeys: [],
          scopeCount: 8,
          scopeEstimate: null,
          scopeKeys: [],
          timeSpent: null,
        },
        {
          date: "2023-01-02",
          doneCount: 5,
          doneEstimate: null,
          doneKeys: [],
          inProgressCount: null,
          inProgressEstimate: null,
          inProgressKeys: [],
          scopeCount: 8,
          scopeEstimate: null,
          scopeKeys: [],
          timeSpent: null,
        },
      ],
      allJiraInfo: [],
    },
  ];

  const mockResponse = {
    data: JSON.stringify({
      epicBurnups: mockEpicData,
      originalKey: "EPIC-1",
      originalSummary: "Test Epic 1",
      originalType: "Epic",
    }),
  };

  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve(mockResponse),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders initial state correctly", async () => {
    render(<EpicBurnupChart query="test" estimationMode="count" />);

    await waitFor(() => {
      const lineCharts = screen.getAllByTestId("mock-line-chart");
      expect(lineCharts).toHaveLength(2);
      expect(screen.getByTestId("mock-select")).toBeInTheDocument();
    });
  });

  it("fetches data on mount", async () => {
    render(<EpicBurnupChart query="test" estimationMode="count" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/epicBurnup?query=test");
    });
  });

  it("updates data when query prop changes", async () => {
    const { rerender } = render(
      <EpicBurnupChart query="test" estimationMode="count" />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/epicBurnup?query=test");
    });

    rerender(<EpicBurnupChart query="new-query" estimationMode="count" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/epicBurnup?query=new-query"
      );
    });
  });

  it("handles epic selection changes", async () => {
    render(<EpicBurnupChart query="test" estimationMode="count" />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("mock-select");
    fireEvent.change(select, { target: { value: "0" } });

    // Verify that the selection was updated
    expect(select).toHaveValue(["0"]);
  });

  it("calls onDataLoaded callback when data is fetched", async () => {
    const onDataLoaded = jest.fn();
    render(
      <EpicBurnupChart
        query="test"
        estimationMode="count"
        onDataLoaded={onDataLoaded}
      />
    );

    await waitFor(() => {
      expect(onDataLoaded).toHaveBeenCalledWith(mockEpicData);
    });
  });

  it("renders with correct title", async () => {
    render(<EpicBurnupChart query="test" estimationMode="count" />);

    await waitFor(() => {
      expect(
        screen.getByText("EPIC-1 - Test Epic 1 (Epic)")
      ).toBeInTheDocument();
    });
  });
});
