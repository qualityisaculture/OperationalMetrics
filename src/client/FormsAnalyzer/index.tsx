import React from "react";
import { Card, Space, Typography, Tabs } from "antd";

import { useFormsProcessor } from "./hooks/useFormsProcessor";
import { useQuestionAnalysis } from "./hooks/useQuestionAnalysis";
import { FileUpload } from "./components/FileUpload";
import { DataOverview } from "./components/DataOverview";
import { RawDataTable } from "./components/RawDataTable";
import { QuestionAnalysis } from "./components/QuestionAnalysis";
import { ActiveFilters } from "./components/ActiveFilters";

const { Title } = Typography;
const { TabPane } = Tabs;

const FormsAnalyzer: React.FC = () => {
  const {
    formsData,
    isLoading,
    handleFileUpload,
    selectedSheets,
    setSelectedSheets,
    removeSheet,
  } = useFormsProcessor();

  const {
    questionAnalysis,
    activeFilters,
    filteredData,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
  } = useQuestionAnalysis(formsData);

  // Use filtered data if filters are active, otherwise use original data
  const displayData = activeFilters.length > 0 ? filteredData : formsData;

  return (
    <div style={{ padding: "20px" }}>
      <Card>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Title level={2}>Microsoft Forms Analyzer</Title>

          <FileUpload
            isLoading={isLoading}
            handleFileUpload={handleFileUpload}
          />

          {formsData.length > 0 && (
            <>
              <DataOverview formsData={formsData} />

              {/* Active Filters Display */}
              <ActiveFilters
                activeFilters={activeFilters}
                originalData={formsData}
                filteredData={filteredData}
                onRemoveFilter={removeFilter}
                onClearAllFilters={clearAllFilters}
              />

              {/* Main Content Tabs */}
              <Tabs defaultActiveKey="analysis" size="large">
                <TabPane tab="Question Analysis" key="analysis">
                  <QuestionAnalysis
                    questionAnalysis={questionAnalysis}
                    activeFilters={activeFilters}
                    onAddFilter={addFilter}
                    onUpdateFilter={updateFilter}
                    onRemoveFilter={removeFilter}
                    onClearAllFilters={clearAllFilters}
                  />
                </TabPane>

                <TabPane tab="Data Table" key="table">
                  <RawDataTable formsData={displayData} />
                </TabPane>
              </Tabs>
            </>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default FormsAnalyzer;
