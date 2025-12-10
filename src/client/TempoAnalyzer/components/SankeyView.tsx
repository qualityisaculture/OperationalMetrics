import React, { useMemo, useState } from "react";
import { Card, Table, Typography, Button, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { SankeySelectorConfig } from "./SankeySelector";
import { LabelsMap } from "../hooks/useLabels";

const { Text, Title } = Typography;

interface SankeyViewProps {
  filteredData: any[];
  issueTypeIndex: number;
  issueKeyIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
  accountCategoryIndex: number;
  selectors: SankeySelectorConfig[];
  labels: LabelsMap;
}

export const SankeyView: React.FC<SankeyViewProps> = ({
  filteredData,
  issueTypeIndex,
  issueKeyIndex,
  loggedHoursIndex,
  fullNameIndex,
  accountCategoryIndex,
  selectors,
  labels,
}) => {
  const [selectedSelectorKey, setSelectedSelectorKey] = useState<string | null>(null);
  // Calculate hours for each selector and Other
  const selectorHours = useMemo(() => {
    const hours: { [key: string]: number } = {};
    
    // Initialize with selectors
    selectors.forEach((selector, idx) => {
      const label = `Selector ${idx + 1}`;
      hours[label] = 0;
    });
    hours["Other"] = 0;

    // Process each row
    filteredData.forEach((row) => {
      const issueType =
        issueTypeIndex !== -1 ? row[issueTypeIndex.toString()] : null;
      const issueKey =
        issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
      const loggedHours =
        loggedHoursIndex !== -1
          ? parseFloat(row[loggedHoursIndex.toString()] || "0")
          : 0;

      if (loggedHours <= 0) {
        return;
      }

      let matched = false;

      // Check each selector in order
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        
        if (selector.type === "Type") {
          if (!issueType) continue;
          const issueTypeStr = String(issueType).trim();
          if (selector.selectedValues.includes(issueTypeStr)) {
            const label = `Selector ${i + 1}`;
            hours[label] = (hours[label] || 0) + loggedHours;
            matched = true;
            break; // Item matches first selector, stop checking
          }
        } else if (selector.type === "Label") {
          if (!issueKey) continue;
          const issueKeyStr = String(issueKey).trim();
          const issueLabels = labels[issueKeyStr] || [];
          
          // Check if any of the selected labels match any of the issue's labels
          const hasMatchingLabel = selector.selectedValues.some((selectedLabel) =>
            issueLabels.includes(selectedLabel)
          );
          
          if (hasMatchingLabel) {
            const label = `Selector ${i + 1}`;
            hours[label] = (hours[label] || 0) + loggedHours;
            matched = true;
            break; // Item matches first selector, stop checking
          }
        } else if (selector.type === "Project") {
          if (!issueKey) continue;
          const issueKeyStr = String(issueKey).trim();
          // Extract project prefix (e.g., "ABC-1" -> "ABC" or "ABC123-4" -> "ABC123")
          // Match letters and numbers up to the first dash or end of string
          const projectMatch = issueKeyStr.match(/^([A-Z0-9]+)(?:-|$)/);
          const project = projectMatch ? projectMatch[1] : null;
          
          if (project && selector.selectedValues.includes(project)) {
            const label = `Selector ${i + 1}`;
            hours[label] = (hours[label] || 0) + loggedHours;
            matched = true;
            break; // Item matches first selector, stop checking
          }
        }
      }

      // If no selector matched, add to Other
      if (!matched) {
        hours["Other"] = (hours["Other"] || 0) + loggedHours;
      }
    });

    return hours;
  }, [filteredData, issueTypeIndex, issueKeyIndex, loggedHoursIndex, selectors, labels]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    return Object.values(selectorHours).reduce((sum, val) => sum + val, 0);
  }, [selectorHours]);

  // Generate selector description
  const getSelectorDescription = (selector: SankeySelectorConfig, index: number): string => {
    const baseName = selector.name || `Selector ${index + 1}`;
    
    if (selector.type === "Type") {
      if (selector.selectedValues.length === 0) {
        return `${baseName} (Type: none selected)`;
      }
      return `${baseName} (Type: ${selector.selectedValues.join(", ")})`;
    } else if (selector.type === "Label") {
      if (selector.selectedValues.length === 0) {
        return `${baseName} (Label: none selected)`;
      }
      return `${baseName} (Label: ${selector.selectedValues.join(", ")})`;
    } else if (selector.type === "Project") {
      if (selector.selectedValues.length === 0) {
        return `${baseName} (Project: none selected)`;
      }
      return `${baseName} (Project: ${selector.selectedValues.join(", ")})`;
    }
    return baseName;
  };

  // Prepare table data
  const tableData = useMemo(() => {
    const rows: Array<{
      key: string;
      selector: string;
      hours: number;
      chargeableDays: number;
      percentage: string;
    }> = [];

    // Add rows for each selector
    selectors.forEach((selector, idx) => {
      const label = `Selector ${idx + 1}`;
      const hours = selectorHours[label] || 0;
      rows.push({
        key: label,
        selector: getSelectorDescription(selector, idx),
        hours,
        chargeableDays: hours / 7.5,
        percentage: totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : "0.0",
      });
    });

    // Add Other row
    const otherHours = selectorHours["Other"] || 0;
    rows.push({
      key: "Other",
      selector: "Other",
      hours: otherHours,
      chargeableDays: otherHours / 7.5,
      percentage: totalHours > 0 ? ((otherHours / totalHours) * 100).toFixed(1) : "0.0",
    });

    return rows.sort((a, b) => b.hours - a.hours);
  }, [selectors, selectorHours, totalHours]);

  // Get matching issues for the selected selector
  const matchingIssues = useMemo(() => {
    if (!selectedSelectorKey) return [];

    const isOther = selectedSelectorKey === "Other";
    const selectorIndex = isOther
      ? -1
      : parseInt(selectedSelectorKey.replace("Selector ", "")) - 1;

    if (!isOther && (selectorIndex < 0 || selectorIndex >= selectors.length)) {
      return [];
    }

    const selector = isOther ? null : selectors[selectorIndex];
    const issueMap = new Map<
      string,
      {
        issueKey: string;
        issueType: string;
        summary: string;
        fullName: string;
        accountCategory: string;
        hours: number;
      }
    >();

    filteredData.forEach((row) => {
      const issueType =
        issueTypeIndex !== -1 ? row[issueTypeIndex.toString()] : null;
      const issueKey =
        issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
      const fullName =
        fullNameIndex !== -1 ? row[fullNameIndex.toString()] : null;
      const accountCategory =
        accountCategoryIndex !== -1
          ? row[accountCategoryIndex.toString()]
          : null;
      const loggedHours =
        loggedHoursIndex !== -1
          ? parseFloat(row[loggedHoursIndex.toString()] || "0")
          : 0;

      if (loggedHours <= 0) {
        return;
      }

      let matches = false;

      if (isOther) {
        // Check if it doesn't match any selector
        let matchedAny = false;
        for (let i = 0; i < selectors.length; i++) {
          const sel = selectors[i];
          if (sel.type === "Type") {
            if (issueType) {
              const issueTypeStr = String(issueType).trim();
              if (sel.selectedValues.includes(issueTypeStr)) {
                matchedAny = true;
                break;
              }
            }
          } else if (sel.type === "Label") {
            if (issueKey) {
              const issueKeyStr = String(issueKey).trim();
              const issueLabels = labels[issueKeyStr] || [];
              const hasMatchingLabel = sel.selectedValues.some((selectedLabel) =>
                issueLabels.includes(selectedLabel)
              );
              if (hasMatchingLabel) {
                matchedAny = true;
                break;
              }
            }
          } else if (sel.type === "Project") {
            if (issueKey) {
              const issueKeyStr = String(issueKey).trim();
              const projectMatch = issueKeyStr.match(/^([A-Z0-9]+)/);
              const project = projectMatch ? projectMatch[1] : null;
              if (project && sel.selectedValues.includes(project)) {
                matchedAny = true;
                break;
              }
            }
          }
        }
        matches = !matchedAny;
      } else if (selector) {
        if (selector.type === "Type") {
          if (issueType) {
            const issueTypeStr = String(issueType).trim();
            matches = selector.selectedValues.includes(issueTypeStr);
          }
        } else if (selector.type === "Label") {
          if (issueKey) {
            const issueKeyStr = String(issueKey).trim();
            const issueLabels = labels[issueKeyStr] || [];
            matches = selector.selectedValues.some((selectedLabel) =>
              issueLabels.includes(selectedLabel)
            );
          }
        } else if (selector.type === "Project") {
          if (issueKey) {
            const issueKeyStr = String(issueKey).trim();
            // Extract project prefix (e.g., "ABC-1" -> "ABC" or "ABC123-4" -> "ABC123")
            const projectMatch = issueKeyStr.match(/^([A-Z0-9]+)/);
            const project = projectMatch ? projectMatch[1] : null;
            matches = project !== null && selector.selectedValues.includes(project);
          }
        }
      }

      if (matches && issueKey) {
        const key = String(issueKey).trim();
        if (key) {
          const existing = issueMap.get(key);
          if (existing) {
            existing.hours += loggedHours;
          } else {
            issueMap.set(key, {
              issueKey: key,
              issueType: issueType ? String(issueType).trim() : "",
              summary: "", // Summary not available in filtered data
              fullName: fullName ? String(fullName).trim() : "",
              accountCategory: accountCategory
                ? String(accountCategory).trim()
                : "",
              hours: loggedHours,
            });
          }
        }
      }
    });

    return Array.from(issueMap.values()).sort((a, b) => b.hours - a.hours);
  }, [
    selectedSelectorKey,
    filteredData,
    selectors,
    labels,
    issueTypeIndex,
    issueKeyIndex,
    fullNameIndex,
    accountCategoryIndex,
    loggedHoursIndex,
  ]);

  const totalIssueHours = useMemo(() => {
    return matchingIssues.reduce((sum, issue) => sum + issue.hours, 0);
  }, [matchingIssues]);

  const handleRowClick = (record: any) => {
    setSelectedSelectorKey(record.key);
  };

  const handleBackClick = () => {
    setSelectedSelectorKey(null);
  };

  const summaryColumns = [
    {
      title: "Selector",
      dataIndex: "selector",
      key: "selector",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Logged Hours",
      dataIndex: "hours",
      key: "hours",
      render: (text: number) => <Text>{text.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Logged Days",
      dataIndex: "chargeableDays",
      key: "chargeableDays",
      render: (text: number) => <Text>{text.toFixed(2)} days</Text>,
      sorter: (a: any, b: any) => a.chargeableDays - b.chargeableDays,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      render: (text: string) => <Text type="secondary">{text}%</Text>,
    },
  ];

  const issueColumns = [
    {
      title: "Issue Key",
      dataIndex: "issueKey",
      key: "issueKey",
      render: (text: string) => (
        <a
          href={`https://lendscape.atlassian.net/browse/${text}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontWeight: "bold" }}
          onClick={(e: any) => e.stopPropagation()}
        >
          {text}
        </a>
      ),
    },
    {
      title: "Issue Type",
      dataIndex: "issueType",
      key: "issueType",
    },
    {
      title: "Full Name",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Account Category",
      dataIndex: "accountCategory",
      key: "accountCategory",
    },
    {
      title: "Logged Hours",
      dataIndex: "hours",
      key: "hours",
      render: (text: number) => <Text>{text.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Logged Days",
      dataIndex: "chargeableDays",
      key: "chargeableDays",
      render: (_: any, record: any) => (
        <Text>{(record.hours / 7.5).toFixed(2)} days</Text>
      ),
      sorter: (a: any, b: any) => a.hours - b.hours,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      key: "percentage",
      render: (_: any, record: any) => (
        <Text type="secondary">
          {totalIssueHours > 0
            ? ((record.hours / totalIssueHours) * 100).toFixed(1)
            : "0.0"}
          %
        </Text>
      ),
    },
  ];

  if (selectors.length === 0) {
    return (
      <Card>
        <Text type="secondary">
          No selectors configured. Please configure selectors to view Sankey data.
        </Text>
      </Card>
    );
  }

  // Show issue breakdown if a selector is selected
  if (selectedSelectorKey) {
    const selectedRow = tableData.find((row) => row.key === selectedSelectorKey);
    const title = selectedRow ? selectedRow.selector : "Issue Breakdown";

    return (
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBackClick}
              size="small"
            >
              Back
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <div>
            <Text strong>Total Hours: </Text>
            <Text>{totalIssueHours.toFixed(2)} hrs</Text>
            <Text strong style={{ marginLeft: "16px" }}>
              Total Days:{" "}
            </Text>
            <Text>{(totalIssueHours / 7.5).toFixed(2)} days</Text>
            <Text strong style={{ marginLeft: "16px" }}>
              Issues:{" "}
            </Text>
            <Text>{matchingIssues.length}</Text>
          </div>
          <Table
            dataSource={matchingIssues.map((issue) => ({
              ...issue,
              key: issue.issueKey,
              chargeableDays: issue.hours / 7.5,
            }))}
            columns={issueColumns}
            pagination={false}
          />
        </Space>
      </Card>
    );
  }

  return (
    <Card title="Sankey Analysis (Click a row to drill down)">
      <Table
        dataSource={tableData}
        columns={summaryColumns}
        pagination={false}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

