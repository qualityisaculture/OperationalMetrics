import React, { useMemo, useState } from "react";
import { Card, Table, Typography, Button, Space } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { SankeySelectorConfig, getMatchers, SankeyMatcher } from "./SankeySelector";
import { LabelsMap } from "../hooks/useLabels";
import { AncestryTypesMap } from "../hooks/useAncestryTypes";

const { Text, Title } = Typography;

interface SankeyViewProps {
  filteredData: any[];
  issueTypeIndex: number;
  issueKeyIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
  accountCategoryIndex: number;
  accountNameIndex: number;
  parentIndex: number;
  selectors: SankeySelectorConfig[];
  labels: LabelsMap;
  ancestryTypes: AncestryTypesMap;
  splitByMonth?: boolean;
  monthsInData?: string[];
  dateIndex?: number;
}

export const SankeyView: React.FC<SankeyViewProps> = ({
  filteredData,
  issueTypeIndex,
  issueKeyIndex,
  loggedHoursIndex,
  fullNameIndex,
  accountCategoryIndex,
  accountNameIndex,
  parentIndex,
  selectors,
  labels,
  ancestryTypes,
  splitByMonth = false,
  monthsInData = [],
  dateIndex = -1,
}) => {
  const [selectedSelectorKey, setSelectedSelectorKey] = useState<string | null>(
    null
  );

  const rowMatchesMatcher = (
    row: any,
    matcher: SankeyMatcher,
    issueType: string | null,
    issueKey: string | null
  ): boolean => {
    if (matcher.type === "Type") {
      return !!(issueType && matcher.selectedValues.includes(String(issueType).trim()));
    }
    if (matcher.type === "Label" && issueKey) {
      const issueLabels = labels[String(issueKey).trim()] || [];
      return matcher.selectedValues.some((l) => issueLabels.includes(l));
    }
    if (matcher.type === "Project" && issueKey) {
      const projectMatch = String(issueKey).trim().match(/^([A-Z0-9]+)(?:-|$)/);
      const project = projectMatch ? projectMatch[1] : null;
      return !!(project && matcher.selectedValues.includes(project));
    }
    if (matcher.type === "Key" && issueKey) {
      return matcher.selectedValues.includes(String(issueKey).trim());
    }
    if (matcher.type === "Account Category") {
      const accountCategory = accountCategoryIndex !== -1 ? row[accountCategoryIndex.toString()] : null;
      return !!(accountCategory && matcher.selectedValues.includes(String(accountCategory).trim()));
    }
    if (matcher.type === "Account") {
      const accountName = accountNameIndex !== -1 ? row[accountNameIndex.toString()] : null;
      return !!(accountName && matcher.selectedValues.includes(String(accountName).trim()));
    }
    if (matcher.type === "AncestryType" && issueKey) {
      const ancestryType = ancestryTypes[String(issueKey).trim()];
      return !!(ancestryType && matcher.selectedValues.includes(ancestryType));
    }
    if (matcher.type === "Parent") {
      const parentKey = parentIndex !== -1 ? row[parentIndex.toString()] : null;
      return !!(parentKey && matcher.selectedValues.includes(String(parentKey).trim()));
    }
    return false;
  };

  const rowMatchesSelector = (row: any, selector: SankeySelectorConfig): boolean => {
    const issueType = issueTypeIndex !== -1 ? row[issueTypeIndex.toString()] : null;
    const issueKey = issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
    const matchers = getMatchers(selector);
    if (matchers.length === 0) return false;
    return matchers.some((m) => rowMatchesMatcher(row, m, issueType, issueKey));
  };

  const computeSelectorHoursForRows = (rows: any[]) => {
    const hours: { [key: string]: number } = {};
    selectors.forEach((_, idx) => {
      hours[`Selector ${idx + 1}`] = 0;
    });
    hours["Other"] = 0;
    rows.forEach((row) => {
      const loggedHours =
        loggedHoursIndex !== -1
          ? parseFloat(row[loggedHoursIndex.toString()] || "0")
          : 0;
      if (loggedHours <= 0) return;
      let matched = false;
      for (let i = 0; i < selectors.length; i++) {
        if (rowMatchesSelector(row, selectors[i])) {
          hours[`Selector ${i + 1}`] = (hours[`Selector ${i + 1}`] || 0) + loggedHours;
          matched = true;
          break;
        }
      }
      if (!matched) hours["Other"] = (hours["Other"] || 0) + loggedHours;
    });
    return hours;
  };

  // Calculate hours for each selector and Other
  const selectorHours = useMemo(
    () => computeSelectorHoursForRows(filteredData),
    [
      filteredData,
      issueTypeIndex,
      issueKeyIndex,
      loggedHoursIndex,
      accountCategoryIndex,
      accountNameIndex,
      selectors,
      labels,
      ancestryTypes,
    ]
  );

  const selectorHoursByMonth = useMemo(() => {
    if (!splitByMonth || monthsInData.length === 0 || dateIndex === -1)
      return {};
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth: Record<string, { [key: string]: number }> = {};
    monthsInData.forEach((monthLabel) => {
      const [monthPart, yearPart] = monthLabel.split(" '");
      const m = MONTH_NAMES.indexOf(monthPart);
      const y = parseInt(`20${yearPart}`, 10);
      const monthRows = filteredData.filter((row) => {
        const workDate = row[dateIndex.toString()];
        if (!workDate) return false;
        try {
          const d = new Date(String(workDate).trim().split(" ")[0]);
          return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
        } catch {
          return false;
        }
      });
      byMonth[monthLabel] = computeSelectorHoursForRows(monthRows);
    });
    return byMonth;
  }, [splitByMonth, monthsInData, dateIndex, filteredData, selectors, labels, ancestryTypes, issueTypeIndex, issueKeyIndex, loggedHoursIndex, accountCategoryIndex, accountNameIndex]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    return Object.values(selectorHours).reduce((sum, val) => sum + val, 0);
  }, [selectorHours]);

  // Generate selector description
  const getSelectorDescription = (
    selector: SankeySelectorConfig,
    index: number
  ): string => {
    const baseName = selector.name || `Selector ${index + 1}`;
    const matchers = getMatchers(selector);
    if (matchers.length === 0) return baseName;
    const parts = matchers.map((m) => {
      if (m.selectedValues.length === 0) return `${m.type}: none selected`;
      return `${m.type}: ${m.selectedValues.join(", ")}`;
    });
    return `${baseName} (${parts.join(" OR ")})`;
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

    const getMonthFieldsForRow = (rowKey: string) => {
      const fields: Record<string, number | string> = {};
      if (!splitByMonth || monthsInData.length === 0 || !selectorHoursByMonth) return fields;
      monthsInData.forEach((monthLabel, i) => {
        const hours = selectorHoursByMonth[monthLabel]?.[rowKey] ?? 0;
        // Total hours in this month only (so % is share of that month, not whole dataset)
        const monthTotal =
          Object.values(selectorHoursByMonth[monthLabel] ?? {}).reduce(
            (a, b) => a + b,
            0
          ) || 0;
        fields[`month_${i}_days`] = hours / 7.5;
        fields[`month_${i}_pct`] =
          monthTotal > 0 ? ((hours / monthTotal) * 100).toFixed(1) : "0.0";
      });
      return fields;
    };

    // Add rows for each selector
    selectors.forEach((selector, idx) => {
      const label = `Selector ${idx + 1}`;
      const hours = selectorHours[label] || 0;
      rows.push({
        key: label,
        selector: getSelectorDescription(selector, idx),
        hours,
        chargeableDays: hours / 7.5,
        percentage:
          totalHours > 0 ? ((hours / totalHours) * 100).toFixed(1) : "0.0",
        ...getMonthFieldsForRow(label),
      });
    });

    // Add Other row
    const otherHours = selectorHours["Other"] || 0;
    rows.push({
      key: "Other",
      selector: "Other",
      hours: otherHours,
      chargeableDays: otherHours / 7.5,
      percentage:
        totalHours > 0 ? ((otherHours / totalHours) * 100).toFixed(1) : "0.0",
      ...getMonthFieldsForRow("Other"),
    });

    return rows.sort((a, b) => b.hours - a.hours);
  }, [selectors, selectorHours, totalHours, splitByMonth, monthsInData, selectorHoursByMonth]);

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

      const matches = isOther
        ? !selectors.some((sel) => rowMatchesSelector(row, sel))
        : selector
          ? rowMatchesSelector(row, selector)
          : false;

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
    accountNameIndex,
    loggedHoursIndex,
    ancestryTypes,
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

  const monthColumns =
    splitByMonth
      ? monthsInData.length > 0
        ? monthsInData.flatMap((monthLabel, i) => [
            {
              title: `${monthLabel} Days`,
              dataIndex: `month_${i}_days`,
              key: `month_${i}_days`,
              render: (val: number | undefined) => (
                <Text type="secondary">
                  {val != null && typeof val === "number"
                    ? val.toFixed(2)
                    : "-"}
                </Text>
              ),
            },
            {
              title: `${monthLabel} Percentage`,
              dataIndex: `month_${i}_pct`,
              key: `month_${i}_pct`,
              render: (val: number | string | undefined) => (
                <Text type="secondary">
                  {val != null && val !== "" ? `${val}%` : "-"}
                </Text>
              ),
            },
          ])
        : [
            {
              title: "Month Days",
              dataIndex: "month_0_days",
              key: "month_0_days",
              render: (val: number | undefined) => (
                <Text type="secondary">
                  {val != null && typeof val === "number"
                    ? val.toFixed(2)
                    : "-"}
                </Text>
              ),
            },
            {
              title: "Month %",
              dataIndex: "month_0_pct",
              key: "month_0_pct",
              render: (val: number | string | undefined) => (
                <Text type="secondary">
                  {val != null && val !== "" ? `${val}%` : "-"}
                </Text>
              ),
            },
          ]
      : [];

  const summaryColumns = [
    {
      title: "Selector",
      dataIndex: "selector",
      key: "selector",
      render: (text: string) => <Text strong>{text}</Text>,
      sorter: (a: any, b: any) => {
        // Sort "Other" last when sorting ascending
        if (a.selector === "Other") return 1;
        if (b.selector === "Other") return -1;
        return (a.selector ?? "").localeCompare(b.selector ?? "");
      },
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
    ...monthColumns,
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
          No selectors configured. Please configure selectors to view Sankey
          data.
        </Text>
      </Card>
    );
  }

  // Show issue breakdown if a selector is selected
  if (selectedSelectorKey) {
    const selectedRow = tableData.find(
      (row) => row.key === selectedSelectorKey
    );
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
