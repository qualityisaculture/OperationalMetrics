import React from "react";
import { Button, Tag, Tooltip, Typography } from "antd";
import {
  ExclamationCircleOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { JiraIssueWithAggregated } from "../../../JiraReport/types";

const { Text } = Typography;

export const getIssueColumns = (
  favoriteItems: Set<string>,
  toggleFavorite: (itemKey: string, event: React.MouseEvent) => void,
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
    data: JiraIssueWithAggregated[];
  }>,
  currentIssues: JiraIssueWithAggregated[],
  projectIssues: JiraIssueWithAggregated[],
  getWorkstreamDataCellSpan: (
    record: JiraIssueWithAggregated,
    isFirstColumn?: boolean
  ) => { colSpan?: number },
  showAdditionalColumns?: boolean
): ColumnsType<JiraIssueWithAggregated> => [
  {
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
  },
  {
    title: "Issue Key",
    dataIndex: "key",
    key: "key",
    fixed: "left",
    width: 120,
    render: (key: string, record: JiraIssueWithAggregated) => (
      <a
        href={record.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // Prevent row click when clicking link
        style={{ fontWeight: "bold", color: "#1890ff" }}
      >
        <Tag color="orange">{key}</Tag>
      </a>
    ),
    sorter: (a, b) => a.key.localeCompare(b.key),
    onFilter: (value, record) =>
      record.key.toLowerCase().includes((value as string).toLowerCase()),
    filterSearch: true,
    filters: (() => {
      // Get unique issue keys from the current data
      const currentData =
        navigationStack.length > 1 ? currentIssues : projectIssues;
      const uniqueKeys = [
        ...new Set(currentData.map((issue) => issue.key)),
      ].sort();
      return uniqueKeys.map((key) => ({ text: key, value: key }));
    })(),
  },
  {
    title: "Summary",
    dataIndex: "summary",
    key: "summary",
    width: 300,
    render: (summary: string) => <Text>{summary}</Text>,
    sorter: (a, b) => a.summary.localeCompare(b.summary),
  },
  {
    title: "Issue Type",
    dataIndex: "type",
    key: "type",
    width: 150,
    defaultSortOrder: navigationStack.length === 1 ? "descend" : undefined,
    render: (type: string, record: JiraIssueWithAggregated) => {
      // Only apply special styling at the project workstreams level (navigationStack.length === 1)
      if (navigationStack.length === 1) {
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

      // At other levels, show normal blue tags
      return <Tag color="blue">{type}</Tag>;
    },
    sorter: (a, b) => a.type.localeCompare(b.type),
    filters: (() => {
      // Get unique issue types from the current data
      const currentData =
        navigationStack.length > 1 ? currentIssues : projectIssues;
      const uniqueTypes = [
        ...new Set(currentData.map((issue) => issue.type)),
      ].sort();
      return uniqueTypes.map((type) => ({ text: type, value: type }));
    })(),
    onFilter: (value, record) => record.type === value,
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 150,
    render: (status: string) => {
      // Handle undefined or empty status
      if (!status || status === "Unknown") {
        return <Tag color="default">Unknown</Tag>;
      }

      // Define color mapping for different statuses
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
    sorter: (a, b) => (a.status || "").localeCompare(b.status || ""),
    filters: (() => {
      // Get unique statuses from the current data
      const uniqueStatuses = [
        ...new Set(projectIssues.map((issue) => issue.status).filter(Boolean)),
      ].sort();
      return uniqueStatuses.map((status) => ({
        text: status,
        value: status,
      }));
    })(),
    onFilter: (value, record) => record.status === value,
  },
  {
    title: "Account",
    dataIndex: "account",
    key: "account",
    width: 120,
    render: (account: string) => {
      return <Tag color="cyan">{account}</Tag>;
    },
    sorter: (a, b) => a.account.localeCompare(b.account),
    filters: (() => {
      // Get unique accounts from the current data
      const uniqueAccounts = [
        ...new Set(projectIssues.map((issue) => issue.account)),
      ].sort();
      return uniqueAccounts.map((account) => ({
        text: account,
        value: account,
      }));
    })(),
    onFilter: (value, record) => record.account === value,
  },
  // Only show Children column when not viewing workstreams (when we have child count data)
  ...(navigationStack.length > 1
    ? [
        {
          title: "Children",
          dataIndex: "childCount",
          key: "children",
          width: 100,
          render: (childCount: number) => (
            <Text>
              {childCount > 0 ? (
                <Tag color="purple">{childCount}</Tag>
              ) : (
                <Text type="secondary">0</Text>
              )}
            </Text>
          ),
          sorter: (a, b) => a.childCount - b.childCount,
        },
      ]
    : []),
  // Conditionally include Baseline Estimate
  ...((showAdditionalColumns
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
                    Shows the workstream's own baseline estimate (not aggregated
                    from children).
                  </div>
                </div>
              }
            >
              <span style={{ cursor: "help" }}>Baseline Estimate</span>
            </Tooltip>
          ),
          dataIndex: "baselineEstimate",
          key: "baselineEstimate",
          width: 150,
          render: (baselineEstimate: number | null | undefined) => {
            return (
              <Text>
                {baselineEstimate !== null && baselineEstimate !== undefined ? (
                  <Tag color="orange">{baselineEstimate.toFixed(1)} days</Tag>
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
    : []) as any),
  // Conditionally include Workstream Estimate
  ...((showAdditionalColumns
    ? [
        {
          title: (
            <Tooltip
              title={
                <div>
                  <div>
                    Uses Jira field 'timeoriginalestimate' (Original estimate)
                    (in seconds), converted to days: (timeoriginalestimate /
                    3600 / 7.5).
                  </div>
                  <div>
                    Shows only the workstream's own original estimate value (not
                    aggregated from children).
                  </div>
                </div>
              }
            >
              <span style={{ cursor: "help" }}>Workstream Estimate</span>
            </Tooltip>
          ),
          dataIndex: "originalEstimate",
          key: "workstreamEstimate",
          width: 150,
          onCell: (record: JiraIssueWithAggregated) =>
            getWorkstreamDataCellSpan(record, true),
          render: (estimate: number | null | undefined) => {
            // Always show the workstream's own value, never aggregated
            return (
              <Text>
                {estimate !== null && estimate !== undefined ? (
                  <Tag color="green">{estimate.toFixed(1)} days</Tag>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Text>
            );
          },
          sorter: (a, b) =>
            (a.originalEstimate || 0) - (b.originalEstimate || 0),
        },
      ]
    : []) as any),
  {
    title: (
      <Tooltip
        title={
          <div>
            <div>
              Uses Jira field 'timeoriginalestimate' (Original estimate) (in
              seconds), converted to days: (timeoriginalestimate / 3600 / 7.5).
            </div>
            <div>
              Shows aggregated value: ticket's own value + sum of all children's
              original estimates recursively.
            </div>
          </div>
        }
      >
        <span style={{ cursor: "help" }}>Original Estimate</span>
      </Tooltip>
    ),
    dataIndex: "originalEstimate",
    key: "originalEstimate",
    width: 150,
    onCell: (record: JiraIssueWithAggregated) =>
      getWorkstreamDataCellSpan(record, true),
    render: (
      estimate: number | null | undefined,
      record: JiraIssueWithAggregated
    ) => {
      // Show aggregated values if available (either for workstreams or items)
      const hasAggregatedData = record.aggregatedOriginalEstimate !== undefined;

      // At Project Workstreams level, only show aggregated values, not individual estimates
      // to avoid confusion (individual estimates don't include child issues)
      const valueToShow =
        navigationStack.length === 1
          ? hasAggregatedData
            ? record.aggregatedOriginalEstimate
            : null // Leave blank at project level if no aggregated data
          : hasAggregatedData
            ? record.aggregatedOriginalEstimate
            : estimate;

      // At Project Workstreams level, show message if no aggregated data
      if (navigationStack.length === 1 && !hasAggregatedData) {
        // Check if this workstream has been requested
        if (record.hasBeenRequested) {
          if (record.hasData === false) {
            return (
              <Text
                type="danger"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                No data available
              </Text>
            );
          } else {
            return (
              <Text
                type="secondary"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                Data loaded
              </Text>
            );
          }
        } else if (
          record.hasChildren !== null &&
          record.hasChildren !== undefined
        ) {
          // We know whether this workstream has children from the project workstreams request
          if (record.hasChildren === false) {
            return (
              <Text
                type="danger"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                No data available
              </Text>
            );
          } else {
            return (
              <Text
                type="secondary"
                style={{ fontSize: "12px", fontStyle: "italic" }}
              >
                Click to request data for this workstream
              </Text>
            );
          }
        } else {
          // We don't know if this workstream has children yet (hasChildren is null/undefined)
          return (
            <Text
              type="secondary"
              style={{ fontSize: "12px", fontStyle: "italic" }}
            >
              Click to request data for this workstream
            </Text>
          );
        }
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
              Uses Jira field 'timespent' (Tempo Logged) (in seconds), converted
              to days: (timespent / 3600 / 7.5).
            </div>
            <div>
              Shows aggregated value: ticket's own value + sum of all children's
              time spent recursively.
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
      // Show aggregated values if available (either for workstreams or items)
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
            <div>Calculated as: (Time Spent / Original Estimate) × 100%.</div>
            <div>
              Uses aggregated values (ticket's own value + all children's
              values) when available.
            </div>
            <div>
              Shows the percentage of time actually logged against the original
              budget estimate.
            </div>
          </div>
        }
      >
        <span style={{ cursor: "help" }}>Usage %</span>
      </Tooltip>
    ),
    key: "percentageBooked",
    onCell: (record: JiraIssueWithAggregated) =>
      getWorkstreamDataCellSpan(record, false),
    render: (_, record: JiraIssueWithAggregated) => {
      // Show aggregated values if available (either for workstreams or items)
      const originalEstimate =
        record.aggregatedOriginalEstimate !== undefined
          ? record.aggregatedOriginalEstimate
          : record.originalEstimate || 0;
      const timeSpent =
        record.aggregatedTimeSpent !== undefined
          ? record.aggregatedTimeSpent
          : record.timeSpent || 0;

      // Only show percentage if we have an original estimate
      if (originalEstimate > 0) {
        const percentageBooked = (timeSpent / originalEstimate) * 100;
        const color =
          percentageBooked > 100
            ? "red"
            : percentageBooked > 75
              ? "orange"
              : percentageBooked > 50
                ? "blue"
                : "green";
        return (
          <Text>
            <Tag color={color}>
              {percentageBooked.toFixed(1)}%
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
      const aTimeSpent =
        a.aggregatedTimeSpent !== undefined
          ? a.aggregatedTimeSpent
          : a.timeSpent || 0;
      const aPercentage =
        aOriginalEstimate > 0 ? (aTimeSpent / aOriginalEstimate) * 100 : 0;

      const bOriginalEstimate =
        b.aggregatedOriginalEstimate !== undefined
          ? b.aggregatedOriginalEstimate
          : b.originalEstimate || 0;
      const bTimeSpent =
        b.aggregatedTimeSpent !== undefined
          ? b.aggregatedTimeSpent
          : b.timeSpent || 0;
      const bPercentage =
        bOriginalEstimate > 0 ? (bTimeSpent / bOriginalEstimate) * 100 : 0;

      return aPercentage - bPercentage;
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
              Shows aggregated value: ticket's own value + sum of all children's
              remaining estimates recursively.
            </div>
            <div>
              NOTE: This is not the estimate minus the days booked. If no Time
              Remaining value is set, it will be blank.
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
      // Show aggregated values if available (either for workstreams or items)
      const hasAggregatedData = record.aggregatedTimeRemaining !== undefined;
      const valueToShow = hasAggregatedData
        ? record.aggregatedTimeRemaining
        : timeRemaining;

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
              Shows the projected total time for the work item when completed.
            </div>
          </div>
        }
      >
        <span style={{ cursor: "help" }}>Total Forecast (Actual + ETC)</span>
      </Tooltip>
    ),
    key: "totalForecast",
    onCell: (record: JiraIssueWithAggregated) =>
      getWorkstreamDataCellSpan(record, false),
    render: (_, record: JiraIssueWithAggregated) => {
      // Show aggregated values if available (either for workstreams or items)
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
              Calculated as: (Total Forecast - Original Estimate) = (Time Spent
              + ETC - Original Estimate).
            </div>
            <div>
              Uses aggregated values (ticket's own value + all children's
              values).
            </div>
            <div>
              Positive values indicate over-estimation, negative values indicate
              under-estimation.
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
      // Show aggregated values if available (either for workstreams or items)
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

      // Only show variance if we have both estimate and forecast
      if (originalEstimate > 0 || totalForecast > 0) {
        const color = variance > 0 ? "red" : variance < 0 ? "green" : "default";
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
              Calculated as: ((Total Forecast - Original Estimate) / Original
              Estimate) × 100% = ((Time Spent + ETC - Original Estimate) /
              Original Estimate) × 100%.
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
      // Show aggregated values if available (either for workstreams or items)
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

      // Only show variance percentage if we have an original estimate
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
  },
];
