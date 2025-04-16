# Loading Indicators Implementation Guide

## Overview

This guide explains how to implement loading indicators with Server-Sent Events (SSE) in the Operational Metrics application.

## Implementation Steps

### 1. Server-Side Implementation

1. Add SSE support to the GraphManager class:

```typescript
class YourGraphManager {
  private sendProgress: (response: SSEResponse) => void;
  private lastProgress: any = {
    current: 0,
    total: 0,
    totalIssues: 0,
    totalJiraRequests: 0,
    currentJiraRequest: 0,
  };

  constructor(
    jiraRequester: JiraRequester,
    sendProgress?: (response: SSEResponse) => void
  ) {
    this.jiraRequester = jiraRequester;
    this.sendProgress = sendProgress || (() => {});
  }

  private updateProgress(step: string, message: string, progress?: any) {
    if (progress) {
      this.lastProgress = {
        ...this.lastProgress,
        ...progress,
      };
    }

    this.sendProgress({
      status: "processing",
      step: step as any,
      message,
      progress: this.lastProgress,
    });
  }
}
```

2. Add progress updates in your data fetching method:

```typescript
async getData(): Promise<Data[]> {
  try {
    this.updateProgress("initializing", "Starting to process data...");

    // Add progress updates for each major step
    this.updateProgress("step_name", "Description of step...", {
      current: currentValue,
      total: totalValue,
      // other progress metrics
    });

    // Send completion
    this.sendProgress({
      status: "complete",
      data: JSON.stringify(result)
    });

    return result;
  } catch (error) {
    this.sendProgress({
      status: "error",
      message: error.message
    });
    throw error;
  }
}
```

### 2. Server Route Implementation

1. Set up SSE headers in your route:

```typescript
metricsRoute.get("/your-endpoint", (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Create manager with progress callback
  const manager = new YourGraphManager(jiraRequester, (progress) => {
    console.log("Sending progress update:", progress);
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  });

  // Send initial message
  res.write(
    `data: ${JSON.stringify({
      status: "processing",
      step: "initializing",
      message: "Starting to process data...",
      progress: {
        current: 0,
        total: 0,
      },
    })}\n\n`
  );

  // Call your data method
  manager
    .getData()
    .then((data) => {
      res.write(
        `data: ${JSON.stringify({
          status: "complete",
          data: JSON.stringify(data),
        })}\n\n`
      );
      res.end();
    })
    .catch((error) => {
      res.write(
        `data: ${JSON.stringify({
          status: "error",
          message: error.message,
        })}\n\n`
      );
      res.end();
    });
});
```

### 3. Client-Side Implementation

1. Add loading state to your component:

```typescript
interface State {
  isLoading: boolean;
  statusMessage: string;
  progress?: {
    current: number;
    total: number;
    // other progress metrics
  };
  currentStep?: string;
}
```

2. Set up SSE connection in your data fetching method:

```typescript
fetchData = () => {
  this.setState({ isLoading: true, statusMessage: "Loading data..." });

  const eventSource = new EventSource(`/api/your-endpoint`);

  eventSource.onmessage = (event) => {
    const response = JSON.parse(event.data);

    if (response.status === "processing") {
      this.setState({
        statusMessage: response.message || "Processing...",
        progress: response.progress,
        currentStep: response.step,
      });
    } else if (response.status === "complete" && response.data) {
      const data = JSON.parse(response.data);
      this.setState({
        data,
        isLoading: false,
        statusMessage: "",
        progress: undefined,
        currentStep: undefined,
      });
      eventSource.close();
    } else if (response.status === "error") {
      this.setState({
        isLoading: false,
        statusMessage: `Error: ${response.message}`,
        progress: undefined,
        currentStep: undefined,
      });
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    this.setState({
      isLoading: false,
      statusMessage: "Connection error. Please try again.",
      progress: undefined,
      currentStep: undefined,
    });
    eventSource.close();
  };
};
```

3. Render loading UI:

```typescript
render() {
  return (
    <div>
      {/* Error message */}
      {!this.state.isLoading && this.state.statusMessage && (
        <div style={{ textAlign: "center", margin: "20px", color: "red" }}>
          <p>{this.state.statusMessage}</p>
        </div>
      )}

      {/* Content area with loading indicator or actual content */}
      <div style={{ minHeight: "400px", position: "relative" }}>
        {this.state.isLoading ? (
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center"
          }}>
            <Spin size="large" />
            <div style={{ marginTop: "10px" }}>
              <p>{this.state.statusMessage}</p>
              {this.state.currentStep && (
                <p>
                  <strong>Current Stage:</strong>{" "}
                  {this.state.currentStep
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
              )}
              {this.state.progress && (
                <p>Processing {this.state.progress.totalIssues} issues</p>
              )}
            </div>
          </div>
        ) : (
          <YourContent data={this.state.data} />
        )}
      </div>
    </div>
  );
}
```

## Best Practices

1. Always include error handling at both server and client levels
2. Show meaningful progress messages for each step
3. Include quantitative progress when possible (e.g., "Processing 5 of 10 items")
4. Clean up event source connections when component unmounts or on error
5. Show error messages in a user-friendly way
6. Format step names for readability (e.g., "getting_data" → "Getting Data")
7. Initialize data/selections appropriately when data loads
8. Ensure proper TypeScript types for all progress and state interfaces
9. Replace content with loading indicators rather than showing them separately
10. Use minimum heights to prevent layout shifts during loading
11. Center loading indicators within their content area

## Common Gotchas

1. Remember to close the EventSource when done or on error
2. Handle all SSE response statuses: "processing", "complete", "error"
3. Parse JSON data appropriately (some data might be double-stringified)
4. Set proper SSE headers on the server
5. Initialize state properly to avoid undefined errors
6. Clean up resources in component unmount
7. Handle connection errors gracefully
8. Avoid layout shifts by maintaining consistent container dimensions
9. Don't show loading indicators in a separate area from the content they represent
10. Ensure loading state is properly reset on both success and error
