import React from "react";
import { Card } from "antd";
import { DashboardMetric, BitbucketPRConfig, BugsAnalysisConfig } from "../types";
import LeadTime from "../../LeadTime";
import BitbucketPRAnalytics from "./BitbucketPRAnalytics";
import BugsAnalysisDashboard from "./BugsAnalysisDashboard";

interface MetricCardProps {
  metric: DashboardMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  // Create a key that changes when the config changes to force re-render
  const configKey = JSON.stringify(metric.config);
  
  const renderMetric = () => {
    switch (metric.type) {
      case "leadTime":
        return (
          <LeadTime
            key={`${metric.id}-${configKey}`}
            initialConfig={metric.config}
            readOnly={true}
          />
        );
      case "bitbucketPR":
        return (
          <BitbucketPRAnalytics
            key={`${metric.id}-${configKey}`}
            workspace={(metric.config as BitbucketPRConfig).workspace}
            selectedGroup={(metric.config as BitbucketPRConfig).selectedGroup}
            readOnly={true}
          />
        );
      case "bugsAnalysis":
        return (
          <BugsAnalysisDashboard
            key={`${metric.id}-${configKey}`}
            query={(metric.config as BugsAnalysisConfig).query}
            viewMode={(metric.config as BugsAnalysisConfig).viewMode}
            readOnly={true}
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
};

export default MetricCard;

