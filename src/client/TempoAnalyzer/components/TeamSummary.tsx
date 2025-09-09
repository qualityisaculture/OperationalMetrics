import React from "react";
import { Card, Table, Typography } from "antd";
import { SheetData } from "../types";

const { Text } = Typography;

interface TeamSummaryProps {
  sheets: SheetData[];
  selectedSheets: string[];
  filteredData: any[];
  accountCategoryIndex: number;
  loggedHoursIndex: number;
  excludeHolidayAbsence: boolean;
}

interface TeamSummaryRow {
  key: string;
  fileName: string;
  chargeableDays: number;
  chargeablePercentage: number;
  nonChargeableDays: number;
  nonChargeablePercentage: number;
  otherDays: number;
  otherPercentage: number;
  totalDays: number;
}

export const TeamSummary: React.FC<TeamSummaryProps> = ({
  sheets,
  selectedSheets,
  filteredData,
  accountCategoryIndex,
  loggedHoursIndex,
  excludeHolidayAbsence,
}) => {
  // Calculate summary data for each file
  const calculateTeamSummary = (): TeamSummaryRow[] => {
    if (accountCategoryIndex === -1 || loggedHoursIndex === -1) {
      return [];
    }

    // Group data by file name
    const fileData: { [fileName: string]: any[] } = {};

    filteredData.forEach((row) => {
      const fileName = (row as any)._fileName;
      if (fileName) {
        if (!fileData[fileName]) {
          fileData[fileName] = [];
        }
        fileData[fileName].push(row);
      }
    });

    // Calculate summary for each file
    const summaryRows: TeamSummaryRow[] = [];

    Object.entries(fileData).forEach(([fileName, rows]) => {
      let chargeableHours = 0;
      let nonChargeableHours = 0;
      let otherHours = 0;
      let totalHours = 0;

      rows.forEach((row) => {
        const accountCategory = row[accountCategoryIndex.toString()];
        const loggedHours = parseFloat(row[loggedHoursIndex.toString()]) || 0;

        totalHours += loggedHours;

        if (accountCategory) {
          const category = String(accountCategory).trim();

          if (category === "Chargeable") {
            chargeableHours += loggedHours;
          } else if (
            category === "Non-Chargeable" ||
            category === "Non Chargeable"
          ) {
            nonChargeableHours += loggedHours;
          } else {
            otherHours += loggedHours;
          }
        } else {
          otherHours += loggedHours;
        }
      });

      const chargeablePercentage =
        totalHours > 0 ? (chargeableHours / totalHours) * 100 : 0;
      const nonChargeablePercentage =
        totalHours > 0 ? (nonChargeableHours / totalHours) * 100 : 0;
      const otherPercentage =
        totalHours > 0 ? (otherHours / totalHours) * 100 : 0;

      // Convert hours to days (7.5 hours per day)
      const chargeableDays = chargeableHours / 7.5;
      const nonChargeableDays = nonChargeableHours / 7.5;
      const otherDays = otherHours / 7.5;
      const totalDays = totalHours / 7.5;

      summaryRows.push({
        key: fileName,
        fileName,
        chargeableDays,
        chargeablePercentage,
        nonChargeableDays,
        nonChargeablePercentage,
        otherDays,
        otherPercentage,
        totalDays,
      });
    });

    // Sort by total days (descending)
    return summaryRows.sort((a, b) => b.totalDays - a.totalDays);
  };

  const summaryData = calculateTeamSummary();

  const columns = [
    {
      title: "File Name",
      dataIndex: "fileName",
      key: "fileName",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Chargeable",
      dataIndex: "chargeablePercentage",
      key: "chargeablePercentage",
      render: (percentage: number, record: TeamSummaryRow) => (
        <div>
          <Text>{percentage.toFixed(1)}%</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.chargeableDays.toFixed(1)}d
          </Text>
        </div>
      ),
      sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
        a.chargeablePercentage - b.chargeablePercentage,
    },
    {
      title: "Non-Chargeable",
      dataIndex: "nonChargeablePercentage",
      key: "nonChargeablePercentage",
      render: (percentage: number, record: TeamSummaryRow) => (
        <div>
          <Text>{percentage.toFixed(1)}%</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.nonChargeableDays.toFixed(1)}d
          </Text>
        </div>
      ),
      sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
        a.nonChargeablePercentage - b.nonChargeablePercentage,
    },
    {
      title: "Other",
      dataIndex: "otherPercentage",
      key: "otherPercentage",
      render: (percentage: number, record: TeamSummaryRow) => (
        <div>
          <Text>{percentage.toFixed(1)}%</Text>
          <br />
          <Text type="secondary" style={{ fontSize: "12px" }}>
            {record.otherDays.toFixed(1)}d
          </Text>
        </div>
      ),
      sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
        a.otherPercentage - b.otherPercentage,
    },
    {
      title: "Total Days",
      dataIndex: "totalDays",
      key: "totalDays",
      render: (days: number) => <Text strong>{days.toFixed(1)}d</Text>,
      sorter: (a: TeamSummaryRow, b: TeamSummaryRow) =>
        a.totalDays - b.totalDays,
    },
  ];

  if (summaryData.length === 0) {
    return null;
  }

  const title = `Team Summary ${excludeHolidayAbsence ? "(EXCLUDING HOLIDAY)" : "(INCLUDING HOLIDAY)"}`;

  return (
    <Card title={title} style={{ marginBottom: "20px" }}>
      <Table
        dataSource={summaryData}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
        summary={(pageData) => {
          const totalChargeable = pageData.reduce(
            (sum, row) => sum + row.chargeableDays,
            0
          );
          const totalNonChargeable = pageData.reduce(
            (sum, row) => sum + row.nonChargeableDays,
            0
          );
          const totalOther = pageData.reduce(
            (sum, row) => sum + row.otherDays,
            0
          );
          const grandTotal = pageData.reduce(
            (sum, row) => sum + row.totalDays,
            0
          );

          const chargeablePercentage =
            grandTotal > 0 ? (totalChargeable / grandTotal) * 100 : 0;
          const nonChargeablePercentage =
            grandTotal > 0 ? (totalNonChargeable / grandTotal) * 100 : 0;
          const otherPercentage =
            grandTotal > 0 ? (totalOther / grandTotal) * 100 : 0;

          return (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <div>
                  <Text strong>{chargeablePercentage.toFixed(1)}%</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {totalChargeable.toFixed(1)}d
                  </Text>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <div>
                  <Text strong>{nonChargeablePercentage.toFixed(1)}%</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {totalNonChargeable.toFixed(1)}d
                  </Text>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <div>
                  <Text strong>{otherPercentage.toFixed(1)}%</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {totalOther.toFixed(1)}d
                  </Text>
                </div>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Text strong>{grandTotal.toFixed(1)}d</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          );
        }}
      />
    </Card>
  );
};
