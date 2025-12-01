import React, { useMemo, useState } from "react";
import {
  Table,
  Typography,
  Alert,
  Button,
  Space,
  Tag,
  Modal,
  Timeline,
  Select,
  Tooltip,
} from "antd";
import { Release, JiraWithStatusChanges, StatusChange } from "../types";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

interface Props {
  releases: Release[];
  isLoading: boolean;
  error: string | null;
  projectName: string;
  loadJiraKeysForRelease: (releaseName: string) => void;
  releaseJiraKeys: Map<string, string[]>;
  releaseJiraData: Map<string, JiraWithStatusChanges[]>;
  loadingJiraKeys: Set<string>;
  jiraKeysError: Map<string, string>;
}

export const ReleasesTable: React.FC<Props> = ({
  releases,
  isLoading,
  error,
  projectName,
  loadJiraKeysForRelease,
  releaseJiraKeys,
  releaseJiraData,
  loadingJiraKeys,
  jiraKeysError,
}) => {
  const [selectedJira, setSelectedJira] = useState<{
    key: string;
    statusChanges: StatusChange[];
  } | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [mainTableStatus, setMainTableStatus] = useState<string | null>(null);

  // Sort releases in reverse chronological order (newest first)
  const sortedReleases = useMemo(() => {
    return [...releases].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      // Reverse order: newest first (larger dates first)
      return dateB - dateA;
    });
  }, [releases]);

  const handleJiraClick = (jiraKey: string, releaseName: string) => {
    const jiraData = releaseJiraData.get(releaseName);
    if (jiraData) {
      const jira = jiraData.find((j) => j.key === jiraKey);
      if (jira && jira.statusChanges) {
        setSelectedJira({
          key: jiraKey,
          statusChanges: jira.statusChanges,
        });
        setModalVisible(true);
      }
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedJira(null);
  };

  const handleSeeDetails = (release: Release) => {
    setSelectedRelease(release);
    setDetailsModalVisible(true);
    // Set default status to first available status if any
    const jiraData = releaseJiraData.get(release.name);
    if (jiraData && jiraData.length > 0) {
      const allStatuses = new Set<string>();
      jiraData.forEach((jira) => {
        jira.statusChanges.forEach((change) => {
          allStatuses.add(change.status);
        });
      });
      const statusesArray = Array.from(allStatuses).sort();
      if (statusesArray.length > 0) {
        // If current selectedStatus is not in available statuses, or no status selected, use first available
        if (!selectedStatus || !statusesArray.includes(selectedStatus)) {
          setSelectedStatus(statusesArray[0]);
        }
      }
    }
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setSelectedRelease(null);
    setSelectedStatus(null);
  };

  const handleInfoClick = (jiraKey: string, releaseName: string) => {
    handleJiraClick(jiraKey, releaseName);
  };

  // Helper function to calculate work days between two dates
  // Returns negative value if date2 is before date1
  const getWorkDaysBetween = (date1: Date, date2: Date): number => {
    const timeDiff = date2.getTime() - date1.getTime();
    if (Math.abs(timeDiff) < 60 * 60 * 1000) {
      return 0;
    }

    // Swap dates if date2 is before date1 to calculate negative values
    const isNegative = timeDiff < 0;
    const startDate = new Date(isNegative ? date2 : date1);
    const endDate = new Date(isNegative ? date1 : date2);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    let workDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // Count Monday-Friday as work days
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return isNegative ? -workDays : workDays;
  };

  // Get all unique statuses for the selected release
  const getAvailableStatuses = (releaseName: string): string[] => {
    const jiraData = releaseJiraData.get(releaseName);
    if (!jiraData) return [];
    const allStatuses = new Set<string>();
    jiraData.forEach((jira) => {
      jira.statusChanges.forEach((change) => {
        allStatuses.add(change.status);
      });
    });
    return Array.from(allStatuses).sort();
  };

  // Get all unique statuses across all releases
  const getAllAvailableStatuses = (): string[] => {
    const allStatuses = new Set<string>();
    releaseJiraData.forEach((jiraData) => {
      jiraData.forEach((jira) => {
        jira.statusChanges.forEach((change) => {
          allStatuses.add(change.status);
        });
      });
    });
    return Array.from(allStatuses).sort();
  };

  // Calculate average days from status to delivery for a release
  const getAverageDaysFromStatusToDelivery = (
    release: Release,
    status: string | null
  ): number | null => {
    if (!status || !release.releaseDate) return null;

    const jiraData = releaseJiraData.get(release.name);
    if (!jiraData || jiraData.length === 0) return null;

    const releaseDate = new Date(release.releaseDate);
    const validDays: number[] = [];

    jiraData.forEach((jira) => {
      // Find first time entering the selected status
      const firstStatusEntry = jira.statusChanges.find(
        (change) => change.status === status
      );

      if (firstStatusEntry) {
        const firstStatusDate = new Date(firstStatusEntry.date);
        const workDays = getWorkDaysBetween(firstStatusDate, releaseDate);

        // Only include positive values and values <= 100
        if (workDays > 0 && workDays <= 100) {
          validDays.push(workDays);
        }
      }
    });

    if (validDays.length === 0) return null;
    const sum = validDays.reduce((acc, val) => acc + val, 0);
    return sum / validDays.length;
  };

  // Get table data for the details modal
  const getDetailsTableData = () => {
    if (!selectedRelease || !selectedStatus) return [];
    const jiraData = releaseJiraData.get(selectedRelease.name);
    if (!jiraData) return [];

    return jiraData.map((jira) => {
      // Find first time entering the selected status
      const firstStatusEntry = jira.statusChanges.find(
        (change) => change.status === selectedStatus
      );

      let timeFirstInStatus: string = "-";
      let daysFromStatusToDelivery: string = "-";
      let daysFromResolutionToDelivery: string = "-";

      if (firstStatusEntry) {
        const firstStatusDate = new Date(firstStatusEntry.date);
        timeFirstInStatus = firstStatusDate.toLocaleString();

        // Calculate days from status to delivery (release date)
        if (selectedRelease.releaseDate) {
          const releaseDate = new Date(selectedRelease.releaseDate);
          const workDays = getWorkDaysBetween(firstStatusDate, releaseDate);
          daysFromStatusToDelivery = workDays.toFixed(1);
        }
      }

      // Calculate days from resolution to delivery
      if (jira.resolutionDate && selectedRelease.releaseDate) {
        const resolutionDate = new Date(jira.resolutionDate);
        const releaseDate = new Date(selectedRelease.releaseDate);
        const workDays = getWorkDaysBetween(resolutionDate, releaseDate);
        daysFromResolutionToDelivery = workDays.toFixed(1);
      }

      return {
        key: jira.key,
        url: jira.url,
        type: jira.type,
        status: jira.status,
        resolutionDate: jira.resolutionDate,
        timeFirstInStatus,
        daysFromStatusToDelivery,
        daysFromResolutionToDelivery,
        statusChanges: jira.statusChanges,
      };
    });
  };
  const columns: ColumnsType<Release> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 300,
    },
    {
      title: "Release Date",
      dataIndex: "releaseDate",
      key: "releaseDate",
      width: 200,
      render: (date: string) => {
        if (!date) return "-";
        return new Date(date).toLocaleDateString();
      },
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_, record) => {
        if (record.archived) return <Text type="secondary">Archived</Text>;
        if (record.released) return <Text type="success">Released</Text>;
        return <Text>Unreleased</Text>;
      },
    },
    {
      title: (
        <Tooltip
          title={
            <div>
              <div>
                Average days from first entry into the selected status until
                release date.
              </div>
              <div>
                Only includes positive values (excludes negative and absent
                values).
              </div>
              <div>Values over 100 days are excluded from the calculation.</div>
            </div>
          }
        >
          <span style={{ cursor: "help" }}>
            Average Days from Status to Delivery
          </span>
        </Tooltip>
      ),
      key: "averageDaysFromStatusToDelivery",
      width: 250,
      sorter: (a: Release, b: Release) => {
        const aVal = getAverageDaysFromStatusToDelivery(a, mainTableStatus);
        const bVal = getAverageDaysFromStatusToDelivery(b, mainTableStatus);
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;
        return aVal - bVal;
      },
      render: (_, record) => {
        const average = getAverageDaysFromStatusToDelivery(
          record,
          mainTableStatus
        );
        if (average === null) return <Text type="secondary">-</Text>;
        return <Tag color="purple">{average.toFixed(1)} days</Tag>;
      },
    },
    {
      title: "Jiras",
      key: "jiras",
      width: 200,
      render: (_, record) => {
        const isLoading = loadingJiraKeys.has(record.name);
        const jiraKeys = releaseJiraKeys.get(record.name);
        const error = jiraKeysError.get(record.name);

        return (
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Button
              size="small"
              onClick={() => loadJiraKeysForRelease(record.name)}
              loading={isLoading}
              disabled={isLoading}
            >
              {jiraKeys ? "Refresh Jiras" : "Get Jiras"}
            </Button>
            {error && (
              <Text type="danger" style={{ fontSize: "12px" }}>
                {error}
              </Text>
            )}
            {jiraKeys && jiraKeys.length > 0 && (
              <Button
                size="small"
                type="primary"
                onClick={() => handleSeeDetails(record)}
              >
                See Details
              </Button>
            )}
            {jiraKeys && jiraKeys.length === 0 && (
              <Text type="secondary" style={{ fontSize: "12px" }}>
                No Jiras found
              </Text>
            )}
          </Space>
        );
      },
    },
  ];

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ marginTop: "16px" }}
      />
    );
  }

  if (!projectName) {
    return (
      <Alert
        message="No Project Selected"
        description="Please select a project from the list above to view its releases."
        type="info"
        showIcon
        style={{ marginTop: "16px" }}
      />
    );
  }

  const allStatuses = getAllAvailableStatuses();

  return (
    <div style={{ marginTop: "24px" }}>
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <div>
          <Text
            strong
            style={{ fontSize: "16px", marginBottom: "16px", display: "block" }}
          >
            Releases for {projectName}
          </Text>
          {allStatuses.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "8px" }}>
                Select Status for Average Calculation:
              </Text>
              <Select
                style={{ width: "100%", maxWidth: "400px" }}
                placeholder="Select a status to calculate average days"
                value={mainTableStatus}
                onChange={(value) => setMainTableStatus(value)}
                options={allStatuses.map((status) => ({
                  label: status,
                  value: status,
                }))}
              />
            </div>
          )}
        </div>
        <Table
          columns={columns}
          dataSource={sortedReleases}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} releases`,
          }}
        />
      </Space>
      {/* Status Changelog Modal */}
      <Modal
        title={
          selectedJira
            ? `Status Changelog: ${selectedJira.key}`
            : "Status Changelog"
        }
        open={modalVisible}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {selectedJira && selectedJira.statusChanges.length > 0 ? (
          <div>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: "16px" }}
            >
              {selectedJira.statusChanges.length} status change
              {selectedJira.statusChanges.length !== 1 ? "s" : ""} recorded
            </Text>
            <Timeline
              items={selectedJira.statusChanges.map((change, index) => {
                const date = new Date(change.date);
                const isLast = index === selectedJira.statusChanges.length - 1;
                return {
                  color: isLast ? "green" : "blue",
                  children: (
                    <div>
                      <Text strong>{change.status}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        {date.toLocaleString()}
                      </Text>
                    </div>
                  ),
                };
              })}
            />
          </div>
        ) : (
          <Text type="secondary">
            No status changes recorded for this Jira.
          </Text>
        )}
      </Modal>

      {/* Release Details Modal */}
      <Modal
        title={
          selectedRelease
            ? `Release Details: ${selectedRelease.name}`
            : "Release Details"
        }
        open={detailsModalVisible}
        onCancel={closeDetailsModal}
        footer={[
          <Button key="close" onClick={closeDetailsModal}>
            Close
          </Button>,
        ]}
        width={1000}
      >
        {selectedRelease && (
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div>
              <Text strong style={{ display: "block", marginBottom: "8px" }}>
                Select Status:
              </Text>
              <Select
                style={{ width: "100%", maxWidth: "400px" }}
                placeholder="Select a status"
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value)}
                options={getAvailableStatuses(selectedRelease.name).map(
                  (status) => ({
                    label: status,
                    value: status,
                  })
                )}
              />
            </div>

            {selectedStatus && (
              <Table
                columns={[
                  {
                    title: "Key",
                    dataIndex: "key",
                    key: "key",
                    width: 150,
                    sorter: (a: any, b: any) => a.key.localeCompare(b.key),
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
                  },
                  {
                    title: "Type",
                    dataIndex: "type",
                    key: "type",
                    width: 120,
                    sorter: (a: any, b: any) => a.type.localeCompare(b.type),
                    render: (type: string) => <Tag color="blue">{type}</Tag>,
                  },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    width: 120,
                    sorter: (a: any, b: any) =>
                      a.status.localeCompare(b.status),
                    render: (status: string) => (
                      <Tag color="green">{status}</Tag>
                    ),
                  },
                  {
                    title: "Resolution Date",
                    dataIndex: "resolutionDate",
                    key: "resolutionDate",
                    width: 180,
                    sorter: (a: any, b: any) => {
                      if (!a.resolutionDate && !b.resolutionDate) return 0;
                      if (!a.resolutionDate) return 1;
                      if (!b.resolutionDate) return -1;
                      return (
                        new Date(a.resolutionDate).getTime() -
                        new Date(b.resolutionDate).getTime()
                      );
                    },
                    render: (resolutionDate: string | null) => {
                      if (!resolutionDate)
                        return <Text type="secondary">-</Text>;
                      return new Date(resolutionDate).toLocaleString();
                    },
                  },
                  {
                    title: "Days from Resolution to Delivery",
                    dataIndex: "daysFromResolutionToDelivery",
                    key: "daysFromResolutionToDelivery",
                    width: 220,
                    sorter: (a: any, b: any) => {
                      const aVal =
                        a.daysFromResolutionToDelivery === "-"
                          ? -1
                          : parseFloat(a.daysFromResolutionToDelivery);
                      const bVal =
                        b.daysFromResolutionToDelivery === "-"
                          ? -1
                          : parseFloat(b.daysFromResolutionToDelivery);
                      return aVal - bVal;
                    },
                  },
                  {
                    title: "Time First in Status",
                    dataIndex: "timeFirstInStatus",
                    key: "timeFirstInStatus",
                    width: 200,
                    sorter: (a: any, b: any) => {
                      if (
                        a.timeFirstInStatus === "-" &&
                        b.timeFirstInStatus === "-"
                      )
                        return 0;
                      if (a.timeFirstInStatus === "-") return 1;
                      if (b.timeFirstInStatus === "-") return -1;
                      return (
                        new Date(a.timeFirstInStatus).getTime() -
                        new Date(b.timeFirstInStatus).getTime()
                      );
                    },
                  },
                  {
                    title: "Days from Status to Delivery",
                    dataIndex: "daysFromStatusToDelivery",
                    key: "daysFromStatusToDelivery",
                    width: 200,
                    sorter: (a: any, b: any) => {
                      const aVal =
                        a.daysFromStatusToDelivery === "-"
                          ? -1
                          : parseFloat(a.daysFromStatusToDelivery);
                      const bVal =
                        b.daysFromStatusToDelivery === "-"
                          ? -1
                          : parseFloat(b.daysFromStatusToDelivery);
                      return aVal - bVal;
                    },
                  },
                  {
                    title: "Info",
                    key: "info",
                    width: 100,
                    render: (_, record) => (
                      <Button
                        size="small"
                        onClick={() =>
                          handleInfoClick(record.key, selectedRelease.name)
                        }
                      >
                        Info
                      </Button>
                    ),
                  },
                ]}
                dataSource={getDetailsTableData()}
                rowKey="key"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};
