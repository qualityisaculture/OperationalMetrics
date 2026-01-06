import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Space, message } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, UpOutlined, DownOutlined } from "@ant-design/icons";
import { FilterControls } from "../../TempoAnalyzer/components/FilterControls";
import { SankeySelector, SankeySelectorConfig } from "../../TempoAnalyzer/components/SankeySelector";
import { SankeyView } from "../../TempoAnalyzer/components/SankeyView";
import { SummaryView } from "../../TempoAnalyzer/components/SummaryView";
import { DrilldownView } from "../../TempoAnalyzer/components/DrilldownView";
import { FileUpload } from "../../TempoAnalyzer/components/FileUpload";
import { SheetManager } from "../../TempoAnalyzer/components/SheetManager";
import { useTempoAnalyzer } from "../../TempoAnalyzer/hooks/useTempoAnalyzer";
import { useUserGroups } from "../../TempoAnalyzer/hooks/useUserGroups";
import { useLabels } from "../../TempoAnalyzer/hooks/useLabels";
import { useExcelProcessor } from "../../TempoAnalyzer/hooks/useExcelProcessor";
import dayjs from "dayjs";

interface TempoAnalyzerDashboardProps {
  summaryViewMode?: "category" | "name" | "issueType" | "ancestryType" | "sankey";
  secondarySplitMode?: "account" | "issueType";
  excludeHolidayAbsence?: boolean;
  excludeStartDate?: string | null; // ISO string
  excludeEndDate?: string | null; // ISO string
  showOtherTeams?: boolean;
  selectedUserGroups?: string[];
  sankeySelectors?: SankeySelectorConfig[];
  readOnly?: boolean;
  onConfigChange?: (config: TempoAnalyzerConfig) => void;
}

export interface TempoAnalyzerConfig {
  summaryViewMode: "category" | "name" | "issueType" | "ancestryType" | "sankey";
  secondarySplitMode: "account" | "issueType";
  excludeHolidayAbsence: boolean;
  excludeStartDate: string | null;
  excludeEndDate: string | null;
  showOtherTeams: boolean;
  selectedUserGroups: string[];
  sankeySelectors: SankeySelectorConfig[];
}

