import React, { useState } from "react";
import { Card, Button, Select, Space, Typography, Input } from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";

const { Option } = Select;
const { Text } = Typography;

export interface SankeySelectorConfig {
  id: string;
  name?: string;
  type: "Type" | "Label" | "Project" | "Key" | "Account Category";
  selectedValues: string[];
}

interface SankeySelectorProps {
  availableIssueTypes: string[];
  availableLabels: string[];
  availableProjects: string[];
  availableIssueKeys: string[];
  availableAccountCategories: string[];
  selectors: SankeySelectorConfig[];
  onSelectorsChange: (selectors: SankeySelectorConfig[]) => void;
  onRequestLabels: () => void;
  isLoadingLabels: boolean;
}

export const SankeySelector: React.FC<SankeySelectorProps> = ({
  availableIssueTypes,
  availableLabels,
  availableProjects,
  availableIssueKeys,
  availableAccountCategories,
  selectors,
  onSelectorsChange,
  onRequestLabels,
  isLoadingLabels,
}) => {
  const addSelector = () => {
    const newSelector: SankeySelectorConfig = {
      id: `selector-${Date.now()}-${Math.random()}`,
      name: "",
      type: "Type",
      selectedValues: [],
    };
    onSelectorsChange([...selectors, newSelector]);
  };

  const removeSelector = (id: string) => {
    onSelectorsChange(selectors.filter((s) => s.id !== id));
  };

  const updateSelector = (
    id: string,
    updates: Partial<SankeySelectorConfig>
  ) => {
    onSelectorsChange(
      selectors.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const moveSelectorUp = (index: number) => {
    if (index === 0) return; // Can't move first item up
    const newSelectors = [...selectors];
    [newSelectors[index - 1], newSelectors[index]] = [
      newSelectors[index],
      newSelectors[index - 1],
    ];
    onSelectorsChange(newSelectors);
  };

  const moveSelectorDown = (index: number) => {
    if (index === selectors.length - 1) return; // Can't move last item down
    const newSelectors = [...selectors];
    [newSelectors[index], newSelectors[index + 1]] = [
      newSelectors[index + 1],
      newSelectors[index],
    ];
    onSelectorsChange(newSelectors);
  };

  return (
    <Card
      title="Sankey Selectors"
      size="small"
      style={{ marginTop: "16px" }}
      extra={
        <Space>
          <Button
            onClick={onRequestLabels}
            loading={isLoadingLabels}
            size="small"
          >
            Request Labels
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={addSelector}
            size="small"
          >
            Add Selector
          </Button>
        </Space>
      }
    >
      {selectors.length === 0 ? (
        <Text type="secondary">
          No selectors configured. Click "Add Selector" to create one.
        </Text>
      ) : (
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          {selectors.map((selector, index) => (
            <Card
              key={selector.id}
              size="small"
              style={{ backgroundColor: "#fafafa" }}
              title={
                <Text strong>
                  {selector.name || `Selector ${index + 1}`}{" "}
                  {selector.type && `(${selector.type})`}
                </Text>
              }
              extra={
                <Space>
                  <Button
                    type="text"
                    icon={<ArrowUpOutlined />}
                    onClick={() => moveSelectorUp(index)}
                    disabled={index === 0}
                    size="small"
                    title="Move up"
                  />
                  <Button
                    type="text"
                    icon={<ArrowDownOutlined />}
                    onClick={() => moveSelectorDown(index)}
                    disabled={index === selectors.length - 1}
                    size="small"
                    title="Move down"
                  />
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeSelector(selector.id)}
                    size="small"
                  />
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: "100%" }}>
                <div>
                  <Text strong style={{ marginRight: "8px" }}>
                    Name:
                  </Text>
                  <Input
                    placeholder="Enter selector name (optional)"
                    value={selector.name || ""}
                    onChange={(e) =>
                      updateSelector(selector.id, { name: e.target.value })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <Text strong style={{ marginRight: "8px" }}>
                    Type:
                  </Text>
                  <Select
                    value={selector.type}
                    onChange={(value) =>
                      updateSelector(selector.id, {
                        type: value as "Type" | "Label" | "Project" | "Key" | "Account Category",
                        selectedValues: [], // Clear selected values when type changes
                      })
                    }
                    style={{ width: "200px" }}
                  >
                    <Option value="Type">Type</Option>
                    <Option value="Label">Label</Option>
                    <Option value="Project">Project</Option>
                    <Option value="Key">Key</Option>
                    <Option value="Account Category">Account Category</Option>
                  </Select>
                </div>
                <div>
                  <Text strong style={{ marginRight: "8px" }}>
                    {selector.type === "Type"
                      ? "Select Issue Types:"
                      : selector.type === "Label"
                        ? "Select Labels:"
                        : selector.type === "Project"
                          ? "Select Projects:"
                          : selector.type === "Key"
                            ? "Select Issue Keys:"
                            : "Select Account Categories:"}
                  </Text>
                  <Select
                    mode="multiple"
                    placeholder={
                      selector.type === "Type"
                        ? "Select issue types"
                        : selector.type === "Label"
                          ? "Select labels"
                          : selector.type === "Project"
                            ? "Select projects"
                            : selector.type === "Key"
                              ? "Select issue keys"
                              : "Select account categories"
                    }
                    value={selector.selectedValues}
                    onChange={(values) =>
                      updateSelector(selector.id, { selectedValues: values })
                    }
                    style={{ width: "100%" }}
                    allowClear
                    disabled={
                      (selector.type === "Label" &&
                        availableLabels.length === 0) ||
                      (selector.type === "Project" &&
                        availableProjects.length === 0) ||
                      (selector.type === "Key" &&
                        availableIssueKeys.length === 0) ||
                      (selector.type === "Account Category" &&
                        availableAccountCategories.length === 0)
                    }
                  >
                    {selector.type === "Type"
                      ? availableIssueTypes.map((type) => (
                          <Option key={type} value={type}>
                            {type}
                          </Option>
                        ))
                      : selector.type === "Label"
                        ? availableLabels.map((label) => (
                            <Option key={label} value={label}>
                              {label}
                            </Option>
                          ))
                        : selector.type === "Project"
                          ? availableProjects.map((project) => (
                              <Option key={project} value={project}>
                                {project}
                              </Option>
                            ))
                          : selector.type === "Key"
                            ? availableIssueKeys.map((key) => (
                                <Option key={key} value={key}>
                                  {key}
                                </Option>
                              ))
                            : availableAccountCategories.map((category) => (
                                <Option key={category} value={category}>
                                  {category}
                                </Option>
                              ))}
                  </Select>
                  {selector.type === "Label" &&
                    availableLabels.length === 0 && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        No labels available. Click "Request Labels" to fetch
                        labels for issues.
                      </Text>
                    )}
                  {selector.type === "Project" &&
                    availableProjects.length === 0 && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        No projects available. Projects are extracted from issue
                        keys.
                      </Text>
                    )}
                  {selector.type === "Key" &&
                    availableIssueKeys.length === 0 && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        No issue keys available.
                      </Text>
                    )}
                  {selector.type === "Account Category" &&
                    availableAccountCategories.length === 0 && (
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        No account categories available.
                      </Text>
                    )}
                </div>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};
