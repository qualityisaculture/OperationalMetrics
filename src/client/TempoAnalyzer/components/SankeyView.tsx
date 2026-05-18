import React, { useMemo, useState } from "react";
import { Card, Table, Typography, Button, Space, Modal, Alert } from "antd";
import type { TableProps } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Area } from "@ant-design/charts";
import { SankeySelectorConfig, getMatchers, SankeyMatcher } from "./SankeySelector";
import { LabelsMap } from "../hooks/useLabels";
import { AncestryTypesMap } from "../hooks/useAncestryTypes";
import { ParentAncestorsMap } from "../hooks/useParentAncestors";
import { EstimatesMap } from "../hooks/useEstimates";

const { Text, Title } = Typography;

interface SankeyViewProps {
  filteredData: any[];
  issueTypeIndex: number;
  issueKeyIndex: number;
  issueSummaryIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
  workDescriptionIndex: number;
  accountCategoryIndex: number;
  accountNameIndex: number;
  selectors: SankeySelectorConfig[];
  labels: LabelsMap;
  ancestryTypes: AncestryTypesMap;
  parentAncestors: ParentAncestorsMap;
  estimates: EstimatesMap;
  splitByMonth?: boolean;
  monthsInData?: string[];
  dateIndex?: number;
  isLoadingAncestors?: boolean;
  isLoadingLabels?: boolean;
  isLoadingEstimates?: boolean;
  exportView?: boolean;
}

