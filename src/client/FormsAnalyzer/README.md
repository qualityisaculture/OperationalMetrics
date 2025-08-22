# Microsoft Forms Analyzer

## Overview

The Microsoft Forms Analyzer is a feature that allows users to upload Excel files containing Microsoft Forms responses and analyze the data. It's designed to handle the typical structure of Microsoft Forms exports where the first 5 columns contain metadata (timestamp, respondent name, etc.) and the remaining columns contain the actual form questions and responses.

## Features

### Phase 1: Basic Excel Import & Data Display ✅

- **Excel File Upload**: Supports `.xlsx` and `.xls` files up to 10MB
- **Data Processing**: Automatically identifies metadata columns (first 5) and question columns (remaining)
- **Data Overview**: Shows statistics including total responses, questions, and file information
- **Raw Data Table**: Displays the uploaded data in a paginated table format
- **Column Identification**: Clearly distinguishes between metadata and question columns

### Phase 2: Question Analysis & Basic Filtering ✅

- **Answer Frequency Analysis**: For each question, shows all possible answers with counts and percentages
- **Visual Answer Breakdown**: Circular progress charts displaying answer distribution
- **Multi-Select Filtering**: Filter responses by selecting specific answers to questions
- **Dynamic Question Analysis**: **Question analysis updates in real-time based on filtered data**
- **Cross-Question Insights**: See how filtering one question affects patterns in other questions
- **Active Filter Display**: Shows currently applied filters and their impact on data
- **Filter Statistics**: Displays original vs. filtered response counts and reduction percentages
- **Tabbed Interface**: Separate tabs for question analysis and data table viewing

### Data Structure Assumptions

- First 5 columns are considered metadata (timestamp, name, email, etc.)
- Remaining columns are treated as form questions
- Each row represents one form response
- Headers are extracted from the first row of each sheet

## Usage

### Phase 1: Basic Data Import

1. **Upload File**: Click the "Upload Microsoft Forms Excel File" button and select your Excel file
2. **View Overview**: See basic statistics about your data including response counts and column information
3. **Explore Data**: Use the raw data table to browse through individual responses
4. **Identify Structure**: The system automatically categorizes columns as metadata or questions

### Phase 2: Question Analysis & Filtering

1. **Question Analysis Tab**: View detailed breakdown of each question with answer frequencies
2. **Apply Filters**: Use the multi-select dropdowns to filter responses by specific answers
3. **Dynamic Analysis**: **Watch as all question analysis updates to show only the filtered dataset**
4. **Cross-Question Patterns**: Discover how filtering one question reveals new patterns in other questions
5. **Monitor Impact**: See how filters affect your data with real-time statistics
6. **Switch Views**: Toggle between filtered and unfiltered data in the Data Table tab
7. **Manage Filters**: Remove individual filters or clear all filters at once

## Key Behavior: Dynamic Question Analysis

**The most powerful feature of Phase 2 is that question analysis is dynamic and updates based on your filters:**

- When you filter by an answer in any question, **all other question analysis immediately recalculates**
- This shows you the answer patterns for the subset of respondents who gave that specific answer
- You can discover insights like: "People who answered 'Yes' to Question A tend to answer 'Option 2' to Question B"
- The analysis always shows percentages based on the current filtered dataset, not the original data
- This creates a powerful exploratory analysis tool for understanding relationships between questions

## File Requirements

- **Format**: Excel files (`.xlsx` or `.xls`)
- **Size**: Maximum 10MB
- **Structure**: First row should contain column headers
- **Content**: Data should start from the second row

## Technical Implementation

### Components

- `FormsAnalyzer`: Main component that orchestrates the feature
- `FileUpload`: Handles file selection and validation
- `DataOverview`: Displays statistics and column categorization
- `RawDataTable`: Shows the data in table format
- `QuestionAnalysis`: Displays question breakdown with filtering options
- `ActiveFilters`: Shows currently applied filters and their impact

### Hooks

- `useFormsProcessor`: Manages file processing, data state, and Excel parsing
- `useQuestionAnalysis`: Handles question analysis, filtering logic, and **dynamic recalculation based on filters**

### Types

- `FormsData`: Represents processed Excel sheet data
- `QuestionAnalysis`: Structure for analyzing question responses with answer frequencies
- `FilterCriteria`: Structure for filtering data by question and selected answers

## Future Phases

### Phase 3: Advanced Filtering & Cross-Analysis

- Multi-question filtering with AND/OR logic
- Cross-tabulation between questions
- Charts and visualizations
- Advanced statistical analysis

### Phase 4: Enhanced UI & Advanced Features

- Advanced chart types (bar charts, pie charts, heatmaps)
- Saved filter configurations
- Export filtered results
- Performance optimizations for large datasets

## Dependencies

- `antd`: UI components
- `xlsx`: Excel file processing
- `react`: Core framework
- `@ant-design/icons`: Icons

## Notes

- **Phase 2 is now complete** with full question analysis and filtering capabilities
- **Question analysis dynamically updates based on filters** - this is the key innovation
- The system automatically analyzes all questions and provides filtering options
- Filters work in real-time and show immediate impact on both data and question analysis
- All data processing is done client-side for privacy and performance
- The interface is designed to be intuitive for non-technical users
- **This creates a powerful exploratory analysis tool** for understanding relationships between questions
