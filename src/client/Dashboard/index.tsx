import React, { useState } from "react";
import {
  Button,
  Spin,
  Alert,
  Select,
  Space,
  Dropdown,
  MenuProps,
  message,
  Modal,
  Input,
} from "antd";
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useDashboardConfig } from "./hooks/useDashboardConfig";
import MetricCard from "./components/MetricCard";
import EditMode from "./components/EditMode";

const Dashboard: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newDashboardName, setNewDashboardName] = useState<string>("");
  const {
    config,
    selectedDashboard,
    selectedDashboardId,
    loading,
    error,
    selectDashboard,
    createDashboard,
    duplicateDashboard,
    deleteDashboard,
  } = useDashboardConfig();

  const handleCreateDashboard = async () => {
    if (!newDashboardName.trim()) {
      message.error("Please enter a dashboard name");
      return;
    }

    try {
      await createDashboard(newDashboardName.trim());
      setCreateModalVisible(false);
      setNewDashboardName("");
      message.success("Dashboard created successfully");
    } catch (err) {
      message.error("Failed to create dashboard");
    }
  };

  const handleDuplicateDashboard = async (dashboardId: string) => {
    try {
      await duplicateDashboard(dashboardId);
      message.success("Dashboard duplicated successfully");
    } catch (err) {
      message.error("Failed to duplicate dashboard");
    }
  };

  const handleDeleteDashboard = (dashboardId: string) => {
    const dashboard = config.dashboards.find((d) => d.id === dashboardId);
    Modal.confirm({
      title: "Delete Dashboard",
      content: `Are you sure you want to delete "${dashboard?.name}"? This action cannot be undone.`,
      onOk: async () => {
        try {
          await deleteDashboard(dashboardId);
          message.success("Dashboard deleted successfully");
        } catch (err) {
          message.error("Failed to delete dashboard");
        }
      },
    });
  };

  const dashboardMenuItems = (dashboardId: string): MenuProps["items"] => [
    {
      key: "duplicate",
      label: "Duplicate",
      icon: <CopyOutlined />,
      onClick: () => handleDuplicateDashboard(dashboardId),
    },
    {
      key: "delete",
      label: "Delete",
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDeleteDashboard(dashboardId),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <Spin size="large" />
        <p>Loading dashboard configuration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Dashboard"
        description={error}
        type="error"
        showIcon
        style={{ margin: "1rem" }}
      />
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <Select
            style={{ minWidth: 200 }}
            value={selectedDashboardId}
            onChange={selectDashboard}
            placeholder="Select a dashboard"
            options={config.dashboards.map((d) => ({
              value: d.id,
              label: d.name,
            }))}
            notFoundContent={
              <div style={{ padding: "0.5rem", textAlign: "center" }}>
                No dashboards found
              </div>
            }
          />
          {selectedDashboardId && (
            <Dropdown
              menu={{ items: dashboardMenuItems(selectedDashboardId) }}
              trigger={["click"]}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </div>
        <Space>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            New Dashboard
          </Button>
          {selectedDashboardId && (
            <Button
              type={isEditMode ? "default" : "primary"}
              icon={isEditMode ? <EyeOutlined /> : <EditOutlined />}
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? "View Mode" : "Edit Mode"}
            </Button>
          )}
        </Space>
      </div>

      {!selectedDashboardId ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
            {config.dashboards.length === 0
              ? "No dashboards created yet."
              : "Please select a dashboard."}
          </p>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            Create Dashboard
          </Button>
        </div>
       ) : isEditMode ? (
         <EditMode />
       ) : (
         <div>
           {selectedDashboard && selectedDashboard.metrics.length === 0 ? (
             <div
               style={{
                 textAlign: "center",
                 padding: "3rem",
                 backgroundColor: "#f5f5f5",
                 borderRadius: "4px",
               }}
             >
               <p style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                 No metrics configured yet.
               </p>
               <Button
                 type="primary"
                 icon={<EditOutlined />}
                 onClick={() => setIsEditMode(true)}
               >
                 Configure Metrics
               </Button>
             </div>
           ) : (
             selectedDashboard?.metrics.map((metric) => {
               // Create a key that includes the config to force re-render when config changes
               const configKey = JSON.stringify(metric.config);
               return (
                 <MetricCard
                   key={`${metric.id}-${configKey}`}
                   metric={metric}
                 />
               );
             })
           )}
         </div>
       )}

      <Modal
        title="Create New Dashboard"
        open={createModalVisible}
        onOk={handleCreateDashboard}
        onCancel={() => {
          setCreateModalVisible(false);
          setNewDashboardName("");
        }}
        okText="Create"
      >
        <Input
          placeholder="Enter dashboard name"
          value={newDashboardName}
          onChange={(e) => setNewDashboardName(e.target.value)}
          onPressEnter={handleCreateDashboard}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
