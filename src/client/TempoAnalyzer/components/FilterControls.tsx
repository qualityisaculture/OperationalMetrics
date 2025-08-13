import React from "react";
import { Radio, Checkbox, DatePicker, Space, Typography } from "antd";
import { BarChartOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface FilterControlsProps {
  summaryViewMode: "category" | "name";
  handleSummaryViewModeChange: (mode: "category" | "name") => void;
  excludeHolidayAbsence: boolean;
  handleExcludeHolidayAbsenceChange: (checked: boolean) => void;
  excludeAfterDate: Date | null;
  handleExcludeAfterDateChange: (date: any) => void;
  hasGroupedData: boolean;
  hasGroupedByName: boolean;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  summaryViewMode,
  handleSummaryViewModeChange,
  excludeHolidayAbsence,
  handleExcludeHolidayAbsenceChange,
  excludeAfterDate,
  handleExcludeAfterDateChange,
  hasGroupedData,
  hasGroupedByName,
}) => {
  if (!hasGroupedData) {
    return null;
  }

  return (
    <div style={{ marginBottom: "16px" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Radio.Group
          value={summaryViewMode}
          onChange={(e) => handleSummaryViewModeChange(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="category">
            <BarChartOutlined style={{ marginRight: "4px" }} />
            Account Category
          </Radio.Button>
          {hasGroupedByName && (
            <Radio.Button value="name">
              <UserOutlined style={{ marginRight: "4px" }} />
              Full Name
            </Radio.Button>
          )}
        </Radio.Group>

        <div style={{ marginTop: "8px" }}>
          <Checkbox
            checked={excludeHolidayAbsence}
            onChange={(e) =>
              handleExcludeHolidayAbsenceChange(e.target.checked)
            }
          >
            Exclude Holiday & Absence data (ABS-56, ABS-58, ABS-57)
          </Checkbox>
          <br />
          <div>
            <Text strong>Exclude data after:</Text>
            <br />
            <DatePicker
              value={excludeAfterDate}
              onChange={handleExcludeAfterDateChange}
              placeholder="Select cutoff date"
              allowClear
              style={{ marginTop: "4px" }}
            />
            <Text type="secondary" style={{ marginLeft: "8px" }}>
              Any data from 00:00 on the day after the selected date will be
              excluded
            </Text>
          </div>
        </div>
      </Space>
    </div>
  );
};
