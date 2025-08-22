export const FORMS_ANALYZER_CONSTANTS = {
  // Excel file processing
  MAX_FILE_SIZE_MB: 10,
  SUPPORTED_FILE_TYPES: [".xlsx", ".xls"],

  // Data structure assumptions
  METADATA_COLUMNS_COUNT: 5, // First 5 columns are metadata
  MIN_QUESTIONS_COUNT: 1, // Must have at least 1 question column

  // Table display
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,

  // UI
  DEFAULT_COLUMN_WIDTH: 150,
  MIN_COLUMN_WIDTH: 100,

  // Phase 2: Question Analysis
  MAX_ANSWER_DISPLAY_COUNT: 10, // Maximum answers to show in filter dropdown
  MIN_ANSWER_PERCENTAGE: 1.0, // Minimum percentage to show in analysis
  PROGRESS_CIRCLE_SIZE: 60, // Size of progress circles in question analysis

  // Filtering
  MAX_FILTERS_PER_QUESTION: 5, // Maximum number of answer options per filter
  FILTER_UPDATE_DEBOUNCE_MS: 300, // Debounce time for filter updates
} as const;
