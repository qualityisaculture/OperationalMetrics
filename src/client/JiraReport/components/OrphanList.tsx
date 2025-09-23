import React from "react";
import { Card, List, Typography, Spin, Alert, Button, Tag } from "antd";

interface OrphanItem {
  key: string;
  summary: string;
  url: string;
}

interface OrphanListProps {
  orphans: OrphanItem[];
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const OrphanList: React.FC<OrphanListProps> = ({
  orphans,
  loading,
  error,
  onRefresh,
}) => {
  console.log(
    "OrphanList render - orphans:",
    orphans,
    "loading:",
    loading,
    "error:",
    error
  );

  if (loading) {
    return (
      <Card title="Orphan Detection" style={{ margin: "16px 0" }}>
        <div style={{ textAlign: "center", padding: "10px" }}>
          <Typography.Text type="secondary">
            Detecting orphans...
          </Typography.Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Orphan Detection" style={{ margin: "16px 0" }}>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            onRefresh && (
              <Button size="small" onClick={onRefresh}>
                Retry
              </Button>
            )
          }
        />
      </Card>
    );
  }

  if (orphans.length === 0) {
    return (
      <Card title="Orphan Detection" style={{ margin: "16px 0" }}>
        <Alert
          message="No Orphans Found"
          description="All linked issues have valid parent chains (HPD or D### pattern)."
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "8px" }}>⚠️</span>
          <span style={{ color: "#fa8c16" }}>
            Orphan Detection - {orphans.length} Orphan
            {orphans.length !== 1 ? "s" : ""} Found
          </span>
        </div>
      }
      style={{
        margin: "16px 0",
        borderColor: "#fa8c16",
        borderWidth: "2px",
      }}
      headStyle={{
        backgroundColor: "#fff7e6",
        borderBottomColor: "#fa8c16",
      }}
    >
      <List
        dataSource={orphans}
        renderItem={(orphan) => (
          <List.Item>
            <div style={{ width: "100%" }}>
              <div style={{ marginBottom: "4px" }}>
                <Typography.Text strong>
                  <a
                    href={orphan.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: "none",
                      color: "#1890ff",
                      fontWeight: "bold",
                    }}
                  >
                    <Tag color="orange">{orphan.key}</Tag>
                  </a>
                </Typography.Text>
                <Typography.Text style={{ marginLeft: "8px" }}>
                  {orphan.summary}
                </Typography.Text>
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default OrphanList;
