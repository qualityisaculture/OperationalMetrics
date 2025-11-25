import React, { useMemo } from "react";
import { Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { JiraIssueWithAggregated } from "../../JiraReport/types";

const { Text } = Typography;

// Helper function to recursively collect all timeSpentDetail from an issue and its children
const collectAllTimeSpentDetail = (
  issue: JiraIssueWithAggregated
): Array<{
  date: string;
  timeSpent: number;
  timeSpentMinutes: number;
  timeSpentDays: number;
}> => {
  const allDetails: Array<{
    date: string;
    timeSpent: number;
    timeSpentMinutes: number;
    timeSpentDays: number;
  }> = [];

  // Add this issue's timeSpentDetail
  if (issue.timeSpentDetail && issue.timeSpentDetail.length > 0) {
    allDetails.push(...issue.timeSpentDetail);
  }

  // Recursively add children's timeSpentDetail
  if (issue.children && issue.children.length > 0) {
    for (const child of issue.children) {
      const childDetails = collectAllTimeSpentDetail(
        child as JiraIssueWithAggregated
      );
      allDetails.push(...childDetails);
    }
  }

  return allDetails;
};

// Helper function to aggregate time spent by month
const aggregateTimeByMonth = (
  timeSpentDetail:
    | Array<{
        date: string;
        timeSpent: number;
        timeSpentMinutes: number;
        timeSpentDays: number;
      }>
    | undefined,
  targetMonth: Date
): number => {
  if (!timeSpentDetail || timeSpentDetail.length === 0) {
    return 0;
  }

  const targetYear = targetMonth.getFullYear();
  const targetMonthNum = targetMonth.getMonth();

  return timeSpentDetail.reduce((sum, entry) => {
    const entryDate = new Date(entry.date);
    if (
      entryDate.getFullYear() === targetYear &&
      entryDate.getMonth() === targetMonthNum
    ) {
      return sum + (entry.timeSpentDays || 0);
    }
    return sum;
  }, 0);
};

// Helper function to aggregate time spent before a given month
const aggregateTimeBeforeMonth = (
  timeSpentDetail:
    | Array<{
        date: string;
        timeSpent: number;
        timeSpentMinutes: number;
        timeSpentDays: number;
      }>
    | undefined,
  beforeMonth: Date
): number => {
  if (!timeSpentDetail || timeSpentDetail.length === 0) {
    return 0;
  }

  const beforeYear = beforeMonth.getFullYear();
  const beforeMonthNum = beforeMonth.getMonth();

  return timeSpentDetail.reduce((sum, entry) => {
    const entryDate = new Date(entry.date);
    if (
      entryDate.getFullYear() < beforeYear ||
      (entryDate.getFullYear() === beforeYear &&
        entryDate.getMonth() < beforeMonthNum)
    ) {
      return sum + (entry.timeSpentDays || 0);
    }
    return sum;
  }, 0);
};

// Helper function to get month label (e.g., "June '25")
const getMonthLabel = (date: Date): string => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
};

interface TimeSpentDetailTableProps {
  dataSource: JiraIssueWithAggregated[];
  onRow?: (record: JiraIssueWithAggregated) => any;
  pagination?: any;
  additionalMonths?: number;
  onAdditionalMonthsChange?: (months: number) => void;
}

