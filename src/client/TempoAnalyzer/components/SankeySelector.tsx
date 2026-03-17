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

export type SankeyMatcherType =
  | "Type"
  | "Label"
  | "Project"
  | "Key"
  | "Account Category"
  | "Account"
  | "AncestryType";

export interface SankeyMatcher {
  type: SankeyMatcherType;
  selectedValues: string[];
}

/** Backwards compatible: supports legacy single matcher (type + selectedValues) or new multi-matcher (matchers array). */
export interface SankeySelectorConfig {
  id: string;
  name?: string;
  /** @deprecated Use matchers. Kept for backwards compatibility when loading from JSON. */
  type?: SankeyMatcherType;
  /** @deprecated Use matchers. Kept for backwards compatibility when loading from JSON. */
  selectedValues?: string[];
  /** Multiple matchers: row matches selector if it matches ANY matcher (OR). */
  matchers?: SankeyMatcher[];
}

/** Get matchers array from a selector, normalizing legacy type/selectedValues into matchers. */
export function getMatchers(selector: SankeySelectorConfig): SankeyMatcher[] {
  if (selector.matchers && selector.matchers.length > 0) {
    return selector.matchers;
  }
  if (selector.type != null) {
    return [
      {
        type: selector.type,
        selectedValues: selector.selectedValues ?? [],
      },
    ];
  }
  return [];
}

/** Normalize selector to always have matchers (for backwards compat when loading from JSON). */
export function normalizeSankeySelector(selector: SankeySelectorConfig): SankeySelectorConfig {
  const matchers = getMatchers(selector);
  if (matchers.length === 0) {
    return { ...selector, matchers: [{ type: "Type", selectedValues: [] }] };
  }
  const { type: _t, selectedValues: _v, ...rest } = selector;
  return { ...rest, matchers };
}

export function normalizeSankeySelectors(selectors: SankeySelectorConfig[]): SankeySelectorConfig[] {
  return selectors.map(normalizeSankeySelector);
}

interface SankeySelectorProps {
  availableIssueTypes: string[];
  availableLabels: string[];
  availableProjects: string[];
  availableIssueKeys: string[];
  availableAccountCategories: string[];
  availableAccounts: string[];
  availableAncestryTypes: string[];
  selectors: SankeySelectorConfig[];
  onSelectorsChange: (selectors: SankeySelectorConfig[]) => void;
  onRequestLabels: () => void;
  isLoadingLabels: boolean;
  onRequestAncestors: () => void;
  isLoadingAncestors: boolean;
}

