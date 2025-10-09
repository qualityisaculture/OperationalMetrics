import React, { useState } from "react";
import { Upload, Button, Table, message, Card, Modal, Tag } from "antd";
import { UploadOutlined, EyeOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";

interface WeWorkEntry {
  date: string;
  firstName: string;
  lastName: string;
  fullName: string;
  parsedDate?: Date; // For sorting and grouping
}

interface PersonSummary {
  fullName: string;
  firstName: string;
  lastName: string;
  uniqueDays: number;
  totalEntries: number;
  entries: WeWorkEntry[];
}

interface WeWorkProps {}

const WeWork: React.FC<WeWorkProps> = () => {
  const [rawData, setRawData] = useState<WeWorkEntry[]>([]);
  const [personSummaries, setPersonSummaries] = useState<PersonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);

  const processPersonSummaries = (data: WeWorkEntry[]) => {
    const personMap = new Map<string, PersonSummary>();

    data.forEach((entry) => {
      const key = entry.fullName;

      if (!personMap.has(key)) {
        personMap.set(key, {
          fullName: entry.fullName,
          firstName: entry.firstName,
          lastName: entry.lastName,
          uniqueDays: 0,
          totalEntries: 0,
          entries: [],
        });
      }

      const person = personMap.get(key)!;
      person.entries.push(entry);
      person.totalEntries++;
    });

    // Calculate unique days for each person
    personMap.forEach((person) => {
      const uniqueDates = new Set<string>();
      person.entries.forEach((entry) => {
        // Extract just the date part (without time) for unique day calculation
        const dateOnly = entry.date.split(",")[0]; // Get date part before comma
        uniqueDates.add(dateOnly);
      });
      person.uniqueDays = uniqueDates.size;
    });

    // Sort by unique days (descending) then by name
    const summaries = Array.from(personMap.values()).sort((a, b) => {
      if (b.uniqueDays !== a.uniqueDays) {
        return b.uniqueDays - a.uniqueDays;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    setPersonSummaries(summaries);
  };

  const parseExcelFile = (file: File) => {
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Process data starting from row 4 (index 3), columns B, C, E
        const processedData: WeWorkEntry[] = [];

        for (let i = 3; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];

          // Check if row has enough columns and data
          if (row && row.length >= 5 && row[1] && row[2] && row[4]) {
            const date = row[1]; // Column B
            const firstName = row[2]; // Column C
            const lastName = row[4]; // Column E

            // Only add if we have valid data
            if (date && firstName && lastName) {
              // Convert Excel date number to readable date
              let formattedDate = date.toString();
              if (typeof date === "number" && date > 25000) {
                // Likely an Excel date
                // Excel date conversion: Excel counts days since 1900-01-01
                // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
                const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
                const excelDate = new Date(
                  excelEpoch.getTime() + (date - 2) * 24 * 60 * 60 * 1000
                );
                formattedDate = excelDate.toLocaleString();
              }

              processedData.push({
                date: formattedDate,
                firstName: firstName.toString().trim(),
                lastName: lastName.toString().trim(),
                fullName: `${firstName.toString().trim()} ${lastName.toString().trim()}`,
              });
            }
          }
        }

        // If no data found with expected structure, try to find any rows with data
        if (processedData.length === 0) {
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length >= 3) {
              // Look for any row that has at least 3 columns with data
              const hasData = row
                .slice(0, 5)
                .some((cell) => cell && cell.toString().trim() !== "");
              if (hasData) {
                // Convert Excel date if needed
                let formattedDate = "No date";
                if (row[1]) {
                  const date = row[1];
                  if (typeof date === "number" && date > 25000) {
                    const excelEpoch = new Date(1900, 0, 1);
                    const excelDate = new Date(
                      excelEpoch.getTime() + (date - 2) * 24 * 60 * 60 * 1000
                    );
                    formattedDate = excelDate.toLocaleString();
                  } else {
                    formattedDate = date.toString();
                  }
                }

                processedData.push({
                  date: formattedDate,
                  firstName: row[2]
                    ? row[2].toString().trim()
                    : "No first name",
                  lastName: row[4] ? row[4].toString().trim() : "No last name",
                  fullName: `${row[2] ? row[2].toString().trim() : "No first name"} ${row[4] ? row[4].toString().trim() : "No last name"}`,
                });
              }
            }
          }
        }

        setRawData(processedData);
        processPersonSummaries(processedData);
        message.success(
          `Successfully loaded ${processedData.length} entries from spreadsheet`
        );
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        message.error(
          "Error parsing Excel file. Please check the file format."
        );
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (info: any) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      parseExcelFile(file);
    } else {
      message.error("No file found in upload");
    }
  };

  const showPersonDetails = (person: PersonSummary) => {
    setSelectedPerson(person);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPerson(null);
  };

  const exportToExcel = () => {
    if (personSummaries.length === 0) {
      message.warning("No data to export");
      return;
    }

    // Create headers
    const headers = ["First Name", "Surname", "Unique Days"];

    // Create data rows
    const rows = personSummaries.map((person) => [
      person.firstName,
      person.lastName,
      person.uniqueDays,
    ]);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WeWork Usage");

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
    const filename = `wework_usage_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
    message.success(
      `Exported ${personSummaries.length} records to ${filename}`
    );
  };

  const summaryColumns = [
    {
      title: "Name",
      dataIndex: "fullName",
      key: "fullName",
      width: 250,
    },
    {
      title: "Unique Days",
      dataIndex: "uniqueDays",
      key: "uniqueDays",
      width: 120,
      render: (days: number) => <Tag color="blue">{days}</Tag>,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.uniqueDays - b.uniqueDays,
    },
    {
      title: "Total Entries",
      dataIndex: "totalEntries",
      key: "totalEntries",
      width: 120,
      render: (entries: number) => <Tag color="green">{entries}</Tag>,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.totalEntries - b.totalEntries,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: PersonSummary) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showPersonDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "date",
      width: 200,
    },
    {
      title: "Time Only",
      key: "timeOnly",
      width: 100,
      render: (record: WeWorkEntry) => {
        const timePart =
          record.date.split(",")[1]?.trim() || record.date.split(" ")[1] || "";
        return timePart;
      },
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <Card title="WeWork Usage Analyzer" style={{ marginBottom: "20px" }}>
        <p>Upload a spreadsheet with WeWork usage data. The tool expects:</p>
        <ul>
          <li>Date in column B (format: "9/1/2025 6:51:51 AM")</li>
          <li>First name in column C</li>
          <li>Last name in column E</li>
          <li>Data starts from row 4</li>
        </ul>

        <Upload
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={() => false} // Prevent auto upload
          onChange={handleFileUpload}
        >
          <Button icon={<UploadOutlined />} loading={loading}>
            Upload Spreadsheet
          </Button>
        </Upload>
      </Card>

      {personSummaries.length > 0 && (
        <Card
          title={`Usage Summary (${personSummaries.length} people)`}
          style={{ marginBottom: "20px" }}
          extra={
            <Button
              type="primary"
              onClick={exportToExcel}
              icon={<UploadOutlined />}
            >
              Export to Excel
            </Button>
          }
        >
          <Table
            columns={summaryColumns}
            dataSource={personSummaries}
            rowKey="fullName"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 600 }}
            size="small"
          />
        </Card>
      )}

      {rawData.length === 0 && (
        <Card title="No Data Found">
          <p>
            No data was parsed from the uploaded file. Please upload a valid
            Excel file.
          </p>
        </Card>
      )}

      <Modal
        title={selectedPerson ? `Details for ${selectedPerson.fullName}` : ""}
        open={modalVisible}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedPerson && (
          <div>
            <p>
              <strong>Unique Days:</strong> {selectedPerson.uniqueDays} |
              <strong> Total Entries:</strong> {selectedPerson.totalEntries}
            </p>
            <Table
              columns={detailColumns}
              dataSource={selectedPerson.entries}
              rowKey={(record, index) => `${record.fullName}-${index}`}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WeWork;
