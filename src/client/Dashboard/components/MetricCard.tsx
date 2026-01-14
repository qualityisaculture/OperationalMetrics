import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Card } from "antd";
import { DashboardMetric, BitbucketPRConfig, BugsAnalysisConfig, TempoAnalyzerConfig, LeadTimeConfig } from "../types";
import LeadTime from "../../LeadTime";
import BitbucketPRAnalytics, { BitbucketPRAnalyticsRef } from "./BitbucketPRAnalytics";
import BugsAnalysisDashboard, { BugsAnalysisDashboardRef } from "./BugsAnalysisDashboard";
import TempoAnalyzerDashboard, { TempoAnalyzerConfig as TempoConfig } from "./TempoAnalyzerDashboard";
import { useDashboardConfig } from "../hooks/useDashboardConfig";

interface MetricCardProps {
  metric: DashboardMetric;
}

export interface MetricCardRef {
  requestData: () => void;
}

const MetricCard = forwardRef<MetricCardRef, MetricCardProps>(({ metric }, ref) => {
  const { updateMetric } = useDashboardConfig();
  // Create a key that changes when the config changes to force re-render
  const configKey = JSON.stringify(metric.config);
  
  const leadTimeRef = useRef<LeadTime>(null);
  const bugsAnalysisRef = useRef<BugsAnalysisDashboardRef>(null);
  const bitbucketPRRef = useRef<BitbucketPRAnalyticsRef>(null);
  
  useImperativeHandle(ref, () => ({
    requestData: () => {
      switch (metric.type) {
        case "leadTime":
          if (leadTimeRef.current) {
            leadTimeRef.current.requestData();
          }
          break;
        case "bugsAnalysis":
          if (bugsAnalysisRef.current) {
            bugsAnalysisRef.current.requestData();
          }
          break;
        case "bitbucketPR":
          if (bitbucketPRRef.current) {
            bitbucketPRRef.current.requestData();
          }
          break;
        case "tempoAnalyzer":
          // Skip Tempo Analyzer as it requires file upload
          break;
      }
    },
  }));
  
  const handleTempoConfigChange = async (config: TempoConfig) => {
    const updatedMetric: DashboardMetric = {
      ...metric,
      config: config as TempoAnalyzerConfig,
    };
    await updateMetric(metric.id, updatedMetric);
  };
  
  const handleLeadTimeConfigChange = async (config: LeadTimeConfig) => {
    const updatedMetric: DashboardMetric = {
      ...metric,
      config: config as LeadTimeConfig,
    };
    await updateMetric(metric.id, updatedMetric);
  };
  
  const renderMetric = () => {
    switch (metric.type) {
      case "leadTime":
        return (
          <LeadTime
            ref={leadTimeRef}
            key={`${metric.id}-${configKey}`}
            initialConfig={metric.config}
            readOnly={true}
            onConfigChange={handleLeadTimeConfigChange}
            uniqueId={metric.id}
          />
        );
      case "bitbucketPR":
        return (
          <BitbucketPRAnalytics
            ref={bitbucketPRRef}
            key={`${metric.id}-${configKey}`}
            workspace={(metric.config as BitbucketPRConfig).workspace}
            selectedGroup={(metric.config as BitbucketPRConfig).selectedGroup}
            readOnly={true}
          />
        );
      case "bugsAnalysis":
        return (
          <BugsAnalysisDashboard
            ref={bugsAnalysisRef}
            key={`${metric.id}-${configKey}`}
            query={(metric.config as BugsAnalysisConfig).query}
            viewMode={(metric.config as BugsAnalysisConfig).viewMode}
            readOnly={true}
          />
        );
      case "tempoAnalyzer":
        const tempoConfig = metric.config as TempoAnalyzerConfig;
        // Ensure all required fields are present with defaults
        const fullConfig: TempoAnalyzerConfig = {
          summaryViewMode: tempoConfig.summaryViewMode || "category",
          secondarySplitMode: tempoConfig.secondarySplitMode || "account",
          excludeHolidayAbsence: tempoConfig.excludeHolidayAbsence ?? false,
          excludeStartDate: tempoConfig.excludeStartDate || null,
          excludeEndDate: tempoConfig.excludeEndDate || null,
          showOtherTeams: tempoConfig.showOtherTeams ?? false,
          selectedUserGroups: tempoConfig.selectedUserGroups || [],
          sankeySelectors: tempoConfig.sankeySelectors || [],
        };
        return (
          <TempoAnalyzerDashboard
            key={`${metric.id}-${configKey}`}
            summaryViewMode={fullConfig.summaryViewMode}
            secondarySplitMode={fullConfig.secondarySplitMode}
            excludeHolidayAbsence={fullConfig.excludeHolidayAbsence}
            excludeStartDate={fullConfig.excludeStartDate}
            excludeEndDate={fullConfig.excludeEndDate}
            showOtherTeams={fullConfig.showOtherTeams}
            selectedUserGroups={fullConfig.selectedUserGroups}
            sankeySelectors={fullConfig.sankeySelectors}
            readOnly={false}
            onConfigChange={handleTempoConfigChange}
          />
        );
      default:
        return <div>Unknown metric type: {metric.type}</div>;
    }
  };

  return (
    <Card
      title={metric.name}
      style={{ marginBottom: "1rem" }}
      headStyle={{ backgroundColor: "#f0f0f0" }}
    >
      {renderMetric()}
    </Card>
  );
});

MetricCard.displayName = "MetricCard";

export default MetricCard;

