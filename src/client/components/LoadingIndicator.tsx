import React from "react";
import { Spin, Card, Typography, Tag } from "antd";

const { Text } = Typography;

interface ProgressDetails {
  currentLevel: number;
  totalLevels: number;
  currentIssues: string[];
  totalIssues: number;
  apiCallsMade: number;
  totalApiCalls: number;
  currentPhase: string;
  phaseProgress: number;
  phaseTotal: number;
}

interface LoadingIndicatorProps {
  loading: boolean;
  message?: string;
  progressDetails?: ProgressDetails;
  size?: "small" | "default" | "large";
  showProgressDetails?: boolean;
  style?: React.CSSProperties;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loading,
  message = "Loading...",
  progressDetails,
  size = "default",
  showProgressDetails = true,
  style,
}) => {
  if (!loading) {
    return null;
  }

  return (
    <div style={{ textAlign: "center", padding: "20px", ...style }}>
      <Spin size={size} />
      <div style={{ marginTop: "8px" }}>{message}</div>

      {/* Detailed Progress Information */}
      {showProgressDetails && progressDetails && (
        <div
          style={{
            marginTop: "16px",
            textAlign: "left",
            maxWidth: "600px",
            margin: "16px auto",
          }}
        >
          <Card size="small" title="Progress Details">
            {/* Current Phase */}
            <div style={{ marginBottom: "12px" }}>
              <Text strong>Current Phase: </Text>
              <Tag color="blue">{progressDetails.currentPhase}</Tag>
              <Text type="secondary" style={{ marginLeft: "8px" }}>
                {progressDetails.phaseProgress} / {progressDetails.phaseTotal}
              </Text>
            </div>

            {/* Level Information */}
            {progressDetails.currentLevel > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <Text strong>Processing Level: </Text>
                <Tag color="green">{progressDetails.currentLevel}</Tag>
                {progressDetails.totalLevels > 0 && (
                  <Text type="secondary" style={{ marginLeft: "8px" }}>
                    of {progressDetails.totalLevels}
                  </Text>
                )}
              </div>
            )}

            {/* Issue Counts */}
            {progressDetails.totalIssues > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <Text strong>Issues in Current Level: </Text>
                <Tag color="orange">{progressDetails.totalIssues}</Tag>
                {progressDetails.currentIssues.length > 0 && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {progressDetails.currentIssues.slice(0, 5).join(", ")}
                    {progressDetails.currentIssues.length > 5 && "..."}
                  </div>
                )}
              </div>
            )}

            {/* API Call Progress */}
            {progressDetails.apiCallsMade > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <Text strong>API Calls Made: </Text>
                <Tag color="purple">{progressDetails.apiCallsMade}</Tag>
                {progressDetails.totalApiCalls > 0 && (
                  <Text type="secondary" style={{ marginLeft: "8px" }}>
                    of {progressDetails.totalApiCalls}
                  </Text>
                )}
              </div>
            )}

            {/* Progress Bar for Current Phase */}
            {progressDetails.phaseTotal > 1 && (
              <div style={{ marginTop: "16px" }}>
                <Text strong>Phase Progress:</Text>
                <div style={{ marginTop: "8px" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          (progressDetails.phaseProgress /
                            progressDetails.phaseTotal) *
                          100
                        }%`,
                        height: "100%",
                        backgroundColor: "#1890ff",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default LoadingIndicator;
