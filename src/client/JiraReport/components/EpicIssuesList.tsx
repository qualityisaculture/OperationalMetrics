import React from "react";
import { JiraIssueWithAggregated } from "../types";
import { Typography, List, Progress } from "antd";

interface Props {
  epicIssues: JiraIssueWithAggregated[];
}

interface LegendItem {
  color: string;
  label: string;
}

export const EpicIssuesList: React.FC<Props> = ({ epicIssues }) => {
  // Function to count issues by status in epic children
  const getEpicIssueCounts = (epic: JiraIssueWithAggregated) => {
    let todoCount = 0;
    let inProgressCount = 0;
    let doneCount = 0;

    const countIssuesRecursively = (issues: JiraIssueWithAggregated[]) => {
      issues.forEach((issue) => {
        const status = issue.status.toLowerCase();

        if (status === "todo" || status === "to do") {
          todoCount++;
        } else if (
          status === "resolved" ||
          status === "closed" ||
          status === "done"
        ) {
          doneCount++;
        } else {
          // Everything else is considered "In Progress"
          inProgressCount++;
        }

        // Recursively count children
        if (issue.children && issue.children.length > 0) {
          countIssuesRecursively(issue.children);
        }
      });
    };

    if (epic.children && epic.children.length > 0) {
      countIssuesRecursively(epic.children);
    }

    return { todoCount, inProgressCount, doneCount };
  };

  // Function to create legend items for visual representation
  const createLegendItems = (
    todoCount: number,
    inProgressCount: number,
    doneCount: number
  ): LegendItem[] => {
    const items: LegendItem[] = [];

    // Done issues (green) - shown first
    if (doneCount > 0) {
      items.push({
        color: "#52c41a", // green
        label: `${doneCount} Done`,
      });
    }

    // In Progress issues (blue) - shown second
    if (inProgressCount > 0) {
      items.push({
        color: "#1890ff", // blue
        label: `${inProgressCount} In Progress`,
      });
    }

    // Todo issues (grey) - shown last
    if (todoCount > 0) {
      items.push({
        color: "#d9d9d9", // grey
        label: `${todoCount} Todo`,
      });
    }

    return items;
  };

  if (epicIssues.length === 0) {
    return null;
  }

  // Sort epic issues by due date (earliest first, null dates last)
  // If due date is not available, fall back to epicStartDate (start date)
  const sortedEpicIssues = [...epicIssues].sort((a, b) => {
    const aDate = a.dueDate || a.epicStartDate;
    const bDate = b.dueDate || b.epicStartDate;

    if (!aDate && !bDate) return 0;
    if (!aDate) return 1; // null dates go to end
    if (!bDate) return -1; // null dates go to end
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  return (
    <div style={{ marginTop: "24px" }}>
      <Typography.Title level={4}>Epic Issues In Progress</Typography.Title>
      <List
        size="small"
        dataSource={sortedEpicIssues}
        renderItem={(issue) => {
          const { todoCount, inProgressCount, doneCount } =
            getEpicIssueCounts(issue);
          const total = todoCount + inProgressCount + doneCount;
          const legendItems = createLegendItems(
            todoCount,
            inProgressCount,
            doneCount
          );

          return (
            <List.Item>
              <div style={{ width: "100%" }}>
                <div style={{ marginBottom: "8px" }}>
                  <Typography.Text strong>
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                    >
                      {issue.key}
                    </a>
                  </Typography.Text>
                  <Typography.Text style={{ marginLeft: "8px" }}>
                    {issue.summary}
                  </Typography.Text>
                  {issue.dueDate && (
                    <Typography.Text
                      type="secondary"
                      style={{ marginLeft: "16px", fontSize: "12px" }}
                    >
                      Due: {new Date(issue.dueDate).toLocaleDateString()}
                    </Typography.Text>
                  )}
                  {issue.epicStartDate && (
                    <Typography.Text
                      type="secondary"
                      style={{ marginLeft: "16px", fontSize: "12px" }}
                    >
                      Start:{" "}
                      {new Date(issue.epicStartDate).toLocaleDateString()}
                    </Typography.Text>
                  )}
                  {issue.epicEndDate && (
                    <Typography.Text
                      type="secondary"
                      style={{ marginLeft: "16px", fontSize: "12px" }}
                    >
                      End: {new Date(issue.epicEndDate).toLocaleDateString()}
                    </Typography.Text>
                  )}
                </div>

                {total > 0 && (
                  <div style={{ marginBottom: "4px" }}>
                    <Progress
                      percent={Number(
                        (((doneCount + inProgressCount) / total) * 100).toFixed(
                          0
                        )
                      )}
                      steps={total}
                      strokeColor={[
                        ...Array(doneCount).fill("#52c41a"), // green for done
                        ...Array(inProgressCount).fill("#1890ff"), // blue for in progress
                        ...Array(todoCount).fill("#d9d9d9"), // grey for todo
                      ]}
                      style={{ height: "8px" }}
                    />
                  </div>
                )}

                {/* Timeline bar showing progress through epic dates */}
                {issue.epicStartDate && issue.epicEndDate && (
                  <div style={{ marginBottom: "4px" }}>
                    <Progress
                      percent={(() => {
                        const startDate = new Date(issue.epicStartDate);
                        const endDate = new Date(issue.epicEndDate);
                        const currentDate = new Date();

                        // Calculate total duration
                        const totalDuration =
                          endDate.getTime() - startDate.getTime();

                        // Calculate elapsed time
                        const elapsedTime =
                          currentDate.getTime() - startDate.getTime();

                        // Calculate percentage (clamp between 0 and 100)
                        const percentage = Math.min(
                          Math.max((elapsedTime / totalDuration) * 100, 0),
                          100
                        );

                        return Number(percentage.toFixed(0));
                      })()}
                      steps={total}
                      strokeColor={(() => {
                        const startDate = new Date(issue.epicStartDate);
                        const endDate = new Date(issue.epicEndDate);
                        const currentDate = new Date();

                        // Calculate total duration
                        const totalDuration =
                          endDate.getTime() - startDate.getTime();

                        // Calculate elapsed time
                        const elapsedTime =
                          currentDate.getTime() - startDate.getTime();

                        // Calculate how many steps should be filled
                        const percentage = Math.min(
                          Math.max((elapsedTime / totalDuration) * 100, 0),
                          100
                        );

                        const filledSteps = Math.floor(
                          (percentage / 100) * total
                        );

                        return [
                          ...Array(filledSteps).fill("#fa8c16"), // orange for filled timeline steps
                          ...Array(total - filledSteps).fill("#f0f0f0"), // light gray for unfilled steps
                        ];
                      })()}
                      style={{ height: "8px" }}
                      showInfo={false}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: "16px", fontSize: "12px" }}>
                  {legendItems.map((item, index) => (
                    <div
                      key={index}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: item.color,
                          borderRadius: "2px",
                          marginRight: "4px",
                        }}
                      />
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: "12px" }}
                      >
                        {item.label}
                      </Typography.Text>
                    </div>
                  ))}
                  {issue.epicStartDate && issue.epicEndDate && (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          backgroundColor: "#fa8c16",
                          borderRadius: "2px",
                          marginRight: "4px",
                        }}
                      />
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: "12px" }}
                      >
                        Timeline
                      </Typography.Text>
                    </div>
                  )}
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: "12px" }}
                  >
                    Total: {total}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
