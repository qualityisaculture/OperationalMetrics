import React, { useState } from "react";
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
import { DashboardMetric, LeadTimeConfig } from "../types";
import { useDashboardConfig } from "../hooks/useDashboardConfig";

const { Option } = Select;

const EditMode: React.FC = () => {
  const { selectedDashboard, addMetric, updateMetric, deleteMetric } = useDashboardConfig();
  const [editingMetric, setEditingMetric] = useState<DashboardMetric | null>(null);
  const [form] = Form.useForm();

  const handleAddMetric = () => {
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
      query: newMetric.config.query,
      currentSprintStartDate: dayjs(newMetric.config.currentSprintStartDate),
      numberOfSprints: newMetric.config.numberOfSprints,
      splitMode: newMetric.config.splitMode,
      viewMode: newMetric.config.viewMode,
      filterNoTimeBooked: newMetric.config.filterNoTimeBooked,
    });
  };

  const handleEditMetric = (metric: DashboardMetric) => {
    setEditingMetric(metric);
    form.setFieldsValue({
      name: metric.name,
      query: metric.config.query,
      currentSprintStartDate: dayjs(metric.config.currentSprintStartDate),
      numberOfSprints: metric.config.numberOfSprints,
      splitMode: metric.config.splitMode,
      viewMode: metric.config.viewMode,
      filterNoTimeBooked: metric.config.filterNoTimeBooked,
    });
  };

  const handleSaveMetric = async () => {
    try {
      const values = await form.validateFields();
      const leadTimeConfig: LeadTimeConfig = {
        query: values.query,
        currentSprintStartDate: values.currentSprintStartDate.toString(),
        numberOfSprints: values.numberOfSprints,
        splitMode: values.splitMode,
        viewMode: values.viewMode,
        filterNoTimeBooked: values.filterNoTimeBooked ?? true,
        statusesSelected: editingMetric?.config.statusesSelected || [],
        ticketTypesSelected: editingMetric?.config.ticketTypesSelected || [],
      };

      const updatedMetric: DashboardMetric = {
        ...editingMetric!,
        name: values.name,
        config: leadTimeConfig,
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
            <p>
              <strong>Query:</strong> {metric.config.query || "Not set"}
            </p>
            <p>
              <strong>Sprint Start Date:</strong>{" "}
              {dayjs(metric.config.currentSprintStartDate).format("YYYY-MM-DD")}
            </p>
            <p>
              <strong>Number of Sprints:</strong> {metric.config.numberOfSprints}
            </p>
            <p>
              <strong>Split Mode:</strong> {metric.config.splitMode}
            </p>
            <p>
              <strong>View Mode:</strong> {metric.config.viewMode}
            </p>
            <p>
              <strong>Filter No Time Booked:</strong>{" "}
              {metric.config.filterNoTimeBooked ? "Yes" : "No"}
            </p>
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
        </Form>
      </Modal>
    </div>
  );
};

export default EditMode;

