# Adding a New Screen to the Application

This document outlines the steps and best practices for adding a new screen/feature to the Operational Metrics application.

## Overview

The application follows a pattern where each screen consists of:

- A **React feature directory** (frontend) in `src/client/YourFeature/` containing a main component, sub-components, hooks, types, and constants.
- A **GraphManager** (backend data processing) in `src/server/graphManagers/`
- An **API route** (backend endpoint) in `src/server/routes/metricsRoute.ts`
- Integration with the main **ChartSelector** in `src/client/ChartSelector.tsx`

---

## Recommended Workflow: An Iterative Approach

While the components can be built in any order, we recommend a **frontend-first, iterative approach**. This allows you to build and test the UI with dummy data before the backend logic is complete, ensuring a better user experience and easier debugging.

### Phase 1: Frontend Scaffolding (Modern Approach)

1.  **Create Directory Structure**: In `src/client/`, create a new directory for your feature (e.g., `YourFeature/`). Inside, create the following:
    - `components/`: For smaller, reusable UI components.
    - `hooks/`: For custom hooks containing business logic.
    - `types.ts`: For all TypeScript interfaces and type definitions.
    - `constants.ts`: For constants and static configuration.
    - `index.tsx`: The main entry component for your feature.
2.  **Navigation**: Add the new screen to `ChartSelector.tsx` to make it accessible. Import it from `./YourFeature`.
3.  **Component Scaffolding**: Create a minimal functional component in `YourFeature/index.tsx`.
4.  **Isolate Logic with Hooks**: Identify the core logic for your feature (e.g., data fetching, state management) and create custom hooks in the `hooks/` directory. For example, `useYourFeatureData.ts`.
5.  **Develop UI Components**: Break down the UI into small, presentational components within the `components/` directory. These components will receive data and callbacks as props from the main component.
6.  **Assemble Main Component**: In `index.tsx`, use your custom hooks to manage state and logic, and compose the UI using your smaller components.

### Phase 2: Dummy Backend & API Connection

7.  **Dummy API Route**: Add a new route in `metricsRoute.ts` that returns a hardcoded, realistic JSON response.
8.  **Connect Frontend to API**: Update the frontend to call the new API endpoint from within a custom hook.
9.  **Display Raw Data**: For debugging, temporarily render the raw JSON response in a `<pre>` tag on your component to verify the connection and data format.

### Phase 3: Real Backend Logic

10. **GraphManager Stub**: Create `YourFeatureGraphManager.ts` that returns the same dummy data as your API route.
11. **Refactor API Route**: Connect the API route to the GraphManager. The frontend should still work exactly as before.
12. **Implement Real JQL**: In the GraphManager, replace the dummy data with a real `jiraRequester.getQuery()` call.
    - **Tip**: During development, add `LIMIT 50` to your JQL query to speed up testing. Add a `// TODO:` comment to remove it later.
13. **Implement Business Logic**: Add any necessary data transformation and calculations (e.g., calculating business days between dates).

### Phase 4: Final UI & Cleanup

14. **Process and Display Data**: On the frontend, implement the logic to parse, sort, and group the real API data for display (this logic might live in a custom hook).
15. **Refine UI**: Replace the raw data display with polished UI components (e.g., `Collapse`, `Card`, tables, charts).
16. **Final Touches**: Add hyperlinks, tooltips, and other UX enhancements.
17. **Cleanup**: Remove any temporary debugging code, like `console.log` statements or the raw JSON display.

---

## Detailed Steps

### 1. Update ChartSelector (Navigation)

**Location**: `src/client/ChartSelector.tsx`

1.  **Import** the new component (e.g., `import YourFeature from "./YourFeature";`).
2.  **Add to `State` interface**: Add your chart's identifier to the `chart` type union.
3.  **Add `Radio.Button`**: Add a new option to the `Radio.Group`.
4.  **Add display style** and the component render block.

### 2. Create React Feature (Frontend)

**Location**: `src/client/YourFeature/`

Instead of a single component file, new features are built as a collection of modules within their own directory. This follows the pattern set by `TempoAnalyzer` and is the recommended approach for all new development.

1.  **Create Directory Structure**:
    - `src/client/YourFeature/`
    - `src/client/YourFeature/components/`
    - `src/client/YourFeature/hooks/`
    - `src/client/YourFeature/constants.ts`
    - `src/client/YourFeature/types.ts`
    - `src/client/YourFeature/index.tsx`
2.  **Define Types and Constants**: Place all feature-specific `interface` and `type` definitions in `types.ts`, and constants in `constants.ts`.
3.  **Extract Logic into Hooks**: Encapsulate business logic, API calls, and state management within custom hooks in the `hooks/` directory. This separates concerns from the UI.
4.  **Build Presentational Components**: Create small, stateless functional components in the `components/` directory. These components will only be responsible for rendering UI based on the props they receive.
5.  **Assemble in `index.tsx`**: The main `index.tsx` file should be a lean functional component that:
    - Uses the custom hooks to access data and logic.
    - Assembles the UI by composing the presentational components.
    - Passes state and event handlers down to the child components as props.

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
3.  **Per-Project `localStorage`**: For settings that vary by project, use a dynamic key like `` `featureName_settings_${projectName}` ``.
4.  **JQL Optimization**: Use `LIMIT 50` during development for faster feedback.
5.  **TypeScript**: Use proper typing throughout. Define types for API responses, component props, and state.
6.  **Error Handling**: Implement comprehensive error handling on both frontend (API catch blocks) and backend (try/catch blocks).
7.  **Loading States**: Always show loading indicators for async operations to improve UX.
8.  **Ant Design**: Reuse existing design patterns and components for consistency.
9.  **Update This Document**: If you learn something new or find a better way of working during your process, please update this guide!

## File Structure Summary

```
src/
├── client/
│   ├── YourFeature/
│   │   ├── components/                    # Presentational components
│   │   ├── hooks/                         # Business logic hooks
│   │   ├── constants.ts                   # Feature constants
│   │   ├── types.ts                       # TypeScript types
│   │   └── index.tsx                      # Main feature component
│   └── ChartSelector.tsx                  # Updated navigation
├── server/
│   ├── graphManagers/
│   │   └── YourFeatureGraphManager.ts     # Data processing
│   └── routes/
│       └── metricsRoute.ts                # Updated with new endpoint
└── Types.ts                               # Avoid using; prefer feature-specific types.ts
```

## Notes

- **New features should be built using functional components and hooks**, following the modern structure outlined above. Older parts of the application may still use class components.
- Server-Sent Events (SSE) are used for real-time progress updates on long operations
- All API responses follow a consistent `{ message: string, data: string }` pattern
- Data is typically JSON stringified in the response and parsed on the frontend
