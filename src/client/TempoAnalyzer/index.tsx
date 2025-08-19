import React, { useState } from "react";
import { Card, Space } from "antd";

import { useExcelProcessor } from "./hooks/useExcelProcessor";
import { useTempoAnalyzer } from "./hooks/useTempoAnalyzer";
import { Props } from "./types";
import { FileUpload } from "./components/FileUpload";
import { SheetManager } from "./components/SheetManager";
import { FilterControls } from "./components/FilterControls";
import { SummaryView } from "./components/SummaryView";
import { DrilldownView } from "./components/DrilldownView";
import { RawDataTable } from "./components/RawDataTable";
import { WorkDescriptionModal } from "./components/WorkDescriptionModal";

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
  const analyzer = useTempoAnalyzer(sheets, selectedSheets);

  const {
    groupedData,
    selectedCategory,
    selectedUser,
    showWorkDescriptionModal,
    selectedWorkDescriptionTitle,
    selectedWorkDescriptions,
    selectedWorkDescriptionDetails,
  } = analyzer;

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
          />

          {Object.keys(groupedData).length > 0 && (
            <div>
              {!selectedCategory && !selectedUser ? (
                <SummaryView
                  summaryViewMode={analyzer.summaryViewMode}
                  totalHours={analyzer.totalHours}
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
