import { useState } from "react";
import { message } from "antd";
import * as XLSX from "xlsx";
import { SheetData } from "../types";

export const useExcelProcessor = () => {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  const handleMultipleFileUpload = (fileList: File[]) => {
    setIsLoading(true);

    let processedCount = 0;
    const totalFiles = fileList.length;
    let allNewSheets: SheetData[] = [];

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const newSheets: SheetData[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            if (sheetName !== "Worklogs") {
              return;
            }

            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            });

            if (jsonData.length === 0) {
              message.warning(
                `Sheet "Worklogs" in "${file.name}" appears to be empty`
              );
              return;
            }

            const headers = jsonData[0] as string[];
            const dataRows = jsonData.slice(1);

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

            newSheets.push({
              name: sheetName,
              data: tableData,
              headers,
              columns,
              fileName: file.name,
            });
          });

          if (newSheets.length === 0) {
            message.warning(`No "Worklogs" sheet found in "${file.name}"`);
          }

          allNewSheets = allNewSheets.concat(newSheets);
        } catch (error) {
          console.error("Error processing Excel file:", error);
          message.error(
            `Failed to process "${file.name}". Please check the file format.`
          );
        }

        processedCount++;
        if (processedCount === totalFiles) {
          setSheets((prevSheets) => [...prevSheets, ...allNewSheets]);
          setSelectedSheets(allNewSheets.map((s) => `${s.fileName}|${s.name}`));
          setIsLoading(false);
          message.success(
            `Successfully processed ${totalFiles} file(s). Found ${allNewSheets.length} Worklogs sheets.`
          );
        }
      };

      reader.onerror = () => {
        message.error(`Failed to read "${file.name}"`);
        processedCount++;
        if (processedCount === totalFiles) {
          setIsLoading(false);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = (file: File) => {
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const newSheets: SheetData[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          if (sheetName !== "Worklogs") {
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          if (jsonData.length === 0) {
            message.warning(
              `Sheet "Worklogs" in "${file.name}" appears to be empty`
            );
            return;
          }

          const headers = jsonData[0] as string[];
          const dataRows = jsonData.slice(1);

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

          newSheets.push({
            name: sheetName,
            data: tableData,
            headers: headers,
            columns: columns,
            fileName: file.name,
          });
        });

        if (newSheets.length === 0) {
          message.warning(`No "Worklogs" sheet found in "${file.name}"`);
          setIsLoading(false);
          return;
        }

        setSheets((prevSheets) => [...prevSheets, ...newSheets]);
        setSelectedSheets(newSheets.map((s) => `${s.fileName}|${s.name}`));
        message.success(
          `Successfully loaded Worklogs sheet from "${file.name}"`
        );
      } catch (error) {
        console.error("Error processing Excel file:", error);
        message.error(
          "Failed to process Excel file. Please check the file format."
        );
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      message.error("Failed to read the file");
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const removeSheet = (sheetName: string, fileName?: string) => {
    setSheets((prevSheets) => {
      if (fileName) {
        return prevSheets.filter(
          (sheet) => !(sheet.name === sheetName && sheet.fileName === fileName)
        );
      } else {
        return prevSheets.filter((sheet) => sheet.name !== sheetName);
      }
    });
  };

  return {
    sheets,
    setSheets,
    isLoading,
    handleFileUpload,
    handleMultipleFileUpload,
    removeSheet,
    selectedSheets,
    setSelectedSheets,
  };
};
