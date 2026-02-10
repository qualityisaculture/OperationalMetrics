import React, { useMemo } from "react";
import { Card, Table, Typography, Button, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { useResizableColumns } from "../../components/tables/useResizableColumns";

const { Text } = Typography;

interface PeopleSummaryProps {
  filteredData: any[];
  accountCategoryIndex: number;
  loggedHoursIndex: number;
  fullNameIndex: number;
  excludeHolidayAbsence: boolean;
}

interface PeopleSummaryRow {
  key: string;
  personName: string;
  chargeableDays: number;
  chargeablePercentage: number;
  nonChargeableDays: number;
  nonChargeablePercentage: number;
  otherDays: number;
  otherPercentage: number;
  totalDays: number;
}

export const PeopleSummary: React.FC<PeopleSummaryProps> = ({
  filteredData,
  accountCategoryIndex,
  loggedHoursIndex,
  fullNameIndex,
  excludeHolidayAbsence,
}) => {
  const summaryData = useMemo(() => {
    if (
      loggedHoursIndex === -1 ||
      accountCategoryIndex === -1 ||
      fullNameIndex === -1
    ) {
      return [];
    }

    // Group data by person (full name)
    const personData: { [personName: string]: any[] } = {};

    filteredData.forEach((row) => {
      const personName = row[fullNameIndex.toString()];
      const name = personName ? String(personName).trim() : "Unknown";
      if (!personData[name]) {
        personData[name] = [];
      }
      personData[name].push(row);
    });

    const summaryRows: PeopleSummaryRow[] = [];

    Object.entries(personData).forEach(([personName, rows]) => {
      let totalHours = 0;
      let chargeableHours = 0;
      let nonChargeableHours = 0;
      let otherHours = 0;

      rows.forEach((row) => {
        const accountCategory = row[accountCategoryIndex.toString()];
        const loggedHours =
          parseFloat(row[loggedHoursIndex.toString()]) || 0;

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

      const chargeableDays = chargeableHours / 7.5;
      const nonChargeableDays = nonChargeableHours / 7.5;
      const otherDays = otherHours / 7.5;
      const totalDays = totalHours / 7.5;

      summaryRows.push({
        key: personName,
        personName,
        chargeableDays,
        chargeablePercentage,
        nonChargeableDays,
        nonChargeablePercentage,
        otherDays,
        otherPercentage,
        totalDays,
      });
    });

    return summaryRows.sort((a, b) => b.totalDays - a.totalDays);
  }, [
    filteredData,
    accountCategoryIndex,
    loggedHoursIndex,
    fullNameIndex,
  ]);

  const columns = useMemo(
    () => [
      {
        title: "Person",
        dataIndex: "personName",
        key: "personName",
        render: (text: string) => <Text strong>{text}</Text>,
        sorter: (a: PeopleSummaryRow, b: PeopleSummaryRow) =>
          a.personName.localeCompare(b.personName),
      },
      {
        title: "Chargeable",
        dataIndex: "chargeablePercentage",
        key: "chargeablePercentage",
        render: (percentage: number, record: PeopleSummaryRow) => (
          <div>
            <Text>{percentage.toFixed(1)}%</Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.chargeableDays.toFixed(1)}d
            </Text>
          </div>
        ),
        sorter: (a: PeopleSummaryRow, b: PeopleSummaryRow) =>
          a.chargeablePercentage - b.chargeablePercentage,
      },
      {
        title: "Non-Chargeable",
        dataIndex: "nonChargeablePercentage",
        key: "nonChargeablePercentage",
        render: (percentage: number, record: PeopleSummaryRow) => (
          <div>
            <Text>{percentage.toFixed(1)}%</Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.nonChargeableDays.toFixed(1)}d
            </Text>
          </div>
        ),
        sorter: (a: PeopleSummaryRow, b: PeopleSummaryRow) =>
          a.nonChargeablePercentage - b.nonChargeablePercentage,
      },
      {
        title: "Other",
        dataIndex: "otherPercentage",
        key: "otherPercentage",
        render: (percentage: number, record: PeopleSummaryRow) => (
          <div>
            <Text>{percentage.toFixed(1)}%</Text>
            <br />
            <Text type="secondary" style={{ fontSize: "12px" }}>
              {record.otherDays.toFixed(1)}d
            </Text>
          </div>
        ),
        sorter: (a: PeopleSummaryRow, b: PeopleSummaryRow) =>
          a.otherPercentage - b.otherPercentage,
      },
      {
        title: "Total Days",
        dataIndex: "totalDays",
        key: "totalDays",
        render: (days: number) => <Text strong>{days.toFixed(1)}d</Text>,
        sorter: (a: PeopleSummaryRow, b: PeopleSummaryRow) =>
          a.totalDays - b.totalDays,
      },
    ],
    []
  );

  const { getResizableColumns } = useResizableColumns(columns);
  const resizableColumns = getResizableColumns(columns);

  const handleExport = () => {
    if (summaryData.length === 0) {
      message.warning("No data to export");
      return;
    }

    try {
      const exportData = summaryData.map((row) => ({
        Person: row.personName,
        "Chargeable (%)": row.chargeablePercentage.toFixed(1),
        "Chargeable (days)": row.chargeableDays.toFixed(1),
        "Non-Chargeable (%)": row.nonChargeablePercentage.toFixed(1),
        "Non-Chargeable (days)": row.nonChargeableDays.toFixed(1),
        "Other (%)": row.otherPercentage.toFixed(1),
        "Other (days)": row.otherDays.toFixed(1),
        "Total Days": row.totalDays.toFixed(1),
      }));

      const grandTotal = summaryData.reduce(
        (sum, row) => sum + row.totalDays,
        0
      );
      const totalChargeable = summaryData.reduce(
        (sum, row) => sum + row.chargeableDays,
        0
      );
      const totalNonChargeable = summaryData.reduce(
        (sum, row) => sum + row.nonChargeableDays,
        0
      );
      const totalOther = summaryData.reduce(
        (sum, row) => sum + row.otherDays,
        0
      );
      const chargeablePercentage =
        grandTotal > 0 ? (totalChargeable / grandTotal) * 100 : 0;
      const nonChargeablePercentage =
        grandTotal > 0 ? (totalNonChargeable / grandTotal) * 100 : 0;
      const otherPercentage =
        grandTotal > 0 ? (totalOther / grandTotal) * 100 : 0;

      exportData.push({
        Person: "Total",
        "Chargeable (%)": chargeablePercentage.toFixed(1),
        "Chargeable (days)": totalChargeable.toFixed(1),
        "Non-Chargeable (%)": nonChargeablePercentage.toFixed(1),
        "Non-Chargeable (days)": totalNonChargeable.toFixed(1),
        "Other (%)": otherPercentage.toFixed(1),
        "Other (days)": totalOther.toFixed(1),
        "Total Days": grandTotal.toFixed(1),
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "People Summary");

      const holidayStatus = excludeHolidayAbsence
        ? "ExcludingHoliday"
        : "IncludingHoliday";
      const filename = `People_Summary_${holidayStatus}.xlsx`;

      XLSX.writeFile(workbook, filename);
      message.success(`Exported ${summaryData.length} rows to ${filename}`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      message.error("Failed to export to Excel");
    }
  };

  if (summaryData.length === 0) {
    return null;
  }

  const title = `People Summary ${excludeHolidayAbsence ? "(EXCLUDING HOLIDAY)" : "(INCLUDING HOLIDAY)"}`;

  return (
    <Card
      title={title}
      extra={
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          Export to Excel
        </Button>
      }
      style={{ marginBottom: "20px" }}
    >
      <Table
        dataSource={summaryData}
        columns={resizableColumns}
        pagination={false}
        size="small"
        scroll={{ x: 600 }}
        components={{
          header: {
            cell: (props: any) => {
              const { onResize, width, ...restProps } = props;
              return (
                <th
                  {...restProps}
                  style={{
                    position: "relative",
                    cursor: "col-resize",
                    userSelect: "none",
                    width: width,
                  }}
                >
                  {restProps.children}
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: "4px",
                      cursor: "col-resize",
                      backgroundColor: "transparent",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startWidth = width;

                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX;
                        const newWidth = Math.max(50, startWidth + deltaX);
                        onResize({ width: newWidth });
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
                </th>
              );
            },
          },
        }}
        summary={(pageData) => {
          const grandTotal = pageData.reduce(
            (sum, row) => sum + row.totalDays,
            0
          );
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