const TempoAnalyzerDashboard: React.FC<TempoAnalyzerDashboardProps> = ({
  summaryViewMode: initialSummaryViewMode = "category",
  secondarySplitMode: initialSecondarySplitMode = "account",
  excludeHolidayAbsence: initialExcludeHolidayAbsence = false,
  excludeStartDate: initialExcludeStartDate = null,
  excludeEndDate: initialExcludeEndDate = null,
  showOtherTeams: initialShowOtherTeams = false,
  selectedUserGroups: initialSelectedUserGroups = [],
  sankeySelectors: initialSankeySelectors = [],
  readOnly = false,
  onConfigChange,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showFilterControls, setShowFilterControls] = useState(false);
  
  // Local state for settings (editable)
  const [summaryViewMode, setSummaryViewMode] = useState(initialSummaryViewMode);
  const [secondarySplitMode, setSecondarySplitMode] = useState(initialSecondarySplitMode);
  const [excludeHolidayAbsence, setExcludeHolidayAbsence] = useState(initialExcludeHolidayAbsence);
  const [excludeStartDate, setExcludeStartDate] = useState<dayjs.Dayjs | null>(
    initialExcludeStartDate ? dayjs(initialExcludeStartDate) : null
  );
  const [excludeEndDate, setExcludeEndDate] = useState<dayjs.Dayjs | null>(
    initialExcludeEndDate ? dayjs(initialExcludeEndDate) : null
  );
  const [showOtherTeams, setShowOtherTeams] = useState(initialShowOtherTeams);
  const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>(initialSelectedUserGroups);
  const [sankeySelectors, setSankeySelectors] = useState<SankeySelectorConfig[]>(initialSankeySelectors);

  // Sync local state when props change (e.g., after config is saved)
  useEffect(() => {
    setSummaryViewMode(initialSummaryViewMode);
    setSecondarySplitMode(initialSecondarySplitMode);
    setExcludeHolidayAbsence(initialExcludeHolidayAbsence);
    setExcludeStartDate(initialExcludeStartDate ? dayjs(initialExcludeStartDate) : null);
    setExcludeEndDate(initialExcludeEndDate ? dayjs(initialExcludeEndDate) : null);
    setShowOtherTeams(initialShowOtherTeams);
    setSelectedUserGroups(initialSelectedUserGroups);
    setSankeySelectors(initialSankeySelectors);
  }, [initialSummaryViewMode, initialSecondarySplitMode, initialExcludeHolidayAbsence, initialExcludeStartDate, initialExcludeEndDate, initialShowOtherTeams, initialSelectedUserGroups, initialSankeySelectors]);

  // Excel processor for file upload
  const {
    sheets,
    isLoading: isLoadingFiles,
    handleFileUpload,
    handleMultipleFileUpload,
    removeSheet,
    selectedSheets,
    setSelectedSheets,
  } = useExcelProcessor();

  // Create initial analyzer without user group filtering
  const initialAnalyzer = useTempoAnalyzer(sheets, selectedSheets);

  // Extract unique user names from the data for user group management
  const availableUsers = useMemo(() => {
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

  // Create analyzer with user group filtering
  const analyzer = useTempoAnalyzer(
    sheets,
    selectedSheets,
    selectedUserGroups,
    userGroups.assignments,
    {} // parentAncestors - not needed for dashboard
  );

  // Labels for Sankey
  const {
    labels,
    isLoading: isLoadingLabels,
    fetchLabels,
    getAllLabels,
  } = useLabels(analyzer.filteredData, analyzer.issueKeyIndex);

  // Get available options for Sankey
  const availableIssueTypes = useMemo(() => {
    return Object.keys(analyzer.groupedByIssueType).sort();
  }, [analyzer.groupedByIssueType]);

  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    if (analyzer.issueKeyIndex !== -1) {
      analyzer.filteredData.forEach((row) => {
        const issueKey = row[analyzer.issueKeyIndex.toString()];
        if (issueKey) {
          const issueKeyStr = String(issueKey).trim();
          const projectMatch = issueKeyStr.match(/^([A-Z0-9]+)(?:-|$)/);
          if (projectMatch) {
            projects.add(projectMatch[1]);
          }
        }
      });
    }
    return Array.from(projects).sort();
  }, [analyzer.filteredData, analyzer.issueKeyIndex]);

  const availableIssueKeys = useMemo(() => {
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

  // Sync local state with analyzer state when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      setSummaryViewMode(analyzer.summaryViewMode);
      setSecondarySplitMode(analyzer.secondarySplitMode);
      setExcludeHolidayAbsence(analyzer.excludeHolidayAbsence);
      setExcludeStartDate(analyzer.excludeStartDate ? dayjs(analyzer.excludeStartDate) : null);
      setExcludeEndDate(analyzer.excludeEndDate ? dayjs(analyzer.excludeEndDate) : null);
      setShowOtherTeams(analyzer.showOtherTeams);
    }
  }, [isEditMode, analyzer.summaryViewMode, analyzer.secondarySplitMode, analyzer.excludeHolidayAbsence, analyzer.excludeStartDate, analyzer.excludeEndDate, analyzer.showOtherTeams]);

  // Initialize analyzer with config values on mount and when config changes
  useEffect(() => {
    // Only update if different to avoid unnecessary updates and loops
    if (analyzer.summaryViewMode !== initialSummaryViewMode) {
      analyzer.handleSummaryViewModeChange(initialSummaryViewMode);
    }
    if (analyzer.secondarySplitMode !== initialSecondarySplitMode) {
      analyzer.handleSecondarySplitModeChange(initialSecondarySplitMode);
    }
    if (analyzer.excludeHolidayAbsence !== initialExcludeHolidayAbsence) {
      analyzer.handleExcludeHolidayAbsenceChange(initialExcludeHolidayAbsence);
    }
    const initialStartDate = initialExcludeStartDate ? dayjs(initialExcludeStartDate).toDate() : null;
    if ((analyzer.excludeStartDate?.getTime() || 0) !== (initialStartDate?.getTime() || 0)) {
      analyzer.handleExcludeStartDateChange(initialStartDate);
    }
    const initialEndDate = initialExcludeEndDate ? dayjs(initialExcludeEndDate).toDate() : null;
    if ((analyzer.excludeEndDate?.getTime() || 0) !== (initialEndDate?.getTime() || 0)) {
      analyzer.handleExcludeEndDateChange(initialEndDate);
    }
    if (analyzer.showOtherTeams !== initialShowOtherTeams) {
      analyzer.handleShowOtherTeamsChange(initialShowOtherTeams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSummaryViewMode, initialSecondarySplitMode, initialExcludeHolidayAbsence, initialExcludeStartDate, initialExcludeEndDate, initialShowOtherTeams]); // Run when config changes

  const handleSaveConfig = async () => {
    try {
      // Use current values - if in edit mode, use local state (which may have been modified),
      // otherwise use analyzer state (which reflects current view)
      const currentSummaryViewMode = isEditMode ? summaryViewMode : analyzer.summaryViewMode;
      const currentSecondarySplitMode = isEditMode ? secondarySplitMode : analyzer.secondarySplitMode;
      const currentExcludeHolidayAbsence = isEditMode ? excludeHolidayAbsence : analyzer.excludeHolidayAbsence;
      const currentExcludeStartDate = isEditMode 
        ? (excludeStartDate ? excludeStartDate.toDate() : null)
        : analyzer.excludeStartDate;
      const currentExcludeEndDate = isEditMode 
        ? (excludeEndDate ? excludeEndDate.toDate() : null)
        : analyzer.excludeEndDate;
      const currentShowOtherTeams = isEditMode ? showOtherTeams : analyzer.showOtherTeams;
      
      const config: TempoAnalyzerConfig = {
        summaryViewMode: currentSummaryViewMode,
        secondarySplitMode: currentSecondarySplitMode,
        excludeHolidayAbsence: currentExcludeHolidayAbsence,
        excludeStartDate: currentExcludeStartDate ? currentExcludeStartDate.toISOString() : null,
        excludeEndDate: currentExcludeEndDate ? currentExcludeEndDate.toISOString() : null,
        showOtherTeams: currentShowOtherTeams,
        selectedUserGroups,
        sankeySelectors,
      };
      
      // Also update analyzer state to match what we're saving
      analyzer.handleSummaryViewModeChange(currentSummaryViewMode);
      analyzer.handleSecondarySplitModeChange(currentSecondarySplitMode);
      analyzer.handleExcludeHolidayAbsenceChange(currentExcludeHolidayAbsence);
      analyzer.handleExcludeStartDateChange(currentExcludeStartDate);
      analyzer.handleExcludeEndDateChange(currentExcludeEndDate);
      analyzer.handleShowOtherTeamsChange(currentShowOtherTeams);
      
      if (onConfigChange) {
        await onConfigChange(config);
      }
      
      setIsEditMode(false);
      setShowFilterControls(false);
      message.success("Configuration saved");
    } catch (error) {
      console.error("Error saving configuration:", error);
      message.error("Failed to save configuration");
    }
  };

  const handleExcludeStartDateChange = (date: any) => {
    setExcludeStartDate(date ? dayjs(date) : null);
  };

  const handleExcludeEndDateChange = (date: any) => {
    setExcludeEndDate(date ? dayjs(date) : null);
  };

  const handleCancelEdit = () => {
    // Reset to initial values
    setSummaryViewMode(initialSummaryViewMode);
    setSecondarySplitMode(initialSecondarySplitMode);
    setExcludeHolidayAbsence(initialExcludeHolidayAbsence);
    setExcludeStartDate(initialExcludeStartDate ? dayjs(initialExcludeStartDate) : null);
    setExcludeEndDate(initialExcludeEndDate ? dayjs(initialExcludeEndDate) : null);
    setShowOtherTeams(initialShowOtherTeams);
    setSelectedUserGroups(initialSelectedUserGroups);
    setSankeySelectors(initialSankeySelectors);
    setIsEditMode(false);
    setShowFilterControls(false);
  };

  const hasData = Object.keys(analyzer.groupedData).length > 0 ||
    Object.keys(analyzer.groupedByName).length > 0 ||
    Object.keys(analyzer.groupedByIssueType).length > 0 ||
    Object.keys(analyzer.groupedByAncestryType).length > 0;

  // Automatically request labels when Sankey is selected
  useEffect(() => {
    const currentViewMode = isEditMode ? summaryViewMode : analyzer.summaryViewMode;
    if (currentViewMode === "sankey" && hasData && !isLoadingLabels && Object.keys(labels).length === 0) {
      fetchLabels();
    }
  }, [analyzer.summaryViewMode, summaryViewMode, isEditMode, hasData, isLoadingLabels, labels, fetchLabels]);

  const {
    groupedData,
    selectedCategory,
    selectedUser,
    selectedAncestryType,
  } = analyzer;

  // Calculate total hours
  const totalHours = useMemo(() => {
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
            isLoading={isLoadingFiles}
            handleFileUpload={handleFileUpload}
            handleMultipleFileUpload={handleMultipleFileUpload}
          />

          <SheetManager
            sheets={sheets}
            selectedSheets={selectedSheets}
            handleSheetSelectionChange={setSelectedSheets}
            removeSheet={removeSheet}
          />

          {/* Edit Settings button outside the View Options card */}
          {hasData && !readOnly && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {isEditMode ? (
                <Space>
                  <Button onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSaveConfig}
                  >
                    Save Settings
                  </Button>
                </Space>
              ) : (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => {
                    if (!showFilterControls) {
                      setShowFilterControls(true);
                      setIsEditMode(true);
                    } else {
                      setShowFilterControls(false);
                    }
                  }}
                >
                  {showFilterControls ? "Hide Settings" : "Edit Settings"}
                </Button>
              )}
            </div>
          )}

          {/* View Options card - shown/hidden based on showFilterControls */}
          {hasData && showFilterControls && (
            <Card
              title="View Options"
            >
              <FilterControls
                summaryViewMode={isEditMode ? summaryViewMode : analyzer.summaryViewMode}
                handleSummaryViewModeChange={(mode) => {
                  analyzer.handleSummaryViewModeChange(mode);
                  if (isEditMode) {
                    setSummaryViewMode(mode);
                  }
                }}
                secondarySplitMode={isEditMode ? secondarySplitMode : analyzer.secondarySplitMode}
                handleSecondarySplitModeChange={(mode) => {
                  analyzer.handleSecondarySplitModeChange(mode);
                  if (isEditMode) {
                    setSecondarySplitMode(mode);
                  }
                }}
                excludeHolidayAbsence={isEditMode ? excludeHolidayAbsence : analyzer.excludeHolidayAbsence}
                handleExcludeHolidayAbsenceChange={(checked) => {
                  analyzer.handleExcludeHolidayAbsenceChange(checked);
                  if (isEditMode) {
                    setExcludeHolidayAbsence(checked);
                  }
                }}
                excludeStartDate={isEditMode ? excludeStartDate : analyzer.excludeStartDate}
                handleExcludeStartDateChange={(date) => {
                  analyzer.handleExcludeStartDateChange(date);
                  if (isEditMode) {
                    handleExcludeStartDateChange(date);
                  }
                }}
                excludeEndDate={isEditMode ? excludeEndDate : analyzer.excludeEndDate}
                handleExcludeEndDateChange={(date) => {
                  analyzer.handleExcludeEndDateChange(date);
                  if (isEditMode) {
                    handleExcludeEndDateChange(date);
                  }
                }}
                showOtherTeams={isEditMode ? showOtherTeams : analyzer.showOtherTeams}
                handleShowOtherTeamsChange={(checked) => {
                  analyzer.handleShowOtherTeamsChange(checked);
                  if (isEditMode) {
                    setShowOtherTeams(checked);
                  }
                }}
                hasGroupedData={Object.keys(analyzer.groupedData).length > 0}
                hasGroupedByName={Object.keys(analyzer.groupedByName).length > 0}
                hasGroupedByIssueType={Object.keys(analyzer.groupedByIssueType).length > 0}
                hasGroupedByAncestryType={Object.keys(analyzer.groupedByAncestryType).length > 0}
                userGroups={userGroups.groups}
                selectedUserGroups={selectedUserGroups}
                onUserGroupsChange={setSelectedUserGroups}
              />

                  {(isEditMode ? summaryViewMode : analyzer.summaryViewMode) === "sankey" && (
                <SankeySelector
                  availableIssueTypes={availableIssueTypes}
                  availableLabels={getAllLabels()}
                  availableProjects={availableProjects}
                  availableIssueKeys={availableIssueKeys}
                  selectors={sankeySelectors}
                  onSelectorsChange={setSankeySelectors}
                  onRequestLabels={fetchLabels}
                  isLoadingLabels={isLoadingLabels}
                />
              )}
            </Card>
          )}

          {hasData && (
            <div>
              {analyzer.summaryViewMode === "sankey" ? (
                <>
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
                  parentAncestors={{}}
                />
              )}
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default TempoAnalyzerDashboard;
