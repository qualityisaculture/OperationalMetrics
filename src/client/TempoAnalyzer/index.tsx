import React, { useState } from "react";
import { Card, Space } from "antd";

import { useExcelProcessor } from "./hooks/useExcelProcessor";
import { useTempoAnalyzer } from "./hooks/useTempoAnalyzer";
import { useUserGroups } from "./hooks/useUserGroups";
import { useParentAncestors } from "./hooks/useParentAncestors";
import { useLabels } from "./hooks/useLabels";
import { Props } from "./types";
import { FileUpload } from "./components/FileUpload";
import { SheetManager } from "./components/SheetManager";
import { FilterControls } from "./components/FilterControls";
import { SummaryView } from "./components/SummaryView";
import { DrilldownView } from "./components/DrilldownView";
import { RawDataTable } from "./components/RawDataTable";
import { WorkDescriptionModal } from "./components/WorkDescriptionModal";
import { UserGroupManager } from "./components/UserGroupManager";
import { TeamSummary } from "./components/TeamSummary";
import { ParentAncestorsView } from "./components/ParentAncestorsView";
import { ParentAncestorsModal } from "./components/ParentAncestorsModal";
import {
  SankeySelector,
  SankeySelectorConfig,
} from "./components/SankeySelector";
import { SankeyView } from "./components/SankeyView";

