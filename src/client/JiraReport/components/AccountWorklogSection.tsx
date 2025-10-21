import React, { useState } from "react";
import {
  Card,
  Button,
  DatePicker,
  Select,
  Space,
  Typography,
  Alert,
  Table,
  Spin,
} from "antd";
import {
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { LoadingIndicator } from "../../components";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface WorklogData {
  issueKey: string;
  worklogId: string;
  author: string;
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  comment?: string | any;
}

interface WorklogSummary {
  totalWorklogs: number;
  totalTimeSpentSeconds: number;
  totalTimeSpentHours: number;
  uniqueIssues: number;
  uniqueAuthors: number;
  worklogs: WorklogData[];
}

interface MonthlySummary {
  month: string;
  year: number;
  monthNumber: number;
  totalWorklogs: number;
  totalTimeSpentHours: number;
  totalDays: number;
  uniqueIssues: number;
  uniqueAuthors: number;
}

interface Props {
  projectKey: string;
  projectName: string;
  accounts: string[];
}

export const AccountWorklogSection: React.FC<Props> = ({
  projectKey,
  projectName,
  accounts,
}) => {
  console.log(`AccountWorklogSection received accounts:`, accounts);

  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
  }>(() => {
    const now = dayjs();
    const sixMonthsAgo = now.subtract(6, "month");
    return {
      start: sixMonthsAgo,
      end: now,
    };
  });

  const fetchWorklogData = async (
    account: string,
    year: number,
    month: number
  ) => {
    console.log(
      `Fetching worklog data for account: ${account}, year: ${year}, month: ${month}, project: ${projectKey}`
    );

    try {
      const url = `/api/jiraReport/account/${encodeURIComponent(account)}/worklogs/${year}/${month}`;
      console.log(`Worklog API URL: ${url}`);

      const response = await fetch(url);
      console.log(`Worklog response status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`Raw worklog API response:`, result);

      const data = JSON.parse(result.data);
      console.log(`Parsed worklog data:`, data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Convert to monthly summary format
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

      const monthlySummary: MonthlySummary = {
        month: monthNames[month - 1],
        year: year,
        monthNumber: month,
        totalWorklogs: data.totalWorklogs,
        totalTimeSpentHours: data.totalTimeSpentHours,
        totalDays: Math.round((data.totalTimeSpentHours / 7.5) * 100) / 100,
        uniqueIssues: data.uniqueIssues,
        uniqueAuthors: data.uniqueAuthors,
      };

      // Add or update the monthly summary
      setMonthlySummaries((prev) => {
        const existing = prev.findIndex(
          (item) => item.year === year && item.monthNumber === month
        );

        if (existing >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existing] = monthlySummary;
          return updated;
        } else {
          // Add new entry
          return [...prev, monthlySummary].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.monthNumber - b.monthNumber;
          });
        }
      });
    } catch (err) {
      console.error("Error fetching worklog data:", err);
      throw err; // Re-throw to be handled by the calling function
    }
  };

  const handleDateRangeChange = (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  ) => {
    if (dates && dates[0] && dates[1]) {
      setSelectedDateRange({
        start: dates[0],
        end: dates[1],
      });
      // Clear existing data when date range changes
      setMonthlySummaries([]);
    }
  };

  const generateMonthsInRange = (start: dayjs.Dayjs, end: dayjs.Dayjs) => {
    const months = [];
    let current = start.startOf("month");
    const endMonth = end.endOf("month");

    while (current.isBefore(endMonth) || current.isSame(endMonth, "month")) {
      months.push({
        year: current.year(),
        month: current.month() + 1,
      });
      current = current.add(1, "month");
    }
    return months;
  };

  const handleAccountChange = (account: string) => {
    setSelectedAccount(account);
    // Clear existing data when account changes
    setMonthlySummaries([]);
  };

  const handleRefresh = async () => {
    if (!selectedAccount) {
      setError("Please select an account first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const monthsToFetch = generateMonthsInRange(
        selectedDateRange.start,
        selectedDateRange.end
      );
      console.log(
        `Fetching data for ${monthsToFetch.length} months:`,
        monthsToFetch
      );

      // Fetch data for all months in parallel
      const fetchPromises = monthsToFetch.map(({ year, month }) =>
        fetchWorklogData(selectedAccount, year, month)
      );

      await Promise.all(fetchPromises);
    } catch (err) {
      console.error("Error fetching worklog data for range:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch worklog data for range"
      );
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (month: string, record: MonthlySummary) => (
        <span>
          {month} {record.year}
        </span>
      ),
      sorter: (a: MonthlySummary, b: MonthlySummary) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthNumber - b.monthNumber;
      },
    },
    {
      title: "Worklogs",
      dataIndex: "totalWorklogs",
      key: "totalWorklogs",
      sorter: (a: MonthlySummary, b: MonthlySummary) =>
        a.totalWorklogs - b.totalWorklogs,
    },
    {
      title: "Hours",
      dataIndex: "totalTimeSpentHours",
      key: "totalTimeSpentHours",
      render: (hours: number) => hours.toFixed(1),
      sorter: (a: MonthlySummary, b: MonthlySummary) =>
        a.totalTimeSpentHours - b.totalTimeSpentHours,
    },
    {
      title: "Days",
      dataIndex: "totalDays",
      key: "totalDays",
      render: (days: number) => days.toFixed(1),
      sorter: (a: MonthlySummary, b: MonthlySummary) =>
        a.totalDays - b.totalDays,
    },
    {
      title: "Issues",
      dataIndex: "uniqueIssues",
      key: "uniqueIssues",
      sorter: (a: MonthlySummary, b: MonthlySummary) =>
        a.uniqueIssues - b.uniqueIssues,
    },
  ];

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Account Worklogs
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Select
            placeholder="Select Account"
            value={selectedAccount}
            onChange={handleAccountChange}
            style={{ minWidth: 200 }}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={accounts.map((account) => ({
              value: account,
              label: account,
            }))}
            prefix={<TeamOutlined />}
          />
          <RangePicker
            picker="month"
            value={[selectedDateRange.start, selectedDateRange.end]}
            onChange={handleDateRangeChange}
            format="YYYY-MM"
          />
          <Button
            icon={<CalendarOutlined />}
            onClick={handleRefresh}
            loading={loading}
            disabled={!selectedAccount}
          >
            Refresh
          </Button>
        </Space>
      }
      style={{ marginBottom: "16px" }}
    >
      {loading && (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>
            <Text>
              Loading worklog data for{" "}
              {selectedDateRange.start.format("YYYY-MM")} to{" "}
              {selectedDateRange.end.format("YYYY-MM")}...
            </Text>
          </div>
        </div>
      )}

      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: "16px" }}
          action={
            <Button size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && monthlySummaries.length === 0 && (
        <Alert
          message="Select an Account and Date Range to View Worklogs"
          description="Choose an account from the dropdown and a date range using the range picker above, then click 'Refresh' to load worklog data for that account and period range."
          type="info"
          showIcon
        />
      )}

      {monthlySummaries.length > 0 && !loading && (
        <Table
          dataSource={monthlySummaries}
          columns={tableColumns}
          rowKey={(record) => `${record.year}-${record.monthNumber}`}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} months`,
          }}
          scroll={{ x: 600 }}
        />
      )}
    </Card>
  );
};