export const SankeySelector: React.FC<SankeySelectorProps> = ({
  availableIssueTypes,
  availableLabels,
  availableProjects,
  availableIssueKeys,
  availableAccountCategories,
  availableAccounts,
  availableAncestryTypes,
  selectors,
  onSelectorsChange,
  onRequestLabels,
  isLoadingLabels,
  onRequestAncestors,
  isLoadingAncestors,
}) => {
  const addSelector = () => {
    const newSelector: SankeySelectorConfig = {
      id: `selector-${Date.now()}-${Math.random()}`,
      name: "",
      matchers: [{ type: "Type", selectedValues: [] }],
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

  const updateMatchers = (id: string, matchers: SankeyMatcher[]) => {
    onSelectorsChange(
      selectors.map((s) =>
        s.id === id ? { ...s, matchers, type: undefined, selectedValues: undefined } : s
      )
    );
  };

  const addMatcher = (selectorId: string) => {
    const selector = selectors.find((s) => s.id === selectorId);
    if (!selector) return;
    const matchers = getMatchers(selector);
    updateMatchers(selectorId, [...matchers, { type: "Type", selectedValues: [] }]);
  };

  const removeMatcher = (selectorId: string, matcherIndex: number) => {
    const selector = selectors.find((s) => s.id === selectorId);
    if (!selector) return;
    const matchers = getMatchers(selector);
    if (matchers.length <= 1) return;
    updateMatchers(
      selectorId,
      matchers.filter((_, i) => i !== matcherIndex)
    );
  };

  const updateMatcher = (
    selectorId: string,
    matcherIndex: number,
    updates: Partial<SankeyMatcher>
  ) => {
    const selector = selectors.find((s) => s.id === selectorId);
    if (!selector) return;
    const matchers = getMatchers(selector).map((m, i) =>
      i === matcherIndex ? { ...m, ...updates } : m
    );
    updateMatchers(selectorId, matchers);
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
            onClick={onRequestAncestors}
            loading={isLoadingAncestors}
            size="small"
          >
            Request Ancestors
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
                  {getMatchers(selector).length > 0 &&
                    `(${getMatchers(selector).map((m) => m.type).join(" + ")})`}
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
                {getMatchers(selector).map((matcher, matcherIndex) => (
                  <div key={matcherIndex} style={{ border: "1px solid #f0f0f0", padding: "8px", borderRadius: "4px" }}>
                    <Space style={{ width: "100%", marginBottom: 4 }} align="center">
                      <Text strong style={{ marginRight: "8px" }}>
                        Matcher {matcherIndex + 1}:
                      </Text>
                      {getMatchers(selector).length > 1 && (
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeMatcher(selector.id, matcherIndex)}
                          title="Remove matcher"
                        />
                      )}
                    </Space>
                    <div style={{ marginBottom: 8 }}>
                      <Select
                        value={matcher.type}
                        onChange={(value) =>
                          updateMatcher(selector.id, matcherIndex, {
                            type: value as SankeyMatcherType,
                            selectedValues: [],
                          })
                        }
                        style={{ width: "200px" }}
                      >
                        <Option value="Type">Type</Option>
                        <Option value="Label">Label</Option>
                        <Option value="Project">Project</Option>
                        <Option value="Key">Key</Option>
                        <Option value="Account Category">Account Category</Option>
                        <Option value="Account">Account</Option>
                        <Option value="AncestryType">AncestryType</Option>
                      </Select>
                    </div>
                    <div>
                      <Text strong style={{ marginRight: "8px" }}>
                        {matcher.type === "Type"
                          ? "Select Issue Types:"
                          : matcher.type === "Label"
                            ? "Select Labels:"
                            : matcher.type === "Project"
                              ? "Select Projects:"
                              : matcher.type === "Key"
                                ? "Select Issue Keys:"
                                : matcher.type === "Account Category"
                                  ? "Select Account Categories:"
                                  : matcher.type === "Account"
                                    ? "Select Accounts:"
                                    : "Select Ancestry Types:"}
                      </Text>
                      <Select
                        mode="multiple"
                        placeholder={
                          matcher.type === "Type"
                            ? "Select issue types"
                            : matcher.type === "Label"
                              ? "Select labels"
                              : matcher.type === "Project"
                                ? "Select projects"
                                : matcher.type === "Key"
                                  ? "Select issue keys"
                                  : matcher.type === "Account Category"
                                    ? "Select account categories"
                                    : matcher.type === "Account"
                                      ? "Select accounts"
                                      : "Select ancestry types"
                        }
                        value={matcher.selectedValues}
                        onChange={(values) =>
                          updateMatcher(selector.id, matcherIndex, {
                            selectedValues: values,
                          })
                        }
                        style={{ width: "100%" }}
                        allowClear
                        disabled={
                          (matcher.type === "Label" &&
                            availableLabels.length === 0) ||
                          (matcher.type === "Project" &&
                            availableProjects.length === 0) ||
                          (matcher.type === "Key" &&
                            availableIssueKeys.length === 0) ||
                          (matcher.type === "Account Category" &&
                            availableAccountCategories.length === 0) ||
                          (matcher.type === "Account" &&
                            availableAccounts.length === 0) ||
                          (matcher.type === "AncestryType" &&
                            availableAncestryTypes.length === 0)
                        }
                      >
                        {matcher.type === "Type"
                          ? availableIssueTypes.map((type) => (
                              <Option key={type} value={type}>
                                {type}
                              </Option>
                            ))
                          : matcher.type === "Label"
                            ? availableLabels.map((label) => (
                                <Option key={label} value={label}>
                                  {label}
                                </Option>
                              ))
                            : matcher.type === "Project"
                              ? availableProjects.map((project) => (
                                  <Option key={project} value={project}>
                                    {project}
                                  </Option>
                                ))
                              : matcher.type === "Key"
                                ? availableIssueKeys.map((key) => (
                                    <Option key={key} value={key}>
                                      {key}
                                    </Option>
                                  ))
                                : matcher.type === "Account Category"
                                  ? availableAccountCategories.map((category) => (
                                      <Option key={category} value={category}>
                                        {category}
                                      </Option>
                                    ))
                                  : matcher.type === "Account"
                                    ? availableAccounts.map((account) => (
                                        <Option key={account} value={account}>
                                          {account}
                                        </Option>
                                      ))
                                    : availableAncestryTypes.map((ancestryType) => (
                                        <Option key={ancestryType} value={ancestryType}>
                                          {ancestryType}
                                        </Option>
                                      ))}
                      </Select>
                      {matcher.type === "Label" && availableLabels.length === 0 && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          No labels available. Click "Request Labels" to fetch labels for issues.
                        </Text>
                      )}
                      {matcher.type === "Project" && availableProjects.length === 0 && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          No projects available. Projects are extracted from issue keys.
                        </Text>
                      )}
                      {matcher.type === "Key" && availableIssueKeys.length === 0 && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          No issue keys available.
                        </Text>
                      )}
                      {matcher.type === "Account Category" &&
                        availableAccountCategories.length === 0 && (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            No account categories available.
                          </Text>
                        )}
                      {matcher.type === "Account" && availableAccounts.length === 0 && (
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          No accounts available.
                        </Text>
                      )}
                      {matcher.type === "AncestryType" &&
                        availableAncestryTypes.length === 0 && (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            No ancestry types available. Click "Request Ancestors" to fetch ancestry
                            information for issues.
                          </Text>
                        )}
                    </div>
                  </div>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addMatcher(selector.id)}
                  size="small"
                >
                  Add matcher (OR)
                </Button>
              </Space>
            </Card>
          ))}
        </Space>
      )}
    </Card>
  );
};
