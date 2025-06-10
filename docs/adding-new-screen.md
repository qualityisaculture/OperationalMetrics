# Adding a New Screen to the Application

This document outlines the steps and best practices for adding a new screen/feature to the Operational Metrics application.

## Overview

The application follows a pattern where each screen consists of:

- A **React component** (frontend) in `src/client/`
- A **GraphManager** (backend data processing) in `src/server/graphManagers/`
- An **API route** (backend endpoint) in `src/server/routes/metricsRoute.ts`
- Integration with the main **ChartSelector** in `src/client/ChartSelector.tsx`

---

## Recommended Workflow: An Iterative Approach

While the components can be built in any order, we recommend a **frontend-first, iterative approach**. This allows you to build and test the UI with dummy data before the backend logic is complete, ensuring a better user experience and easier debugging.

### Phase 1: Frontend Scaffolding & UI

1.  **Navigation**: Add the new screen to `ChartSelector.tsx` so you can access it.
2.  **Component Stub**: Create a minimal `YourFeature.tsx` component that just displays its name.
3.  **Basic UI**: Add core UI elements (inputs, buttons, etc.) with dummy handlers.
4.  **State & localStorage**: Implement state management for UI elements and persist user settings to `localStorage`. Use **per-project keys** if the settings are project-specific (e.g., `featureName_settings_${projectName}`).

### Phase 2: Dummy Backend & API Connection

5.  **Dummy API Route**: Add a new route in `metricsRoute.ts` that returns a hardcoded, realistic JSON response.
6.  **Connect Frontend to API**: Update the frontend to call the new API endpoint.
7.  **Display Raw Data**: For debugging, temporarily render the raw JSON response in a `<pre>` tag on your component to verify the connection and data format.

### Phase 3: Real Backend Logic

8.  **GraphManager Stub**: Create `YourFeatureGraphManager.ts` that returns the same dummy data as your API route.
9.  **Refactor API Route**: Connect the API route to the GraphManager. The frontend should still work exactly as before.
10. **Implement Real JQL**: In the GraphManager, replace the dummy data with a real `jiraRequester.getQuery()` call.
    - **Tip**: During development, add `LIMIT 50` to your JQL query to speed up testing. Add a `// TODO:` comment to remove it later.
11. **Implement Business Logic**: Add any necessary data transformation and calculations (e.g., calculating business days between dates).

### Phase 4: Final UI & Cleanup

12. **Process and Display Data**: On the frontend, implement the logic to parse, sort, and group the real API data for display.
13. **Refine UI**: Replace the raw data display with polished UI components (e.g., `Collapse`, `Card`, tables, charts).
14. **Final Touches**: Add hyperlinks, tooltips, and other UX enhancements.
15. **Cleanup**: Remove any temporary debugging code, like `console.log` statements or the raw JSON display.

---

## Detailed Steps

### 1. Update ChartSelector (Navigation)

**Location**: `src/client/ChartSelector.tsx`

1.  **Import** the new component (e.g., `import YourFeature from "./YourFeature";`).
2.  **Add to `State` interface**: Add your chart's identifier to the `chart` type union.
3.  **Add `Radio.Button`**: Add a new option to the `Radio.Group`.
4.  **Add display style** and the component render block.

### 2. Create React Component (Frontend)

**Location**: `src/client/`

- Create a new TypeScript React file: `YourFeature.tsx`.
- Follow the existing class component pattern.
- Define `Props` and `State` interfaces.
- Implement UI using Ant Design components.
- Manage loading states (`isLoading`), user inputs, and API responses.

### 3. Add API Route (Backend Endpoint)

**Location**: `src/server/routes/metricsRoute.ts`

- Add a new route handler (`metricsRoute.get(...)`).
- Initially, return hardcoded dummy data.
- Later, instantiate your GraphManager and call it, returning its data.

### 4. Create the GraphManager (Backend Data Processing)

**Location**: `src/server/graphManagers/`

- Create `YourFeatureGraphManager.ts`.
- Define necessary data types (e.g., `YourFeatureIssue`).
- Initially, return dummy data to match the API.
- Later, implement the full logic with JQL queries and data transformations.

### 5. Update Types (If Needed)

**Location**: `src/Types.ts` or within your GraphManager file.

- Add any new TypeScript interfaces/types required by your feature.
- For feature-specific types, it's often best to define them directly in the GraphManager file.

---

## Best Practices

1.  **Iterate with Dummy Data**: Build the UI with mock data first. This decouples frontend and backend development.
2.  **Flexible Data Structures**: Prefer sending flat arrays of data from the backend. This allows the frontend to be more flexible in how it groups, sorts, and displays the data.
3.  **Per-Project `localStorage`**: For settings that vary by project, use a dynamic key like `` `featureName_${projectName}` ``.
4.  **JQL Optimization**: Use `LIMIT 50` during development for faster feedback.
5.  **TypeScript**: Use proper typing throughout. Define types for API responses and component state.
6.  **Error Handling**: Implement comprehensive error handling on both frontend (API catch blocks) and backend (try/catch blocks).
7.  **Loading States**: Always show loading indicators for async operations to improve UX.
8.  **Ant Design**: Reuse existing design patterns and components for consistency.
9.  **Update This Document**: If you learn something new or find a better way of working during your process, please update this guide!

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