const TempoAnalyzer: React.FC<Props> = () => {
  const {
    sheets,
    isLoading,
    handleFileUpload,
    handleMultipleFileUpload,
    removeSheet,
    selectedSheets,
    setSelectedSheets,
  } = useExcelProcessor();

  // Create initial analyzer without user group filtering
  const initialAnalyzer = useTempoAnalyzer(sheets, selectedSheets);

  // Extract unique user names from the data for user group management
  const availableUsers = React.useMemo(() => {
    if (!initialAnalyzer.groupedByName) return [];
    return Object.keys(initialAnalyzer.groupedByName);
  }, [initialAnalyzer.groupedByName]);

  // User group management
  const {
    userGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    assignUserToGroup,
  } = useUserGroups(availableUsers);

  // User group filtering - default to no filtering (show all data)
  const [selectedUserGroups, setSelectedUserGroups] = React.useState<string[]>(
    []
  );

  // Sankey selector configuration
  const [sankeySelectors, setSankeySelectors] = React.useState<
    SankeySelectorConfig[]
  >([]);

  // Update selected groups when user groups change (default to no filtering)
  React.useEffect(() => {
    // Don't auto-select all groups - let user choose
    // This allows for "show all data" by default
  }, [userGroups.groups]);

  // Fetch parent ancestors for all issues in the filtered data (manual trigger)
  // Use initialAnalyzer to get filteredData and issueKeyIndex
  const {
    parentAncestors,
    isLoading: isLoadingAncestors,
    fetchParentAncestors,
    extractUniqueIssueKeys,
  } = useParentAncestors(
    initialAnalyzer.filteredData,
    initialAnalyzer.issueKeyIndex
  );

  // Fetch labels for all issues in the filtered data (manual trigger)
  // Use initialAnalyzer to get filteredData and issueKeyIndex
  const {
    labels,
    isLoading: isLoadingLabels,
    fetchLabels,
    getAllLabels,
  } = useLabels(initialAnalyzer.filteredData, initialAnalyzer.issueKeyIndex);

  // Get issue count for display
  const issueCount = React.useMemo(() => {
    return extractUniqueIssueKeys().length;
  }, [extractUniqueIssueKeys]);

  // Create analyzer with user group filtering and parent ancestors
  const analyzer = useTempoAnalyzer(
    sheets,
    selectedSheets,
    selectedUserGroups,
    userGroups.assignments,
    parentAncestors
  );

  const {
    groupedData,
    selectedCategory,
    selectedUser,
    selectedAncestryType,
    showWorkDescriptionModal,
    selectedWorkDescriptionTitle,
    selectedWorkDescriptions,
    selectedWorkDescriptionDetails,
    showParentAncestorsModal,
    selectedAncestorsIssueKey,
    selectedAncestorsIssueType,
  } = analyzer;

  // Calculate total hours from filtered data
  const totalHours = React.useMemo(() => {
    return Object.values(analyzer.groupedByName).reduce(
      (sum, hours) => sum + hours,
      0
    );
  }, [analyzer.groupedByName]);

  // Get available issue types for Sankey selector
  const availableIssueTypes = React.useMemo(() => {
    return Object.keys(analyzer.groupedByIssueType).sort();
  }, [analyzer.groupedByIssueType]);

  // Get available projects for Sankey selector (extract from issue keys)
  const availableProjects = React.useMemo(() => {
    const projects = new Set<string>();
    if (analyzer.issueKeyIndex !== -1) {
      analyzer.filteredData.forEach((row) => {
        const issueKey = row[analyzer.issueKeyIndex.toString()];
        if (issueKey) {
          const issueKeyStr = String(issueKey).trim();
          // Extract project prefix (e.g., "ABC-1" -> "ABC" or "ABC123-4" -> "ABC123")
          // Match letters and numbers up to the first dash or end of string
          const projectMatch = issueKeyStr.match(/^([A-Z0-9]+)(?:-|$)/);
          if (projectMatch) {
            projects.add(projectMatch[1]);
          }
        }
      });
    }
    return Array.from(projects).sort();
  }, [analyzer.filteredData, analyzer.issueKeyIndex]);

  // Get available issue keys for Sankey selector
  const availableIssueKeys = React.useMemo(() => {
    const keys = new Set<string>();
    if (analyzer.issueKeyIndex !== -1) {
      analyzer.filteredData.forEach((row) => {
        const issueKey = row[analyzer.issueKeyIndex.toString()];
        if (issueKey) {
          const key = String(issueKey).trim();
          if (key) {
            keys.add(key);
          }
        }
      });
    }
    return Array.from(keys).sort();
  }, [analyzer.filteredData, analyzer.issueKeyIndex]);

  // Get available account categories for Sankey selector
  const availableAccountCategories = React.useMemo(() => {
    const categories = new Set<string>();
    if (analyzer.accountCategoryIndex !== -1) {
      analyzer.filteredData.forEach((row) => {
        const accountCategory = row[analyzer.accountCategoryIndex.toString()];
        if (accountCategory) {
          const category = String(accountCategory).trim();
          if (category) {
            categories.add(category);
          }
        }
      });
    }
    return Array.from(categories).sort();
  }, [analyzer.filteredData, analyzer.accountCategoryIndex]);

  return (
    <div style={{ padding: "20px" }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <FileUpload
            isLoading={isLoading}
            handleFileUpload={handleFileUpload}
            handleMultipleFileUpload={handleMultipleFileUpload}
          />

          <SheetManager
            sheets={sheets}
            selectedSheets={selectedSheets}
            handleSheetSelectionChange={setSelectedSheets}
            removeSheet={removeSheet}
          />

          <FilterControls
            summaryViewMode={analyzer.summaryViewMode}
            handleSummaryViewModeChange={analyzer.handleSummaryViewModeChange}
            secondarySplitMode={analyzer.secondarySplitMode}
            handleSecondarySplitModeChange={
              analyzer.handleSecondarySplitModeChange
            }
            excludeHolidayAbsence={analyzer.excludeHolidayAbsence}
            handleExcludeHolidayAbsenceChange={
              analyzer.handleExcludeHolidayAbsenceChange
            }
            excludeStartDate={analyzer.excludeStartDate}
            handleExcludeStartDateChange={analyzer.handleExcludeStartDateChange}
            excludeEndDate={analyzer.excludeEndDate}
            handleExcludeEndDateChange={analyzer.handleExcludeEndDateChange}
            showOtherTeams={analyzer.showOtherTeams}
            handleShowOtherTeamsChange={analyzer.handleShowOtherTeamsChange}
            hasGroupedData={Object.keys(groupedData).length > 0}
            hasGroupedByName={Object.keys(analyzer.groupedByName).length > 0}
            hasGroupedByIssueType={
              Object.keys(analyzer.groupedByIssueType).length > 0
            }
            hasGroupedByAncestryType={
              Object.keys(analyzer.groupedByAncestryType).length > 0
            }
            userGroups={userGroups.groups}
            selectedUserGroups={selectedUserGroups}
            onUserGroupsChange={setSelectedUserGroups}
          />

          {(Object.keys(groupedData).length > 0 ||
            Object.keys(analyzer.groupedByName).length > 0 ||
            Object.keys(analyzer.groupedByIssueType).length > 0 ||
            Object.keys(analyzer.groupedByAncestryType).length > 0) && (
            <div>
              {analyzer.summaryViewMode === "sankey" ? (
                <>
                  <SankeySelector
                    availableIssueTypes={availableIssueTypes}
                    availableLabels={getAllLabels()}
                    availableProjects={availableProjects}
                    availableIssueKeys={availableIssueKeys}
                    availableAccountCategories={availableAccountCategories}
                    selectors={sankeySelectors}
                    onSelectorsChange={setSankeySelectors}
                    onRequestLabels={fetchLabels}
                    isLoadingLabels={isLoadingLabels}
                  />
                  {sankeySelectors.length > 0 && (
                    <SankeyView
                      filteredData={analyzer.filteredData}
                      issueTypeIndex={analyzer.issueTypeIndex}
                      issueKeyIndex={analyzer.issueKeyIndex}
                      loggedHoursIndex={analyzer.loggedHoursIndex}
                      fullNameIndex={analyzer.fullNameIndex}
                      accountCategoryIndex={analyzer.accountCategoryIndex}
                      selectors={sankeySelectors}
                      labels={labels}
                    />
                  )}
                </>
              ) : !selectedCategory &&
                !selectedUser &&
                !selectedAncestryType ? (
                <SummaryView
                  summaryViewMode={analyzer.summaryViewMode}
                  totalHours={totalHours}
                  groupedData={analyzer.groupedData}
                  groupedByName={analyzer.groupedByName}
                  groupedByIssueType={analyzer.groupedByIssueType}
                  groupedByAncestryType={analyzer.groupedByAncestryType}
                  groupedDataByCategory={analyzer.groupedDataByCategory}
                  groupedDataByAncestryType={analyzer.groupedDataByAncestryType}
                  secondarySplitMode={analyzer.secondarySplitMode}
                  showOtherTeams={analyzer.showOtherTeams}
                  handleRowClick={analyzer.handleRowClick}
                  handleUserClick={analyzer.handleUserClick}
                  handleAncestryTypeClick={analyzer.handleAncestryTypeClick}
                  handleAncestryTypeCategoryClick={
                    analyzer.handleAncestryTypeCategoryClick
                  }
                />
              ) : (
                <DrilldownView
                  analyzerState={analyzer}
                  handleBackToSummary={analyzer.handleBackToSummary}
                  handleUserCategoryClick={analyzer.handleUserCategoryClick}
                  showWorkDescriptions={analyzer.showWorkDescriptions}
                  showParentAncestors={analyzer.showParentAncestors}
                  handleViewModeChange={analyzer.handleViewModeChange}
                  handleIssueKeyClick={analyzer.handleIssueKeyClick}
                  handleBackToIssueView={analyzer.handleBackToIssueView}
                  parentAncestors={parentAncestors}
                />
              )}
            </div>
          )}

          <RawDataTable
            displayedRows={analyzer.displayedRows}
            getDisplayedRowsTitle={analyzer.getDisplayedRowsTitle}
            columns={analyzer.columns}
          />
        </Space>
      </Card>

      {/* Team Summary - Show when data is available */}
      {Object.keys(analyzer.groupedData).length > 0 && (
        <TeamSummary
          sheets={sheets}
          selectedSheets={selectedSheets}
          filteredData={analyzer.filteredData}
          accountCategoryIndex={analyzer.accountCategoryIndex}
          loggedHoursIndex={analyzer.loggedHoursIndex}
          issueTypeIndex={analyzer.issueTypeIndex}
          excludeHolidayAbsence={analyzer.excludeHolidayAbsence}
        />
      )}

      {/* User Group Management - Always visible */}
      <UserGroupManager
        userGroups={userGroups}
        onCreateGroup={createGroup}
        onUpdateGroup={updateGroup}
        onDeleteGroup={(id, name) => deleteGroup(id)}
        onAssignUser={assignUserToGroup}
        groupedDataByCategory={analyzer.groupedDataByCategory}
        filteredData={analyzer.filteredData}
        accountCategoryIndex={analyzer.accountCategoryIndex}
        loggedHoursIndex={analyzer.loggedHoursIndex}
        fullNameIndex={analyzer.fullNameIndex}
      />

      {/* Parent Ancestors View - Show when data is available */}
      {Object.keys(analyzer.groupedData).length > 0 && (
        <ParentAncestorsView
          parentAncestors={parentAncestors}
          isLoading={isLoadingAncestors}
          onFetchClick={fetchParentAncestors}
          hasData={analyzer.filteredData.length > 0}
          issueCount={issueCount}
        />
      )}

      <WorkDescriptionModal
        visible={showWorkDescriptionModal}
        title={selectedWorkDescriptionTitle}
        descriptions={selectedWorkDescriptions}
        details={selectedWorkDescriptionDetails}
        onClose={analyzer.hideWorkDescriptionModal}
      />

      <ParentAncestorsModal
        visible={showParentAncestorsModal}
        issueKey={selectedAncestorsIssueKey || ""}
        issueType={selectedAncestorsIssueType || ""}
        ancestors={
          selectedAncestorsIssueKey
            ? parentAncestors[selectedAncestorsIssueKey] || []
            : []
        }
        onClose={analyzer.hideParentAncestorsModal}
      />
    </div>
  );
};

export default TempoAnalyzer;
