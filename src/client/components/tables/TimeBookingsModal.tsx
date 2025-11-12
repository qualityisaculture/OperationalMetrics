import React from "react";
import { Modal, List, Typography, Divider, Tag, Space } from "antd";
import { JiraIssueWithAggregated } from "../../JiraReport/types";

const { Text, Title } = Typography;

interface TimeEntry {
  date: string;
  timeSpent: number; // in days
  jiraKey?: string; // Optional: which issue this entry belongs to
}

interface TimeBookingsModalProps {
  visible: boolean;
  onClose: () => void;
  record: JiraIssueWithAggregated | null;
  filterDate: string; // The date used for filtering (YYYY-MM-DD)
}

export const TimeBookingsModal: React.FC<TimeBookingsModalProps> = ({
  visible,
  onClose,
  record,
  filterDate,
}) => {
  if (!record) return null;

  // Collect all time entries from the record
  const allTimeEntries: TimeEntry[] = [];

  // Helper to convert days to hours
  const daysToHours = (days: number): number => {
    return days * 7.5; // Assuming 7.5 hours per day
  };

  // Collect entries from timeDataByKey (for workstreams with children)
  if (record.timeDataByKey) {
    Object.entries(record.timeDataByKey).forEach(([jiraKey, timeDataArray]) => {
      if (Array.isArray(timeDataArray)) {
        timeDataArray.forEach((timeEntry) => {
          if (timeEntry && timeEntry.date && timeEntry.timeSpent) {
            allTimeEntries.push({
              date: timeEntry.date,
              timeSpent: timeEntry.timeSpent,
              jiraKey: jiraKey,
            });
          }
        });
      }
    });
  }
  // Or collect from timeBookings (for single issues)
  else if (record.timeBookings) {
    record.timeBookings.forEach((timeEntry) => {
      if (timeEntry && timeEntry.date && timeEntry.timeSpent) {
        allTimeEntries.push({
          date: timeEntry.date,
          timeSpent: timeEntry.timeSpent,
        });
      }
    });
  }

  // Sort all entries by date in reverse chronological order (newest first)
  const sortedEntries = [...allTimeEntries].sort((a, b) => {
    return b.date.localeCompare(a.date);
  });

  // Split into two sections: filtered (>= filterDate) and other (< filterDate)
  const filteredEntries = sortedEntries.filter(
    (entry) => entry.date >= filterDate
  );
  const otherEntries = sortedEntries.filter((entry) => entry.date < filterDate);

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format hours for display
  const formatHours = (days: number): string => {
    const hours = daysToHours(days);
    if (hours < 1) {
      return `${(hours * 60).toFixed(0)} min`;
    }
    return `${hours.toFixed(1)} hrs`;
  };

  return (
    <Modal
      title={
        <Space>
          <Text strong>Time Bookings</Text>
          <Tag color="blue">{record.key}</Tag>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.summary}
          </Text>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {/* Filtered Days Section */}
        {filteredEntries.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 12 }}>
              Days in Filter (since {formatDate(filterDate)})
            </Title>
            <List
              size="small"
              dataSource={filteredEntries}
              renderItem={(entry) => (
                <List.Item>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space>
                      <Text strong>{formatDate(entry.date)}</Text>
                      {entry.jiraKey && entry.jiraKey !== record.key && (
                        <Tag color="default" style={{ fontSize: "10px" }}>
                          {entry.jiraKey}
                        </Tag>
                      )}
                    </Space>
                    <Space>
                      <Tag color="blue">{formatHours(entry.timeSpent)}</Tag>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        ({entry.timeSpent.toFixed(2)} days)
                      </Text>
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
            <div style={{ marginTop: 8, textAlign: "right" }}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Total:{" "}
                <Text strong>
                  {formatHours(
                    filteredEntries.reduce(
                      (sum, entry) => sum + entry.timeSpent,
                      0
                    )
                  )}{" "}
                  (
                  {filteredEntries
                    .reduce((sum, entry) => sum + entry.timeSpent, 0)
                    .toFixed(2)}{" "}
                  days)
                </Text>
              </Text>
            </div>
          </div>
        )}

        {/* Divider between sections */}
        {filteredEntries.length > 0 && otherEntries.length > 0 && (
          <Divider style={{ margin: "16px 0" }} />
        )}

        {/* Other Days Section */}
        {otherEntries.length > 0 && (
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              All Other Days
            </Title>
            <List
              size="small"
              dataSource={otherEntries}
              renderItem={(entry) => (
                <List.Item>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space>
                      <Text strong>{formatDate(entry.date)}</Text>
                      {entry.jiraKey && entry.jiraKey !== record.key && (
                        <Tag color="default" style={{ fontSize: "10px" }}>
                          {entry.jiraKey}
                        </Tag>
                      )}
                    </Space>
                    <Space>
                      <Tag color="default">{formatHours(entry.timeSpent)}</Tag>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        ({entry.timeSpent.toFixed(2)} days)
                      </Text>
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
            <div style={{ marginTop: 8, textAlign: "right" }}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Total:{" "}
                <Text strong>
                  {formatHours(
                    otherEntries.reduce((sum, entry) => sum + entry.timeSpent, 0)
                  )}{" "}
                  (
                  {otherEntries
                    .reduce((sum, entry) => sum + entry.timeSpent, 0)
                    .toFixed(2)}{" "}
                  days)
                </Text>
              </Text>
            </div>
          </div>
        )}

        {/* No data message */}
        {filteredEntries.length === 0 && otherEntries.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Text type="secondary">No time booking data available</Text>
          </div>
        )}
      </div>
    </Modal>
  );
};

