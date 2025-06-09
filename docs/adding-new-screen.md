# Adding a New Screen to the Application

This document outlines the steps required to add a new screen/feature to the Operational Metrics application.

## Overview

The application follows a pattern where each screen consists of:

- A React component (frontend)
- A GraphManager (data processing)
- An API route (backend endpoint)
- Integration with the main ChartSelector

## Step-by-Step Process

### 1. Create the GraphManager (Backend Data Processing)

**Location**: `src/server/graphManagers/`

- Create a new TypeScript file: `YourFeatureGraphManager.ts`
- Import required dependencies:
  - `JiraRequester` for API calls
  - Types from `GraphManagerTypes.ts`
  - Any utility functions needed
- Implement data processing logic
- Follow the pattern of existing managers (e.g., `ThroughputGraphManager.ts`)

**Key considerations:**

- Handle async operations properly
- Implement error handling
- Consider progress callbacks for long-running operations
- Return data in a format suitable for frontend consumption

### 2. Add API Route (Backend Endpoint)

**Location**: `src/server/routes/metricsRoute.ts`

- Add a new route handler using Express Router
- Define TypeScript types for request/response using:
  - `TypedRequestQuery<T>` for query parameters
  - `TypedResponse<T>` for response body
- Instantiate your GraphManager
- Handle both regular responses and Server-Sent Events (SSE) if needed for progress updates

**Example pattern:**

```typescript
metricsRoute.get(
  "/yourEndpoint",
  (
    req: TRQ<{ param1: string; param2: string }>,
    res: TR<{ message: string; data: string }>
  ) => {
    // Implementation
  }
);
```

### 3. Create React Component (Frontend)

**Location**: `src/client/`

- Create a new TypeScript React file: `YourFeature.tsx`
- Follow the class component pattern used in the application
- Import required Ant Design components for UI
- Implement state management for:
  - Loading states
  - User inputs
  - API response data
  - Error handling

**Key patterns to follow:**

- Use Ant Design components (`Radio`, `DatePicker`, `InputNumber`, `Spin`, etc.)
- Implement proper TypeScript interfaces for Props and State
- Handle async API calls with proper error handling
- Use localStorage for persisting user preferences where appropriate
- Implement progress tracking for long operations

### 4. Update ChartSelector (Navigation)

**Location**: `src/client/ChartSelector.tsx`

Make the following changes:

1. **Import the new component:**

   ```typescript
   import YourFeature from "./YourFeature";
   ```

2. **Add to State interface:**

   ```typescript
   interface State {
     chart: "existing1" | "existing2" | "yourFeature";
   }
   ```

3. **Add radio button option:**

   ```typescript
   <Radio.Button value="yourFeature">Your Feature Name</Radio.Button>
   ```

4. **Add display style:**

   ```typescript
   let yourFeatureStyle = {
     display: this.state.chart === "yourFeature" ? "block" : "none",
   };
   ```

5. **Add component render:**
   ```typescript
   <div style={yourFeatureStyle}>
     <YourFeature />
   </div>
   ```

### 5. Update Types (If Needed)

**Location**: `src/Types.ts` and `src/server/graphManagers/GraphManagerTypes.ts`

- Add any new TypeScript interfaces/types required by your feature
- Follow existing naming conventions
- Consider reusability across different parts of the application

### 6. Testing

- Test the new screen functionality
- Verify API endpoints work correctly
- Check error handling scenarios
- Test loading states and progress indicators
- Ensure TypeScript compilation passes

## Best Practices

1. **Follow existing patterns**: Study similar screens before implementing
2. **TypeScript**: Use proper typing throughout
3. **Error handling**: Implement comprehensive error handling
4. **Loading states**: Always show loading indicators for async operations
5. **Progress tracking**: For long operations, implement progress callbacks
6. **Ant Design**: Use existing design patterns and components
7. **Data persistence**: Use localStorage for user preferences when appropriate
8. **Code organization**: Keep components focused and modular

## File Structure Summary

```
src/
├── client/
│   ├── YourFeature.tsx                    # React component
│   └── ChartSelector.tsx                  # Updated navigation
├── server/
│   ├── graphManagers/
│   │   └── YourFeatureGraphManager.ts     # Data processing
│   └── routes/
│       └── metricsRoute.ts                # Updated with new endpoint
└── Types.ts                               # Updated types if needed
```

## Notes

- The application uses class components rather than functional components
- Server-Sent Events (SSE) are used for real-time progress updates on long operations
- All API responses follow a consistent `{ message: string, data: string }` pattern
- Data is typically JSON stringified in the response and parsed on the frontend