export const SankeyView: React.FC<SankeyViewProps> = ({
  filteredData,
  issueTypeIndex,
  issueKeyIndex,
  issueSummaryIndex,
  loggedHoursIndex,
  fullNameIndex,
  workDescriptionIndex,
  accountCategoryIndex,
  accountNameIndex,
  selectors,
  labels,
  ancestryTypes,
  parentAncestors,
  estimates,
  splitByMonth = false,
  monthsInData = [],
  dateIndex = -1,
  isLoadingAncestors = false,
  isLoadingLabels = false,
  isLoadingEstimates = false,
  exportView = false,
}) => {
  const [workDescModalIssue, setWorkDescModalIssue] = useState<string | null>(null);
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
    if (matcher.type === "Parent" && issueKey) {
      const ancestors = parentAncestors[String(issueKey).trim()];
      const parentKey = ancestors && ancestors.length > 0 ? ancestors[0].key : null;
      return !!(parentKey && matcher.selectedValues.includes(parentKey));
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

  // Calculate estimated days per selector, summing unique issues' estimates
  const computeSelectorEstimatedDaysForRows = (rows: any[]) => {
    const days: { [key: string]: number } = {};
    selectors.forEach((_, idx) => {
      days[`Selector ${idx + 1}`] = 0;
    });
    days["Other"] = 0;

    // Collect unique issues per selector to avoid double-counting
    const selectorIssues: { [key: string]: Set<string> } = {};
    selectors.forEach((_, idx) => {
      selectorIssues[`Selector ${idx + 1}`] = new Set();
    });
    selectorIssues["Other"] = new Set();

    rows.forEach((row) => {
      const issueKey = issueKeyIndex !== -1 ? row[issueKeyIndex.toString()] : null;
      if (!issueKey) return;
      const key = String(issueKey).trim();
      if (!key) return;

      let matched = false;
      for (let i = 0; i < selectors.length; i++) {
        if (rowMatchesSelector(row, selectors[i])) {
          selectorIssues[`Selector ${i + 1}`].add(key);
          matched = true;
          break;
        }
      }
      if (!matched) selectorIssues["Other"].add(key);
    });

    Object.keys(selectorIssues).forEach((selectorKey) => {
      let total = 0;
      selectorIssues[selectorKey].forEach((issueKey) => {
        const estimate = estimates[issueKey];
        if (estimate != null && estimate > 0) {
          total += estimate;
        }
      });
      days[selectorKey] = total;
    });

    return days;
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

  const selectorEstimatedDays = useMemo(
    () => computeSelectorEstimatedDaysForRows(filteredData),
    [filteredData, issueTypeIndex, issueKeyIndex, accountCategoryIndex, accountNameIndex, selectors, labels, ancestryTypes, estimates]
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

  const DEFAULT_COLORS = [
    "#5B8FF9", "#5AD8A6", "#5D7092", "#F6BD16", "#E8684A",
    "#6DC8EC", "#9270CA", "#FF9D4D", "#269A99", "#FF99C3",
  ];

  const colorScale = useMemo(() => {
    const domain: string[] = [];
    const range: string[] = [];
    selectors.forEach((selector, idx) => {
      domain.push(selector.name || `Selector ${idx + 1}`);
      range.push(selector.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]);
    });
    domain.push("Other");
    range.push("#bfbfbf");
    return { domain, range };
  }, [selectors]);

  const monthlyChartData = useMemo(() => {
    if (!splitByMonth || monthsInData.length === 0 || Object.keys(selectorHoursByMonth).length === 0)
      return [];
    const result: { month: string; category: string; percentage: number }[] = [];
    monthsInData.forEach((monthLabel) => {
      const monthHours = selectorHoursByMonth[monthLabel] ?? {};
      const monthTotal = Object.values(monthHours).reduce((a, b) => a + b, 0);
      if (monthTotal === 0) return;
      selectors.forEach((selector, idx) => {
        const key = `Selector ${idx + 1}`;
        const hours = monthHours[key] ?? 0;
        result.push({
          month: monthLabel,
          category: selector.name || key,
          percentage: parseFloat(((hours / monthTotal) * 100).toFixed(1)),
        });
      });
      const otherHours = monthHours["Other"] ?? 0;
      result.push({
        month: monthLabel,
        category: "Other",
        percentage: parseFloat(((otherHours / monthTotal) * 100).toFixed(1)),
      });
    });
    return result;
  }, [splitByMonth, monthsInData, selectorHoursByMonth, selectors]);

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
      estimatedDays: number;
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
        selector: exportView ? (selector.name || `Selector ${idx + 1}`) : getSelectorDescription(selector, idx),
        hours,
        chargeableDays: hours / 7.5,
        estimatedDays: selectorEstimatedDays[label] || 0,
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
      estimatedDays: selectorEstimatedDays["Other"] || 0,
      percentage:
        totalHours > 0 ? ((otherHours / totalHours) * 100).toFixed(1) : "0.0",
      ...getMonthFieldsForRow("Other"),
    });

    return rows.sort((a, b) => b.hours - a.hours);
  }, [selectors, selectorHours, selectorEstimatedDays, totalHours, splitByMonth, monthsInData, selectorHoursByMonth, exportView]);

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
        accountCategory: string;
        hours: number;
        estimatedDays: number | null;
        bookings: Array<{ fullName: string; date: string; hours: number; workDescription: string }>;
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
      const date =
        dateIndex !== -1 ? String(row[dateIndex.toString()] || "").trim() : "";
      const workDescription =
        workDescriptionIndex != null && workDescriptionIndex !== -1
          ? String(row[workDescriptionIndex.toString()] || "").trim()
          : "";

      if (loggedHours <= 0) {
        return;
      }

      // Use the same first-match-wins logic as the statistics:
      // a row belongs to the first selector it matches, not just any selector.
      const firstMatchIndex = selectors.findIndex((sel) => rowMatchesSelector(row, sel));
      const matches = isOther
        ? firstMatchIndex === -1
        : firstMatchIndex === selectorIndex;

      if (matches && issueKey) {
        const key = String(issueKey).trim();
        if (key) {
          const existing = issueMap.get(key);
          const booking = {
            fullName: fullName ? String(fullName).trim() : "",
            date,
            hours: loggedHours,
            workDescription,
          };
          if (existing) {
            existing.hours += loggedHours;
            existing.bookings.push(booking);
          } else {
            const rawEstimate = estimates[key];
            issueMap.set(key, {
              issueKey: key,
              issueType: issueType ? String(issueType).trim() : "",
              summary: issueSummaryIndex != null && issueSummaryIndex !== -1 ? String(row[issueSummaryIndex.toString()] || "").trim() : "",
              accountCategory: accountCategory
                ? String(accountCategory).trim()
                : "",
              hours: loggedHours,
              estimatedDays: rawEstimate != null ? rawEstimate : null,
              bookings: [booking],
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
    issueSummaryIndex,
    fullNameIndex,
    workDescriptionIndex,
    accountCategoryIndex,
    accountNameIndex,
    loggedHoursIndex,
    dateIndex,
    ancestryTypes,
    estimates,
  ]);

  const totalIssueHours = useMemo(() => {
    return matchingIssues.reduce((sum, issue) => sum + issue.hours, 0);
  }, [matchingIssues]);

  const totalIssueEstimatedDays = useMemo(() => {
    return matchingIssues.reduce(
      (sum, issue) => sum + (issue.estimatedDays ?? 0),
      0
    );
  }, [matchingIssues]);

  const totalEstimatedDays = useMemo(
    () => Object.values(selectorEstimatedDays).reduce((sum, v) => sum + v, 0),
    [selectorEstimatedDays]
  );

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
      render: (text: string) => {
        const idx = colorScale.domain.indexOf(text);
        const color = idx >= 0 ? colorScale.range[idx] : "#bfbfbf";
        return (
          <Space>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: color, flexShrink: 0 }} />
            <Text strong>{text}</Text>
          </Space>
        );
      },
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
      title: "Estimated Days",
      dataIndex: "estimatedDays",
      key: "estimatedDays",
      render: (text: number) =>
        text > 0 ? (
          <Text type="secondary">{text.toFixed(2)} days</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: any, b: any) => a.estimatedDays - b.estimatedDays,
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
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
    },
    {
      title: "Issue Type",
      dataIndex: "issueType",
      key: "issueType",
    },
    {
      title: "Work Description",
      dataIndex: "bookings",
      key: "workDescription",
      render: (_: any, record: any) => (
        <a
          onClick={(e) => { e.stopPropagation(); setWorkDescModalIssue(record.issueKey); }}
          style={{ cursor: "pointer" }}
        >
          {record.bookings?.length ?? 0} booking{(record.bookings?.length ?? 0) !== 1 ? "s" : ""}
        </a>
      ),
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
      title: "Estimated Days",
      dataIndex: "estimatedDays",
      key: "estimatedDays",
      render: (val: number | null) =>
        val != null && val > 0 ? (
          <Text type="secondary">{val.toFixed(2)} days</Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
      sorter: (a: any, b: any) => (a.estimatedDays ?? 0) - (b.estimatedDays ?? 0),
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

  const workDescModalIssueData = useMemo(() => {
    if (!workDescModalIssue) return null;
    const issue = matchingIssues.find((i) => i.issueKey === workDescModalIssue);
    if (!issue) return null;
    // Group by person: sum hours, collect dates
    const byPerson = new Map<string, { fullName: string; hours: number; dates: string[]; descriptions: string[] }>();
    issue.bookings.forEach(({ fullName, date, hours, workDescription }) => {
      const existing = byPerson.get(fullName);
      if (existing) {
        existing.hours += hours;
        if (date && !existing.dates.includes(date)) existing.dates.push(date);
        if (workDescription && !existing.descriptions.includes(workDescription)) existing.descriptions.push(workDescription);
      } else {
        byPerson.set(fullName, {
          fullName,
          hours,
          dates: date ? [date] : [],
          descriptions: workDescription ? [workDescription] : [],
        });
      }
    });
    return {
      issueKey: issue.issueKey,
      summary: issue.summary,
      rows: Array.from(byPerson.values()).sort((a, b) => b.hours - a.hours),
    };
  }, [workDescModalIssue, matchingIssues]);

  const workDescModalColumns = [
    { title: "Name", dataIndex: "fullName", key: "fullName" },
    {
      title: "Hours",
      dataIndex: "hours",
      key: "hours",
      render: (h: number) => <Text>{h.toFixed(2)} hrs</Text>,
      sorter: (a: any, b: any) => a.hours - b.hours,
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Days",
      key: "days",
      render: (_: any, r: any) => <Text>{(r.hours / 7.5).toFixed(2)} days</Text>,
    },
    {
      title: "Dates",
      dataIndex: "dates",
      key: "dates",
      render: (dates: string[]) => <Text>{dates.sort().join(", ") || "-"}</Text>,
    },
    {
      title: "Work Descriptions",
      dataIndex: "descriptions",
      key: "descriptions",
      render: (descs: string[]) => (
        <Space direction="vertical" size={2}>
          {descs.length > 0 ? descs.map((d, i) => <Text key={i}>{d}</Text>) : <Text type="secondary">-</Text>}
        </Space>
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

  const workDescModal = (
    <Modal
      open={workDescModalIssue !== null}
      onCancel={() => setWorkDescModalIssue(null)}
      footer={null}
      width={800}
      title={
        workDescModalIssueData
          ? `${workDescModalIssueData.issueKey}${workDescModalIssueData.summary ? ` — ${workDescModalIssueData.summary}` : ""}`
          : "Work Description"
      }
    >
      {workDescModalIssueData && (
        <Table
          dataSource={workDescModalIssueData.rows.map((r) => ({ ...r, key: r.fullName }))}
          columns={workDescModalColumns}
          pagination={false}
          size="small"
        />
      )}
    </Modal>
  );

  // Show issue breakdown if a selector is selected
  if (selectedSelectorKey) {
    const selectedRow = tableData.find(
      (row) => row.key === selectedSelectorKey
    );
    const title = selectedRow ? selectedRow.selector : "Issue Breakdown";

    return (
      <>
        {workDescModal}
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
              {totalIssueEstimatedDays > 0 && (
                <>
                  <Text strong style={{ marginLeft: "16px" }}>
                    Estimated Days:{" "}
                  </Text>
                  <Text>{totalIssueEstimatedDays.toFixed(2)} days</Text>
                </>
              )}
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
      </>
    );
  }

  const summarySummary: TableProps<(typeof tableData)[0]>["summary"] = () => {
    if (exportView) {
      return (
        <Table.Summary.Row style={{ fontWeight: "bold" }}>
          <Table.Summary.Cell index={0}>Sum</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>100%</Table.Summary.Cell>
          {monthsInData.map((_, i) => (
            <Table.Summary.Cell key={`m${i}p`} index={2 + i} />
          ))}
        </Table.Summary.Row>
      );
    }
    return (
      <Table.Summary.Row style={{ fontWeight: "bold" }}>
        <Table.Summary.Cell index={0}>Sum</Table.Summary.Cell>
        <Table.Summary.Cell index={1}>
          {totalHours.toFixed(2)} hrs
        </Table.Summary.Cell>
        <Table.Summary.Cell index={2}>
          {(totalHours / 7.5).toFixed(2)} days
        </Table.Summary.Cell>
        <Table.Summary.Cell index={3}>
          {totalEstimatedDays > 0 ? `${totalEstimatedDays.toFixed(2)} days` : "-"}
        </Table.Summary.Cell>
        <Table.Summary.Cell index={4}>100%</Table.Summary.Cell>
        {monthsInData.flatMap((_, i) => [
          <Table.Summary.Cell key={`m${i}d`} index={5 + i * 2} />,
          <Table.Summary.Cell key={`m${i}p`} index={6 + i * 2} />,
        ])}
      </Table.Summary.Row>
    );
  };

  const isLoadingJiraData = isLoadingAncestors || isLoadingLabels || isLoadingEstimates;

  const exportViewKeys = new Set(["selector", "percentage", ...monthsInData.map((_, i) => `month_${i}_pct`)]);
  const visibleColumns = exportView
    ? summaryColumns.filter((c) => exportViewKeys.has(c.key as string))
    : summaryColumns;

  return (
    <>
      {isLoadingJiraData && (
        <Alert
          type="info"
          showIcon
          message="Loading Jira data — table values may be incomplete until all data has been fetched."
          style={{ marginBottom: 12 }}
        />
      )}
      <Card title="Sankey Analysis (Click a row to drill down)">
        <Table
          dataSource={tableData}
          columns={visibleColumns}
          pagination={false}
          summary={summarySummary}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: "pointer" },
          })}
        />
      </Card>
      {splitByMonth && monthlyChartData.length > 0 && (
        <Card title="Monthly Category Distribution (%)" style={{ marginTop: 16 }}>
          <div style={{ maxWidth: 900 }}>
            <Area
              data={monthlyChartData}
              xField="month"
              yField="percentage"
              colorField="category"
              stack={true}
              height={450}
              scale={{
                color: {
                  domain: colorScale.domain,
                  range: colorScale.range,
                },
              }}
              axis={{
                y: {
                  title: "Percentage (%)",
                  labelFormatter: (v: number) => `${v}%`,
                },
              }}
              tooltip={{
                items: [
                  {
                    channel: "y",
                    valueFormatter: (v: number) => `${Number(v).toFixed(1)}%`,
                  },
                ],
              }}
            />
          </div>
        </Card>
      )}
    </>
  );
};