export const TimeSpentDetailTable: React.FC<TimeSpentDetailTableProps> = ({
  dataSource,
  onRow,
  pagination = {},
  additionalMonths = 0,
  onAdditionalMonthsChange,
}) => {

  // Calculate the base 6 months (5 months back + current month = 6 total month columns)
  const baseMonths = useMemo(() => {
    const now = new Date();
    const months: Date[] = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(month);
    }
    return months;
  }, []);

  // Calculate additional months if any (add them in the past, before the first month)
  const allMonths = useMemo(() => {
    const months: Date[] = [];
    if (additionalMonths > 0) {
      const firstMonth = baseMonths[0];
      // Add months going backwards from the first month
      for (let i = additionalMonths; i >= 1; i--) {
        const pastMonth = new Date(
          firstMonth.getFullYear(),
          firstMonth.getMonth() - i,
          1
        );
        months.push(pastMonth);
      }
    }
    // Then add all the base months
    months.push(...baseMonths);
    return months;
  }, [baseMonths, additionalMonths]);

  // The first month displayed (which may include additional months added in the past)
  const firstMonth = useMemo(() => {
    return allMonths.length > 0 ? allMonths[0] : baseMonths[0];
  }, [allMonths, baseMonths]);

  const columns: ColumnsType<JiraIssueWithAggregated> = useMemo(() => {
    const cols: ColumnsType<JiraIssueWithAggregated> = [
      {
        title: "Key",
        dataIndex: "key",
        key: "key",
        fixed: "left" as const,
        width: 120,
        render: (key: string, record: JiraIssueWithAggregated) => (
          <a
            href={record.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontWeight: "bold", color: "#1890ff" }}
          >
            <Tag color="orange">{key}</Tag>
          </a>
        ),
        sorter: (a, b) => a.key.localeCompare(b.key),
      },
      {
        title: "Summary",
        dataIndex: "summary",
        key: "summary",
        render: (summary: string) => <Text>{summary}</Text>,
        sorter: (a, b) => a.summary.localeCompare(b.summary),
      },
      {
        title: "Account",
        dataIndex: "account",
        key: "account",
        width: 120,
        render: (account: string) => (
          <Tag color="cyan">{account || "Unknown"}</Tag>
        ),
        sorter: (a, b) => (a.account || "").localeCompare(b.account || ""),
        filters: (() => {
          const uniqueAccounts = [
            ...new Set(
              dataSource.map((issue) => issue.account).filter(Boolean)
            ),
          ].sort();
          return uniqueAccounts.map((account) => ({
            text: account,
            value: account,
          }));
        })(),
        onFilter: (value, record) => record.account === value,
      },
      {
        title: "Original Estimate (aggregated)",
        key: "originalEstimate",
        width: 180,
        render: (_: any, record: JiraIssueWithAggregated) => {
          const originalEstimate =
            record.aggregatedOriginalEstimate !== undefined
              ? record.aggregatedOriginalEstimate
              : record.originalEstimate || 0;
          return (
            <Text>
              {originalEstimate > 0 ? (
                <Tag color="green">
                  {originalEstimate.toFixed(1)} days
                  {record.aggregatedOriginalEstimate !== undefined && (
                    <Text type="secondary" style={{ marginLeft: "4px" }}>
                      (agg)
                    </Text>
                  )}
                </Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aValue =
            a.aggregatedOriginalEstimate !== undefined
              ? a.aggregatedOriginalEstimate
              : a.originalEstimate || 0;
          const bValue =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          return aValue - bValue;
        },
      },
      {
        title: `All prior to ${getMonthLabel(firstMonth)}`,
        key: "beforeFirstMonth",
        width: 150,
        render: (_: any, record: JiraIssueWithAggregated) => {
          const allTimeSpentDetail = collectAllTimeSpentDetail(record);
          const total = aggregateTimeBeforeMonth(allTimeSpentDetail, firstMonth);
          return (
            <Text>
              {total > 0 ? (
                <Tag color="blue">{total.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aAllDetails = collectAllTimeSpentDetail(a);
          const bAllDetails = collectAllTimeSpentDetail(b);
          const aTotal = aggregateTimeBeforeMonth(aAllDetails, firstMonth);
          const bTotal = aggregateTimeBeforeMonth(bAllDetails, firstMonth);
          return aTotal - bTotal;
        },
      },
    ];

    // Add columns for each month
    allMonths.forEach((month) => {
      const monthLabel = getMonthLabel(month);
      cols.push({
        title: monthLabel,
        key: `month${month.getFullYear()}${month.getMonth()}`,
        width: 120,
        render: (_: any, record: JiraIssueWithAggregated) => {
          const allTimeSpentDetail = collectAllTimeSpentDetail(record);
          const total = aggregateTimeByMonth(allTimeSpentDetail, month);
          return (
            <Text>
              {total > 0 ? (
                <Tag color="blue">{total.toFixed(1)} days</Tag>
              ) : (
                <Text type="secondary">-</Text>
              )}
            </Text>
          );
        },
        sorter: (a, b) => {
          const aAllDetails = collectAllTimeSpentDetail(a);
          const bAllDetails = collectAllTimeSpentDetail(b);
          const aTotal = aggregateTimeByMonth(aAllDetails, month);
          const bTotal = aggregateTimeByMonth(bAllDetails, month);
          return aTotal - bTotal;
        },
      });
    });

    // Total Time Booked
    cols.push({
      title: "Total Time Booked",
      key: "totalTimeBooked",
      width: 150,
      render: (_: any, record: JiraIssueWithAggregated) => {
        const allTimeSpentDetail = collectAllTimeSpentDetail(record);
        const total = allTimeSpentDetail.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        return (
          <Text>
            {total > 0 ? (
              <Tag color="blue">{total.toFixed(1)} days</Tag>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Text>
        );
      },
      sorter: (a, b) => {
        const aAllDetails = collectAllTimeSpentDetail(a);
        const bAllDetails = collectAllTimeSpentDetail(b);
        const aTotal = aAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const bTotal = bAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        return aTotal - bTotal;
      },
    });

    // Time Spent Unsplit
    cols.push({
      title: "Time Spent Unsplit",
      key: "timeSpentUnsplit",
      width: 150,
      render: (_: any, record: JiraIssueWithAggregated) => {
        const timeSpent =
          record.aggregatedTimeSpent !== undefined
            ? record.aggregatedTimeSpent
            : record.timeSpent || 0;
        return (
          <Text>
            {timeSpent > 0 ? (
              <Tag color="gold">
                {timeSpent.toFixed(1)} days
                {record.aggregatedTimeSpent !== undefined && (
                  <Text type="secondary" style={{ marginLeft: "4px" }}>
                    (agg)
                  </Text>
                )}
              </Tag>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Text>
        );
      },
      sorter: (a, b) => {
        const aValue =
          a.aggregatedTimeSpent !== undefined
            ? a.aggregatedTimeSpent
            : a.timeSpent || 0;
        const bValue =
          b.aggregatedTimeSpent !== undefined
            ? b.aggregatedTimeSpent
            : b.timeSpent || 0;
        return aValue - bValue;
      },
    });

    // Usage %
    cols.push({
      title: "Usage %",
      key: "usagePercent",
      width: 120,
      render: (_: any, record: JiraIssueWithAggregated) => {
        const originalEstimate =
          record.aggregatedOriginalEstimate !== undefined
            ? record.aggregatedOriginalEstimate
            : record.originalEstimate || 0;
        const allTimeSpentDetail = collectAllTimeSpentDetail(record);
        const totalTimeBooked = allTimeSpentDetail.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );

        if (originalEstimate > 0) {
          const usagePercent = (totalTimeBooked / originalEstimate) * 100;
          const color =
            usagePercent > 100
              ? "red"
              : usagePercent > 75
                ? "orange"
                : usagePercent > 50
                  ? "blue"
                  : "green";
          return (
            <Text>
              <Tag color={color}>
                {usagePercent.toFixed(1)}%
                {(record.aggregatedOriginalEstimate !== undefined ||
                  record.aggregatedTimeSpent !== undefined) && (
                  <Text type="secondary" style={{ marginLeft: "4px" }}>
                    (agg)
                  </Text>
                )}
              </Tag>
            </Text>
          );
        }
        return <Text type="secondary">-</Text>;
      },
      sorter: (a, b) => {
        const aOriginalEstimate =
          a.aggregatedOriginalEstimate !== undefined
            ? a.aggregatedOriginalEstimate
            : a.originalEstimate || 0;
        const aAllDetails = collectAllTimeSpentDetail(a);
        const aTotalTimeBooked = aAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const aUsagePercent =
          aOriginalEstimate > 0 ? (aTotalTimeBooked / aOriginalEstimate) * 100 : 0;

        const bOriginalEstimate =
          b.aggregatedOriginalEstimate !== undefined
            ? b.aggregatedOriginalEstimate
            : b.originalEstimate || 0;
        const bAllDetails = collectAllTimeSpentDetail(b);
        const bTotalTimeBooked = bAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const bUsagePercent =
          bOriginalEstimate > 0 ? (bTotalTimeBooked / bOriginalEstimate) * 100 : 0;

        return aUsagePercent - bUsagePercent;
      },
    });

    // Remaining
    cols.push({
      title: "Remaining",
      key: "remaining",
      width: 120,
      render: (_: any, record: JiraIssueWithAggregated) => {
        const originalEstimate =
          record.aggregatedOriginalEstimate !== undefined
            ? record.aggregatedOriginalEstimate
            : record.originalEstimate || 0;
        const allTimeSpentDetail = collectAllTimeSpentDetail(record);
        const totalTimeBooked = allTimeSpentDetail.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const remaining = originalEstimate - totalTimeBooked;

        if (originalEstimate > 0 || totalTimeBooked > 0) {
          const color = remaining < 0 ? "red" : remaining > 0 ? "green" : "default";
          return (
            <Text>
              <Tag color={color}>
                {remaining > 0 ? "" : ""}
                {remaining.toFixed(1)} days
                {(record.aggregatedOriginalEstimate !== undefined ||
                  record.aggregatedTimeSpent !== undefined) && (
                  <Text type="secondary" style={{ marginLeft: "4px" }}>
                    (agg)
                  </Text>
                )}
              </Tag>
            </Text>
          );
        }
        return <Text type="secondary">-</Text>;
      },
      sorter: (a, b) => {
        const aOriginalEstimate =
          a.aggregatedOriginalEstimate !== undefined
            ? a.aggregatedOriginalEstimate
            : a.originalEstimate || 0;
        const aAllDetails = collectAllTimeSpentDetail(a);
        const aTotalTimeBooked = aAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const aRemaining = aOriginalEstimate - aTotalTimeBooked;

        const bOriginalEstimate =
          b.aggregatedOriginalEstimate !== undefined
            ? b.aggregatedOriginalEstimate
            : b.originalEstimate || 0;
        const bAllDetails = collectAllTimeSpentDetail(b);
        const bTotalTimeBooked = bAllDetails.reduce(
          (sum, entry) => sum + (entry.timeSpentDays || 0),
          0
        );
        const bRemaining = bOriginalEstimate - bTotalTimeBooked;

        return aRemaining - bRemaining;
      },
    });

    return cols;
  }, [firstMonth, allMonths, additionalMonths]);

  // Calculate sums for the summary row
  const summaryData = useMemo(() => {
    let totalOriginalEstimate = 0;
    let totalBeforeFirstMonth = 0;
    const totalByMonth: { [key: string]: number } = {};
    let totalTimeBooked = 0;
    let totalTimeSpentUnsplit = 0;
    let totalRemaining = 0;

    // Initialize totals for each month
    allMonths.forEach((month) => {
      const monthKey = `month${month.getFullYear()}${month.getMonth()}`;
      totalByMonth[monthKey] = 0;
    });

    // Calculate totals across all records
    dataSource.forEach((record) => {
      // Original Estimate
      const originalEstimate =
        record.aggregatedOriginalEstimate !== undefined
          ? record.aggregatedOriginalEstimate
          : record.originalEstimate || 0;
      totalOriginalEstimate += originalEstimate;

      // All time spent detail
      const allTimeSpentDetail = collectAllTimeSpentDetail(record);

      // Before first month
      const beforeFirstMonth = aggregateTimeBeforeMonth(
        allTimeSpentDetail,
        firstMonth
      );
      totalBeforeFirstMonth += beforeFirstMonth;

      // By month
      allMonths.forEach((month) => {
        const monthKey = `month${month.getFullYear()}${month.getMonth()}`;
        const monthTotal = aggregateTimeByMonth(allTimeSpentDetail, month);
        totalByMonth[monthKey] += monthTotal;
      });

      // Total Time Booked
      const recordTotalTimeBooked = allTimeSpentDetail.reduce(
        (sum, entry) => sum + (entry.timeSpentDays || 0),
        0
      );
      totalTimeBooked += recordTotalTimeBooked;

      // Time Spent Unsplit
      const recordTimeSpentUnsplit =
        record.aggregatedTimeSpent !== undefined
          ? record.aggregatedTimeSpent
          : record.timeSpent || 0;
      totalTimeSpentUnsplit += recordTimeSpentUnsplit;

      // Remaining
      const remaining = originalEstimate - recordTotalTimeBooked;
      totalRemaining += remaining;
    });

    return {
      totalOriginalEstimate,
      totalBeforeFirstMonth,
      totalByMonth,
      totalTimeBooked,
      totalTimeSpentUnsplit,
      totalRemaining,
    };
  }, [dataSource, firstMonth, allMonths]);

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="key"
      pagination={pagination}
      onRow={onRow}
      scroll={{ x: "max-content" }}
      size="small"
      style={{ marginTop: 16 }}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ backgroundColor: "#fafafa" }}>
            <Table.Summary.Cell index={0} colSpan={1}>
              <Text strong>Total</Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} colSpan={2}>
              <Text type="secondary"></Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>
              <Text>
                {summaryData.totalOriginalEstimate > 0 ? (
                  <Tag color="green">
                    {summaryData.totalOriginalEstimate.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={4}>
              <Text>
                {summaryData.totalBeforeFirstMonth > 0 ? (
                  <Tag color="blue">
                    {summaryData.totalBeforeFirstMonth.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
            {allMonths.map((month) => {
              const monthKey = `month${month.getFullYear()}${month.getMonth()}`;
              const monthTotal = summaryData.totalByMonth[monthKey] || 0;
              return (
                <Table.Summary.Cell key={monthKey}>
                  <Text>
                    {monthTotal > 0 ? (
                      <Tag color="blue">{monthTotal.toFixed(1)} days</Tag>
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </Text>
                </Table.Summary.Cell>
              );
            })}
            <Table.Summary.Cell>
              <Text>
                {summaryData.totalTimeBooked > 0 ? (
                  <Tag color="blue">
                    {summaryData.totalTimeBooked.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell>
              <Text>
                {summaryData.totalTimeSpentUnsplit > 0 ? (
                  <Tag color="gold">
                    {summaryData.totalTimeSpentUnsplit.toFixed(1)} days
                  </Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell>
              <Text>
                {summaryData.totalOriginalEstimate > 0 ? (
                  (() => {
                    const overallUsagePercent =
                      (summaryData.totalTimeBooked /
                        summaryData.totalOriginalEstimate) *
                      100;
                    const color =
                      overallUsagePercent > 100
                        ? "red"
                        : overallUsagePercent > 75
                          ? "orange"
                          : overallUsagePercent > 50
                            ? "blue"
                            : "green";
                    return (
                      <Tag color={color}>
                        {overallUsagePercent.toFixed(1)}%
                      </Tag>
                    );
                  })()
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell>
              <Text>
                <Tag
                  color={
                    summaryData.totalRemaining < 0
                      ? "red"
                      : summaryData.totalRemaining > 0
                        ? "green"
                        : "default"
                  }
                >
                  {summaryData.totalRemaining.toFixed(1)} days
                </Tag>
              </Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  );
};

