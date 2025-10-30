import React from "react";
import { Button, Tag, Tooltip, Typography } from "antd";
import {
  ExclamationCircleOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { JiraIssueWithAggregated } from "../../JiraReport/types";

const { Text } = Typography;

interface UnifiedColumnProps {
  showFavoriteColumn?: boolean;
  favoriteItems?: Set<string>;
  toggleFavorite?: (itemKey: string, event: React.MouseEvent) => void;
  navigationStack?: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>;
  currentIssues?: JiraIssueWithAggregated[];
  projectIssues?: JiraIssueWithAggregated[];
  getWorkstreamDataCellSpan?: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number };
  timeBookingsDate?: string; // Add the date prop
  showAdditionalColumns?: boolean;
}

export const getUnifiedColumns = ({
  showFavoriteColumn = false,
  favoriteItems,
  toggleFavorite,
  navigationStack,
  currentIssues,
  projectIssues,
  getWorkstreamDataCellSpan,
  timeBookingsDate,
  showAdditionalColumns,
}: UnifiedColumnProps): ColumnsType<JiraIssueWithAggregated> => {
  const columns: ColumnsType<JiraIssueWithAggregated> = [];

  if (showFavoriteColumn && favoriteItems && toggleFavorite) {
    columns.push({
      title: "Favorite",
      key: "favorite",
      width: 60,
      fixed: "left",
      render: (_, record) => (
        <Button
          type="text"
          icon={
            favoriteItems.has(record.key) ? (
              <StarFilled style={{ color: "#faad14" }} />
            ) : (
              <StarOutlined />
            )
          }
          onClick={(e) => toggleFavorite(record.key, e)}
          style={{ padding: 0, border: "none" }}
        />
      ),
    });
  }

  columns.push(
    {
      title: "Issue Key",
      dataIndex: "key",
      key: "key",
      fixed: "left",
      width: 120,
      render: (key: string, record: any) => (
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
      sorter: (a: any, b: any) => a.key.localeCompare(b.key),
      onFilter: (value, record: any) =>
        record.key.toLowerCase().includes((value as string).toLowerCase()),
      filterSearch: true,
      filters:
        navigationStack && currentIssues && projectIssues
          ? (() => {
              const currentData =
                navigationStack.length > 1 ? currentIssues : projectIssues;
              const uniqueKeys = [
                ...new Set(currentData.map((issue) => issue.key)),
              ].sort();
              return uniqueKeys.map((key) => ({ text: key, value: key }));
            })()
          : undefined,
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      render: (summary: string) => <Text>{summary}</Text>,
      sorter: (a: any, b: any) => a.summary.localeCompare(b.summary),
    },
    {
      title: "Issue Type",
      dataIndex: "type",
      key: "type",
      defaultSortOrder:
        navigationStack && navigationStack.length === 1 ? "descend" : undefined,
      render: (type: string, record: any) => {
        if (navigationStack && navigationStack.length === 1) {
          const isWorkstream = type.toLowerCase().includes("workstream");

          if (isWorkstream) {
            return <Tag color="blue">{type}</Tag>;
          } else {
            return (
              <Tooltip
                title="Only issues of type 'Workstream' should be at this level of the Project. You should probably move this issue inside an existing Workstream."
                placement="top"
              >
                <Tag color="red" icon={<ExclamationCircleOutlined />}>
                  {type}
                </Tag>
              </Tooltip>
            );
          }
        }
        return <Tag color="blue">{type}</Tag>;
      },
      sorter: (a: any, b: any) => a.type.localeCompare(b.type),
      filters:
        navigationStack && currentIssues && projectIssues
          ? (() => {
              const currentData =
                navigationStack.length > 1 ? currentIssues : projectIssues;
              const uniqueTypes = [
                ...new Set(currentData.map((issue) => issue.type)),
              ].sort();
              return uniqueTypes.map((type) => ({ text: type, value: type }));
            })()
          : undefined,
      onFilter: (value, record: any) => record.type === value,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (!status || status === "Unknown") {
          return <Tag color="default">Unknown</Tag>;
        }

        const getStatusColor = (status: string) => {
          const statusLower = status.toLowerCase();
          if (
            statusLower.includes("done") ||
            statusLower.includes("closed") ||
            statusLower.includes("resolved")
          ) {
            return "green";
          } else if (
            statusLower.includes("in progress") ||
            statusLower.includes("development")
          ) {
            return "blue";
          } else if (
            statusLower.includes("review") ||
            statusLower.includes("testing")
          ) {
            return "purple";
          } else if (
            statusLower.includes("blocked") ||
            statusLower.includes("on hold")
          ) {
            return "red";
          } else if (
            statusLower.includes("backlog") ||
            statusLower.includes("to do")
          ) {
            return "default";
          } else {
            return "orange";
          }
        };

        return <Tag color={getStatusColor(status)}>{status}</Tag>;
      },
      sorter: (a: any, b: any) =>
        (a.status || "").localeCompare(b.status || ""),
      filters: (() => {
        // Try to get statuses from projectIssues first, then from current data
        const dataSource = projectIssues || currentIssues || [];
        const uniqueStatuses = [
          ...new Set(dataSource.map((issue) => issue.status).filter(Boolean)),
        ].sort();
        return uniqueStatuses.map((status) => ({
          text: status,
          value: status,
        }));
      })(),
      onFilter: (value, record: any) => record.status === value,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => {
        if (!priority || priority === "None") {
          return <Tag color="default">None</Tag>;
        }

        const getPriorityColor = (priority: string) => {
          const priorityLower = priority.toLowerCase();
          if (
            priorityLower.includes("highest") ||
            priorityLower.includes("critical")
          ) {
            return "red";
          } else if (priorityLower.includes("high")) {
            return "orange";
          } else if (priorityLower.includes("medium")) {
            return "blue";
          } else if (priorityLower.includes("low")) {
            return "green";
          } else if (priorityLower.includes("lowest")) {
            return "cyan";
          } else {
            return "default";
          }
        };

        return <Tag color={getPriorityColor(priority)}>{priority}</Tag>;
      },
      sorter: (a: any, b: any) =>
        (a.priority || "").localeCompare(b.priority || ""),
      filters: (() => {
        // Try to get priorities from projectIssues first, then from current data
        const dataSource = projectIssues || currentIssues || [];
        const uniquePriorities = [
          ...new Set(dataSource.map((issue) => issue.priority).filter(Boolean)),
        ].sort();
        return uniquePriorities.map((priority) => ({
          text: priority!,
          value: priority!,
        }));
      })(),
      onFilter: (value, record: any) => record.priority === value,
    },
    {
      title: "Account",
      dataIndex: "account",
      key: "account",
      render: (account: string) => (
        <Tag color="cyan">{account || "Unknown"}</Tag>
      ),
      sorter: (a: any, b: any) =>
        (a.account || "").localeCompare(b.account || ""),
      filters: (() => {
        // Try to get accounts from projectIssues first, then from current data
        const dataSource = projectIssues || currentIssues || [];
        const uniqueAccounts = [
          ...new Set(dataSource.map((issue) => issue.account).filter(Boolean)),
        ].sort();
        return uniqueAccounts.map((account) => ({
          text: account,
          value: account,
        }));
      })(),
      onFilter: (value, record: any) => record.account === value,
    }
  );

  if (navigationStack && navigationStack.length > 1) {
    columns.push({
      title: "Children",
      dataIndex: "childCount",
      key: "children",
      render: (childCount: number) => (
        <Text>
          {childCount > 0 ? (
            <Tag color="purple">{childCount}</Tag>
          ) : (
            <Text type="secondary">0</Text>
          )}
        </Text>
      ),
      sorter: (a: any, b: any) => a.childCount - b.childCount,
    });
  }

  if (getWorkstreamDataCellSpan) {
    columns.push(
      // Baseline Estimate (conditional)
      ...(showAdditionalColumns
        ? [
            {
              title: (
                <Tooltip
                  title={
                    <div>
                      <div>
                        Uses Jira custom field 'customfield_11753' (Baseline
                        Estimate).
                      </div>
                      <div>Value is already in days.</div>
                      <div>
                        Shows the workstream's own baseline estimate (not
                        aggregated from children).
                      </div>
                    </div>
                  }
                >
                  <span style={{ cursor: "help" }}>Baseline Estimate</span>
                </Tooltip>
              ),
              dataIndex: "baselineEstimate",
              key: "baselineEstimate",
              render: (baselineEstimate: number | null | undefined) => {
                return (
                  <Text>
                    {baselineEstimate !== null &&
                    baselineEstimate !== undefined ? (
                      <Tag color="orange">
                        {baselineEstimate.toFixed(1)} days
                      </Tag>
                    ) : (
                      <Text type="secondary">-</Text>
                    )}
                  </Text>
                );
              },
              sorter: (a, b) =>
                (a.baselineEstimate || 0) - (b.baselineEstimate || 0),
            },
          ]
        : []),
      {
        title: (
          <Tooltip
            title={
              <div>
                <div>
                  Uses Jira field 'timeoriginalestimate' (Original estimate) (in
                  seconds), converted to days: (timeoriginalestimate / 3600 /
                  7.5).
                </div>
                <div>
                  Shows aggregated value: ticket's own value + sum of all
                  children's original estimates recursively.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>Original Estimate</span>
          </Tooltip>
        ),
        dataIndex: "originalEstimate",
        key: "originalEstimate",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, true),
        render: (
          estimate: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          const hasAggregatedData =
            record.aggregatedOriginalEstimate !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedOriginalEstimate
            : estimate;

          if (
            navigationStack &&
            navigationStack.length === 1 &&
            (valueToShow === null ||
              valueToShow === undefined ||
              valueToShow === 0)
          ) {
            return (
              <Text
                type="secondary"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                Click to request data for this workstream
              </Text>
            );
          }

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="green">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
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
        title: (
          <Tooltip
            title={
              <div>
                <div>
                  Uses Jira field 'timespent' (Tempo Logged) (in seconds),
                  converted to days: (timespent / 3600 / 7.5).
                </div>
                <div>
                  Shows aggregated value: ticket's own value + sum of all
                  children's time spent recursively.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>Time Spent</span>
          </Tooltip>
        ),
        dataIndex: "timeSpent",
        key: "timeSpent",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, false),
        render: (
          timeSpent: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          const hasAggregatedData = record.aggregatedTimeSpent !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedTimeSpent
            : timeSpent;

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="blue">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
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
      },
      {
        title: (
          <Tooltip
            title={
              <div>
                <div>
                  Uses Jira field 'timeestimate' (Time remaining) (in seconds),
                  converted to days: (timeestimate / 3600 / 7.5).
                </div>
                <div>
                  Shows aggregated value: ticket's own value + sum of all
                  children's remaining estimates recursively.
                </div>
                <div>
                  NOTE: This is not the estimate minus the days booked. If no
                  Time Remaining value is set, it will be blank.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>ETC</span>
          </Tooltip>
        ),
        dataIndex: "timeRemaining",
        key: "timeRemaining",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, false),
        render: (
          timeRemaining: number | null | undefined,
          record: JiraIssueWithAggregated
        ) => {
          const hasAggregatedData =
            record.aggregatedTimeRemaining !== undefined;
          const valueToShow = hasAggregatedData
            ? record.aggregatedTimeRemaining
            : timeRemaining;

          return (
            <Text>
              {valueToShow !== null && valueToShow !== undefined ? (
                <Tag color="red">
                  {valueToShow.toFixed(1)} days
                  {hasAggregatedData && (
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
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const bValue =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          return aValue - bValue;
        },
      },
      {
        title: (
          <Tooltip
            title={
              <div>
                <div>Calculated as: Time Spent + ETC.</div>
                <div>
                  Uses aggregated values (ticket's own value + all children's
                  values): (aggregatedTimeSpent + aggregatedTimeRemaining).
                </div>
                <div>
                  Shows the projected total time for the work item when
                  completed.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>
              Total Forecast (Actual + ETC)
            </span>
          </Tooltip>
        ),
        key: "totalForecast",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;

          return (
            <Text>
              {totalForecast > 0 ? (
                <Tag color="purple">
                  {totalForecast.toFixed(1)} days
                  {(record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
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
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aTotal = aTimeSpent + aTimeRemaining;

          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bTotal = bTimeSpent + bTimeRemaining;

          return aTotal - bTotal;
        },
      },
      {
        title: (
          <Tooltip
            title={
              <div>
                <div>
                  Calculated as: (Total Forecast - Original Estimate) = (Time
                  Spent + ETC - Original Estimate).
                </div>
                <div>
                  Uses aggregated values (ticket's own value + all children's
                  values).
                </div>
                <div>
                  Positive values indicate over-estimation, negative values
                  indicate under-estimation.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>Variance (Days)</span>
          </Tooltip>
        ),
        key: "varianceDays",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          const originalEstimate =
            record.aggregatedOriginalEstimate !== undefined
              ? record.aggregatedOriginalEstimate
              : record.originalEstimate || 0;
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;
          const variance = totalForecast - originalEstimate;

          if (originalEstimate > 0 || totalForecast > 0) {
            const color =
              variance > 0 ? "red" : variance < 0 ? "green" : "default";
            return (
              <Text>
                <Tag color={color}>
                  {variance > 0 ? "+" : ""}
                  {variance.toFixed(1)} days
                  {(record.aggregatedOriginalEstimate !== undefined ||
                    record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
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
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aVariance = aTimeSpent + aTimeRemaining - aOriginalEstimate;

          const bOriginalEstimate =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bVariance = bTimeSpent + bTimeRemaining - bOriginalEstimate;

          return aVariance - bVariance;
        },
      },
      {
        title: (
          <Tooltip
            title={
              <div>
                <div>
                  Calculated as: ((Total Forecast - Original Estimate) /
                  Original Estimate) × 100% = ((Time Spent + Estimate to
                  Complete - Original Estimate) / Original Estimate) × 100%.
                </div>
                <div>
                  Uses aggregated values (ticket's own value + all children's
                  values).
                </div>
                <div>
                  Positive percentages indicate over-estimation, negative
                  percentages indicate under-estimation.
                </div>
              </div>
            }
          >
            <span style={{ cursor: "help" }}>Variance (%)</span>
          </Tooltip>
        ),
        key: "variancePercent",
        onCell: (record: JiraIssueWithAggregated) =>
          getWorkstreamDataCellSpan(record, false),
        render: (_, record: JiraIssueWithAggregated) => {
          const originalEstimate =
            record.aggregatedOriginalEstimate !== undefined
              ? record.aggregatedOriginalEstimate
              : record.originalEstimate || 0;
          const timeSpent =
            record.aggregatedTimeSpent !== undefined
              ? record.aggregatedTimeSpent
              : record.timeSpent || 0;
          const timeRemaining =
            record.aggregatedTimeRemaining !== undefined
              ? record.aggregatedTimeRemaining
              : record.timeRemaining || 0;

          const totalForecast = timeSpent + timeRemaining;
          const variance = totalForecast - originalEstimate;

          if (originalEstimate > 0) {
            const variancePercent = (variance / originalEstimate) * 100;
            const color =
              variancePercent > 0
                ? "red"
                : variancePercent < 0
                  ? "green"
                  : "default";
            return (
              <Text>
                <Tag color={color}>
                  {variancePercent > 0 ? "+" : ""}
                  {variancePercent.toFixed(1)}%
                  {(record.aggregatedTimeSpent !== undefined ||
                    record.aggregatedTimeRemaining !== undefined) && (
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
          const aTimeSpent =
            a.aggregatedTimeSpent !== undefined
              ? a.aggregatedTimeSpent
              : a.timeSpent || 0;
          const aTimeRemaining =
            a.aggregatedTimeRemaining !== undefined
              ? a.aggregatedTimeRemaining
              : a.timeRemaining || 0;
          const aVariancePercent =
            aOriginalEstimate > 0
              ? ((aTimeSpent + aTimeRemaining - aOriginalEstimate) /
                  aOriginalEstimate) *
                100
              : 0;

          const bOriginalEstimate =
            b.aggregatedOriginalEstimate !== undefined
              ? b.aggregatedOriginalEstimate
              : b.originalEstimate || 0;
          const bTimeSpent =
            b.aggregatedTimeSpent !== undefined
              ? b.aggregatedTimeSpent
              : b.timeSpent || 0;
          const bTimeRemaining =
            b.aggregatedTimeRemaining !== undefined
              ? b.aggregatedTimeRemaining
              : b.timeRemaining || 0;
          const bVariancePercent =
            bOriginalEstimate > 0
              ? ((bTimeSpent + bTimeRemaining - bOriginalEstimate) /
                  bOriginalEstimate) *
                100
              : 0;

          return aVariancePercent - bVariancePercent;
        },
      }
    );
  }

  // Add the "Time Spent since Date" column at the end
  if (timeBookingsDate) {
    columns.push({
      title: `Time Spent since ${timeBookingsDate}`,
      key: "actualDaysLogged",
      onCell: (record: JiraIssueWithAggregated) =>
        getWorkstreamDataCellSpan
          ? getWorkstreamDataCellSpan(record, false)
          : {},
      render: (_, record: JiraIssueWithAggregated) => {
        // Calculate aggregated time for the selected date and later
        let totalTimeLogged = 0;

        if (record.timeDataByKey && timeBookingsDate) {
          // For workstreams with time data, aggregate all time from the selected date onwards
          try {
            Object.values(record.timeDataByKey).forEach((timeDataArray) => {
              if (Array.isArray(timeDataArray)) {
                timeDataArray.forEach((timeEntry) => {
                  if (
                    timeEntry &&
                    timeEntry.date &&
                    timeEntry.timeSpent &&
                    timeEntry.date >= timeBookingsDate
                  ) {
                    totalTimeLogged += timeEntry.timeSpent;
                  }
                });
              }
            });
          } catch (error) {
            console.warn("Error processing timeDataByKey:", error);
          }
        } else if (record.timeBookings && timeBookingsDate) {
          // For individual issues with time bookings, sum time from the selected date onwards
          try {
            record.timeBookings.forEach((timeEntry) => {
              if (
                timeEntry &&
                timeEntry.date &&
                timeEntry.timeSpent &&
                timeEntry.date >= timeBookingsDate
              ) {
                totalTimeLogged += timeEntry.timeSpent;
              }
            });
          } catch (error) {
            console.warn("Error processing timeBookings:", error);
          }
        }

        // If this is a workstream with children, show aggregated total
        if (record.childCount > 0 && totalTimeLogged > 0) {
          return (
            <Text>
              <Tag color="blue">
                {totalTimeLogged.toFixed(1)} days
                <Text type="secondary" style={{ marginLeft: "4px" }}>
                  (agg)
                </Text>
              </Tag>
            </Text>
          );
        } else if (totalTimeLogged > 0) {
          // For individual issues
          return (
            <Text>
              <Tag color="blue">{totalTimeLogged.toFixed(1)} days</Tag>
            </Text>
          );
        }

        // Show helpful message when no data is available
        if (timeBookingsDate) {
          return (
            <Text type="secondary" style={{ fontSize: "11px" }}>
              No time data since {timeBookingsDate}
            </Text>
          );
        }

        return <Text type="secondary">-</Text>;
      },
      sorter: (a, b) => {
        // Calculate total time for sorting
        const getTotalTime = (record: JiraIssueWithAggregated): number => {
          let totalTime = 0;

          if (record.timeDataByKey && timeBookingsDate) {
            try {
              Object.values(record.timeDataByKey).forEach((timeDataArray) => {
                if (Array.isArray(timeDataArray)) {
                  timeDataArray.forEach((timeEntry) => {
                    if (
                      timeEntry &&
                      timeEntry.date &&
                      timeEntry.timeSpent &&
                      timeEntry.date >= timeBookingsDate
                    ) {
                      totalTime += timeEntry.timeSpent;
                    }
                  });
                }
              });
            } catch (error) {
              console.warn("Error processing timeDataByKey in sorter:", error);
            }
          } else if (record.timeBookings && timeBookingsDate) {
            try {
              record.timeBookings.forEach((timeEntry) => {
                if (
                  timeEntry &&
                  timeEntry.date &&
                  timeEntry.timeSpent &&
                  timeEntry.date >= timeBookingsDate
                ) {
                  totalTime += timeEntry.timeSpent;
                }
              });
            } catch (error) {
              console.warn("Error processing timeBookings in sorter:", error);
            }
          }

          return totalTime;
        };

        return getTotalTime(a) - getTotalTime(b);
      },
    });
  }

  return columns;
};
