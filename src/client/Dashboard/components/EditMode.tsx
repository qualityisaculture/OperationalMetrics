import React, { useState, useEffect } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  DatePicker,
  InputNumber,
  Radio,
  Checkbox,
  Select,
  Space,
  Modal,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DashboardMetric, LeadTimeConfig, BitbucketPRConfig, BugsAnalysisConfig } from "../types";
import { useDashboardConfig } from "../hooks/useDashboardConfig";
import { useSavedQueries } from "../../BugsAnalysis/hooks/useSavedQueries";

const { Option } = Select;

// User Group Types (matching BitBucketPRs)
interface UserGroup {
  id: string;
  name: string;
  users: string[];
}

const STORAGE_KEY = "bitbucket-prs-user-groups";

// Helper function to load groups from localStorage
const loadGroupsFromStorage = (): UserGroup[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Error loading user groups from storage:", error);
  }
  return [];
};

const EditMode: React.FC = () => {
  const { selectedDashboard, addMetric, updateMetric, deleteMetric } = useDashboardConfig();
  const [editingMetric, setEditingMetric] = useState<DashboardMetric | null>(null);
  const [form] = Form.useForm();
  const [metricType, setMetricType] = useState<"leadTime" | "bitbucketPR" | "bugsAnalysis">("leadTime");
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const { savedQueries, loadQuery } = useSavedQueries();

  // Load groups from localStorage on mount
  useEffect(() => {
    const loadedGroups = loadGroupsFromStorage();
    setUserGroups(loadedGroups);
  }, []);

  const handleAddMetric = () => {
    setMetricType("leadTime");
    const newMetric: DashboardMetric = {
      id: `metric-${Date.now()}`,
      type: "leadTime",
      name: "New Lead Time Metric",
      config: {
        query: "",
        currentSprintStartDate: dayjs().toString(),
        numberOfSprints: 5,
        splitMode: "statuses",
        viewMode: "combined",
        filterNoTimeBooked: true,
        statusesSelected: [],
        ticketTypesSelected: [],
      },
    };
    setEditingMetric(newMetric);
    form.setFieldsValue({
      name: newMetric.name,
      type: "leadTime",
      query: newMetric.config.query,
      currentSprintStartDate: dayjs(newMetric.config.currentSprintStartDate),
      numberOfSprints: newMetric.config.numberOfSprints,
      splitMode: newMetric.config.splitMode,
      viewMode: newMetric.config.viewMode,
      filterNoTimeBooked: newMetric.config.filterNoTimeBooked,
      workspace: undefined,
      selectedGroup: undefined,
      savedQueryId: undefined,
    });
  };

  const handleEditMetric = (metric: DashboardMetric) => {
    setMetricType(metric.type);
    setEditingMetric(metric);
    if (metric.type === "leadTime") {
      const config = metric.config as LeadTimeConfig;
      form.setFieldsValue({
        name: metric.name,
        type: "leadTime",
        query: config.query,
        currentSprintStartDate: dayjs(config.currentSprintStartDate),
        numberOfSprints: config.numberOfSprints,
        splitMode: config.splitMode,
        viewMode: config.viewMode,
        filterNoTimeBooked: config.filterNoTimeBooked,
      });
    } else if (metric.type === "bitbucketPR") {
      const config = metric.config as BitbucketPRConfig;
      form.setFieldsValue({
        name: metric.name,
        type: "bitbucketPR",
        workspace: config.workspace || "",
        selectedGroup: config.selectedGroup || undefined,
      });
    } else if (metric.type === "bugsAnalysis") {
      const config = metric.config as BugsAnalysisConfig;
      form.setFieldsValue({
        name: metric.name,
        type: "bugsAnalysis",
        query: config.query || "",
        viewMode: config.viewMode || "count",
        savedQueryId: config.savedQueryId || undefined,
      });
    }
  };

  // Sync metricType with editingMetric when it changes
  useEffect(() => {
    if (editingMetric) {
      setMetricType(editingMetric.type);
    }
  }, [editingMetric]);

  const handleSaveMetric = async () => {
    try {
      const values = await form.validateFields();
      const type = values.type || metricType;
      
      let config: LeadTimeConfig | BitbucketPRConfig;
      
      if (type === "leadTime") {
        config = {
          query: values.query,
          currentSprintStartDate: values.currentSprintStartDate.toString(),
          numberOfSprints: values.numberOfSprints,
          splitMode: values.splitMode,
          viewMode: values.viewMode,
          filterNoTimeBooked: values.filterNoTimeBooked ?? true,
          statusesSelected: (editingMetric?.type === "leadTime" && (editingMetric.config as LeadTimeConfig).statusesSelected) || [],
          ticketTypesSelected: (editingMetric?.type === "leadTime" && (editingMetric.config as LeadTimeConfig).ticketTypesSelected) || [],
        };
      } else if (type === "bugsAnalysis") {
        config = {
          query: values.query || "",
          viewMode: values.viewMode || "count",
          savedQueryId: values.savedQueryId || undefined,
        };
      } else {
        config = {
          workspace: values.workspace || undefined,
          selectedGroup: values.selectedGroup || undefined,
        };
      }

      const updatedMetric: DashboardMetric = {
        ...editingMetric!,
        type,
        name: values.name,
        config,
      };

      // Check if this is an existing metric (has an ID that exists in selected dashboard)
      const isExisting = editingMetric && selectedDashboard?.metrics.find((m) => m.id === editingMetric.id);
      
      if (isExisting) {
        await updateMetric(editingMetric.id, updatedMetric);
        message.success("Metric updated successfully");
      } else {
        await addMetric(updatedMetric);
        message.success("Metric added successfully");
      }

      setEditingMetric(null);
      form.resetFields();
      setMetricType("leadTime");
    } catch (error) {
      console.error("Error saving metric:", error);
      message.error("Failed to save metric");
    }
  };

  const handleDeleteMetric = (id: string) => {
    Modal.confirm({
      title: "Delete Metric",
      content: "Are you sure you want to delete this metric?",
      onOk: async () => {
        try {
          await deleteMetric(id);
          message.success("Metric deleted successfully");
        } catch (error) {
          message.error("Failed to delete metric");
        }
      },
    });
  };

  const handleCancel = () => {
    setEditingMetric(null);
    form.resetFields();
    setMetricType("leadTime");
  };

  const handleTypeChange = (newType: "leadTime" | "bitbucketPR" | "bugsAnalysis") => {
    setMetricType(newType);
    // Update the editing metric type
    if (editingMetric) {
      const nameMap = {
        leadTime: "New Lead Time Metric",
        bitbucketPR: "New Bitbucket PR Metric",
        bugsAnalysis: "New Bugs Analysis Metric",
      };
      setEditingMetric({
        ...editingMetric,
        type: newType,
        name: nameMap[newType],
      });
    }
    // Reset form fields when type changes
    if (newType === "leadTime") {
      form.setFieldsValue({
        name: "New Lead Time Metric",
        type: "leadTime",
        query: "",
        currentSprintStartDate: dayjs(),
        numberOfSprints: 5,
        splitMode: "statuses",
        viewMode: "combined",
        filterNoTimeBooked: true,
        workspace: undefined,
        selectedGroup: undefined,
        savedQueryId: undefined,
      });
    } else if (newType === "bitbucketPR") {
      form.setFieldsValue({
        name: "New Bitbucket PR Metric",
        type: "bitbucketPR",
        query: undefined,
        currentSprintStartDate: undefined,
        numberOfSprints: undefined,
        splitMode: undefined,
        viewMode: undefined,
        filterNoTimeBooked: undefined,
        workspace: "",
        selectedGroup: undefined,
        savedQueryId: undefined,
      });
    } else {
      form.setFieldsValue({
        name: "New Bugs Analysis Metric",
        type: "bugsAnalysis",
        query: "",
        viewMode: "count",
        savedQueryId: undefined,
        currentSprintStartDate: undefined,
        numberOfSprints: undefined,
        splitMode: undefined,
        filterNoTimeBooked: undefined,
        workspace: undefined,
        selectedGroup: undefined,
      });
    }
  };

  const handleSavedQueryChange = (queryId: string) => {
    const loadedQuery = loadQuery(queryId);
    if (loadedQuery) {
      form.setFieldsValue({
        query: loadedQuery,
        savedQueryId: queryId,
      });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Configure Dashboard Metrics</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMetric}>
          Add Metric
        </Button>
      </div>

      {selectedDashboard?.metrics.map((metric) => (
        <Card
          key={metric.id}
          style={{ marginBottom: "1rem" }}
          title={metric.name}
          extra={
            <Space>
              <Button onClick={() => handleEditMetric(metric)}>Edit</Button>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteMetric(metric.id)}
              >
                Delete
              </Button>
            </Space>
          }
        >
          <div>
            <p>
              <strong>Type:</strong> {metric.type}
            </p>
            {metric.type === "leadTime" && (
              <>
                <p>
                  <strong>Query:</strong> {(metric.config as LeadTimeConfig).query || "Not set"}
                </p>
                <p>
                  <strong>Sprint Start Date:</strong>{" "}
                  {dayjs((metric.config as LeadTimeConfig).currentSprintStartDate).format("YYYY-MM-DD")}
                </p>
                <p>
                  <strong>Number of Sprints:</strong> {(metric.config as LeadTimeConfig).numberOfSprints}
                </p>
                <p>
                  <strong>Split Mode:</strong> {(metric.config as LeadTimeConfig).splitMode}
                </p>
                <p>
                  <strong>View Mode:</strong> {(metric.config as LeadTimeConfig).viewMode}
                </p>
                <p>
                  <strong>Filter No Time Booked:</strong>{" "}
                  {(metric.config as LeadTimeConfig).filterNoTimeBooked ? "Yes" : "No"}
                </p>
              </>
            )}
            {metric.type === "bitbucketPR" && (
              <>
                <p>
                  <strong>Workspace:</strong> {(metric.config as BitbucketPRConfig).workspace || "Not set (optional)"}
                </p>
                <p>
                  <strong>Filter Group:</strong> {
                    (() => {
                      const groupId = (metric.config as BitbucketPRConfig).selectedGroup;
                      if (!groupId) return "Not set (optional)";
                      const group = userGroups.find(g => g.id === groupId);
                      return group ? group.name : "Unknown group";
                    })()
                  }
                </p>
              </>
            )}
            {metric.type === "bugsAnalysis" && (
              <>
                <p>
                  <strong>Query:</strong> {(metric.config as BugsAnalysisConfig).query || "Not set"}
                </p>
                <p>
                  <strong>View Mode:</strong> {(metric.config as BugsAnalysisConfig).viewMode || "count"}
                </p>
                {(metric.config as BugsAnalysisConfig).savedQueryId && (
                  <p>
                    <strong>Saved Query:</strong> {
                      (() => {
                        const savedQueryId = (metric.config as BugsAnalysisConfig).savedQueryId;
                        const savedQuery = savedQueries.find(q => q.id === savedQueryId);
                        return savedQuery ? savedQuery.name : "Unknown query";
                      })()
                    }
                  </p>
                )}
              </>
            )}
          </div>
        </Card>
      ))}

      {(!selectedDashboard || selectedDashboard.metrics.length === 0) && (
        <Card>
          <p>No metrics configured. Click "Add Metric" to get started.</p>
        </Card>
      )}

      <Modal
        title={editingMetric && selectedDashboard?.metrics.find((m) => m.id === editingMetric.id) ? "Edit Metric" : "Add Metric"}
        open={editingMetric !== null}
        onOk={handleSaveMetric}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Metric Name"
            rules={[{ required: true, message: "Please enter a metric name" }]}
          >
            <Input placeholder="Enter metric name" />
          </Form.Item>

          {editingMetric && (!selectedDashboard || !selectedDashboard.metrics.find((m) => m.id === editingMetric.id)) && (
            <Form.Item
              name="type"
              label="Metric Type"
              rules={[{ required: true }]}
              initialValue={metricType}
            >
              <Select onChange={handleTypeChange}>
                <Option value="leadTime">Lead Time</Option>
                <Option value="bitbucketPR">Bitbucket PR</Option>
                <Option value="bugsAnalysis">Bugs Analysis</Option>
              </Select>
            </Form.Item>
          )}

          {metricType === "leadTime" && (
            <>
              <Form.Item
                name="query"
                label="JQL Query"
                rules={[{ required: true, message: "Please enter a JQL query" }]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Enter JQL query (e.g., project = PROJ AND status = Done)"
                />
              </Form.Item>

              <Form.Item
                name="currentSprintStartDate"
                label="Sprint Start Date"
                rules={[{ required: true, message: "Please select a sprint start date" }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="numberOfSprints"
                label="Number of Sprints"
                rules={[{ required: true, message: "Please enter number of sprints" }]}
              >
                <InputNumber min={1} max={20} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                name="splitMode"
                label="Split Mode"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="timebooked">TimeBooked</Radio>
                  <Radio value="statuses">Statuses</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item
                name="viewMode"
                label="View Mode"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="sprint">Split by Sprint</Radio>
                  <Radio value="combined">All Data Together</Radio>
                </Radio.Group>
              </Form.Item>

              <Form.Item name="filterNoTimeBooked" valuePropName="checked">
                <Checkbox>Filter out issues with no time booked</Checkbox>
              </Form.Item>
            </>
          )}

          {metricType === "bitbucketPR" && (
            <>
              <Form.Item
                name="workspace"
                label="Workspace (Optional)"
                help="Bitbucket workspace name. Leave empty for BitBucket Server."
              >
                <Input placeholder="Enter workspace name (optional)" />
              </Form.Item>
              <Form.Item
                name="selectedGroup"
                label="Filter Group (Optional)"
                help="Select a user group to filter PRs by. Leave empty to show all PRs."
              >
                <Select
                  placeholder="Select a group (optional)"
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const label =
                      typeof option?.label === "string"
                        ? option.label
                        : String(option?.label ?? "");
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {userGroups.map((group) => (
                    <Option key={group.id} value={group.id} label={group.name}>
                      {group.name} ({group.users.length} user
                      {group.users.length !== 1 ? "s" : ""})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          {metricType === "bugsAnalysis" && (
            <>
              <Form.Item
                name="savedQueryId"
                label="Saved Query (Optional)"
                help="Select a saved query to use, or enter a custom JQL query below."
              >
                <Select
                  placeholder="Select a saved query (optional)"
                  allowClear
                  showSearch
                  onChange={handleSavedQueryChange}
                  filterOption={(input, option) => {
                    const label =
                      typeof option?.label === "string"
                        ? option.label
                        : String(option?.label ?? "");
                    return label.toLowerCase().includes(input.toLowerCase());
                  }}
                >
                  {savedQueries.map((savedQuery) => (
                    <Option key={savedQuery.id} value={savedQuery.id} label={savedQuery.name}>
                      {savedQuery.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="query"
                label="JQL Query"
                rules={[{ required: true, message: "Please enter a JQL query" }]}
                help="Enter a JQL query to analyze bugs (e.g., project = 'PROJ' AND type = Bug)"
              >
                <Input.TextArea
                  rows={3}
                  placeholder="Enter a JQL query to analyze bugs"
                />
              </Form.Item>
              <Form.Item
                name="viewMode"
                label="View Mode"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="count">Count (Resolved vs Unresolved)</Radio>
                  <Radio value="averageTimeSpent">Average Time Spent</Radio>
                </Radio.Group>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default EditMode;

