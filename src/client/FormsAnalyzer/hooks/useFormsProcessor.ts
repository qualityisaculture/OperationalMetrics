import { useState } from "react";
import { message } from "antd";
import * as XLSX from "xlsx";
import { FormsData } from "../types";

export const useFormsProcessor = () => {
  const [formsData, setFormsData] = useState<FormsData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const handleFileUpload = (file: File) => {
    console.log("handleFileUpload called with file:", file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log("FileReader onload triggered");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        console.log("Workbook read successfully, sheets:", workbook.SheetNames);

        const newFormsData: FormsData[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          console.log("Processing sheet:", sheetName);
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          });

          console.log("Sheet data length:", jsonData.length);

          if (jsonData.length === 0) {
            message.warning(
              `Sheet "${sheetName}" in "${file.name}" appears to be empty`
            );
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);
          console.log("Headers:", headers);
          console.log("Data rows count:", dataRows.length);

          // Microsoft Forms typically have metadata in first 5 columns
          const metadataColumns = headers.slice(0, 5);
          const questionColumns = headers.slice(5);

          const columns = headers.map((header, index) => ({
            title: header || `Column ${index + 1}`,
            dataIndex: index.toString(),
            key: index.toString(),
            render: (text: any) => {
              if (text === null || text === undefined) return "-";
              if (typeof text === "object") return JSON.stringify(text);
              return String(text);
            },
          }));

          const tableData = dataRows.map((row, rowIndex) => {
            const rowData: any = { key: rowIndex };
            headers.forEach((_, colIndex) => {
              rowData[colIndex.toString()] = (row as any[])[colIndex];
            });
            return rowData;
          });

          const sheetData: FormsData = {
            name: sheetName,
            data: tableData,
            headers,
            columns,
            fileName: file.name,
            metadataColumns,
            questionColumns,
          };

          console.log("Created sheet data:", sheetData);
          newFormsData.push(sheetData);
        });

        console.log("Total new forms data:", newFormsData);

        if (newFormsData.length === 0) {
          message.warning(`No valid sheets found in "${file.name}"`);
        } else {
          console.log("Setting forms data, current length:", formsData.length);
          setFormsData((prevData) => {
            const newData = [...prevData, ...newFormsData];
            console.log("New forms data state:", newData);
            return newData;
          });
          setSelectedSheets(newFormsData.map((s) => `${s.fileName}|${s.name}`));
          message.success(
            `Successfully processed "${file.name}". Found ${newFormsData.length} sheet(s).`
          );
        }
      } catch (error) {
        console.error("Error processing Excel file:", error);
        message.error(
          `Failed to process "${file.name}". Please check the file format.`
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      console.error("FileReader error");
      message.error(`Failed to read "${file.name}"`);
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const removeSheet = (sheetKey: string) => {
    setFormsData((prevData) =>
      prevData.filter((sheet) => `${sheet.fileName}|${sheet.name}` !== sheetKey)
    );
    setSelectedSheets((prev) => prev.filter((key) => key !== sheetKey));
  };

  console.log("useFormsProcessor hook - formsData state:", formsData);

  return {
    formsData,
    isLoading,
    handleFileUpload,
    selectedSheets,
    setSelectedSheets,
    removeSheet,
  };
};
