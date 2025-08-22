import React, { useState } from "react";
import { Card, Space } from "antd";

import { useExcelProcessor } from "./hooks/useExcelProcessor";
import { useTempoAnalyzer } from "./hooks/useTempoAnalyzer";
import { useUserGroups } from "./hooks/useUserGroups";
import { Props } from "./types";
import { FileUpload } from "./components/FileUpload";
import { SheetManager } from "./components/SheetManager";
import { FilterControls } from "./components/FilterControls";
import { SummaryView } from "./components/SummaryView";
import { DrilldownView } from "./components/DrilldownView";
import { RawDataTable } from "./components/RawDataTable";
import { WorkDescriptionModal } from "./components/WorkDescriptionModal";
import { UserGroupManager } from "./components/UserGroupManager";

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

  // Update selected groups when user groups change (default to no filtering)
  React.useEffect(() => {
    // Don't auto-select all groups - let user choose
    // This allows for "show all data" by default
  }, [userGroups.groups]);

  // Create analyzer with user group filtering
  const analyzer = useTempoAnalyzer(
    sheets,
    selectedSheets,
    selectedUserGroups,
    userGroups.assignments
  );

  const {
    groupedData,
    selectedCategory,
    selectedUser,
    showWorkDescriptionModal,
    selectedWorkDescriptionTitle,
    selectedWorkDescriptions,
    selectedWorkDescriptionDetails,
  } = analyzer;

  // Calculate total hours from filtered data
  const totalHours = React.useMemo(() => {
    return Object.values(analyzer.groupedByName).reduce(
      (sum, hours) => sum + hours,
      0
    );
  }, [analyzer.groupedByName]);

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
            userGroups={userGroups.groups}
            selectedUserGroups={selectedUserGroups}
            onUserGroupsChange={setSelectedUserGroups}
          />

          {Object.keys(groupedData).length > 0 && (
            <div>
              {!selectedCategory && !selectedUser ? (
                <SummaryView
                  summaryViewMode={analyzer.summaryViewMode}
                  totalHours={totalHours}
                  groupedData={analyzer.groupedData}
                  groupedByName={analyzer.groupedByName}
                  groupedDataByCategory={analyzer.groupedDataByCategory}
                  showOtherTeams={analyzer.showOtherTeams}
                  handleRowClick={analyzer.handleRowClick}
                  handleUserClick={analyzer.handleUserClick}
                />
              ) : (
                <DrilldownView
                  analyzerState={analyzer}
                  handleBackToSummary={analyzer.handleBackToSummary}
                  handleUserCategoryClick={analyzer.handleUserCategoryClick}
                  showWorkDescriptions={analyzer.showWorkDescriptions}
                  handleViewModeChange={analyzer.handleViewModeChange}
                  handleIssueKeyClick={analyzer.handleIssueKeyClick}
                  handleBackToIssueView={analyzer.handleBackToIssueView}
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

      <WorkDescriptionModal
        visible={showWorkDescriptionModal}
        title={selectedWorkDescriptionTitle}
        descriptions={selectedWorkDescriptions}
        details={selectedWorkDescriptionDetails}
        onClose={analyzer.hideWorkDescriptionModal}
      />
    </div>
  );
};

export default TempoAnalyzer;
