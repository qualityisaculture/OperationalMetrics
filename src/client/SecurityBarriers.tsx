import React, { useState } from "react";
import {
  Upload,
  Button,
  Table,
  message,
  Card,
  Modal,
  Tag,
  Collapse,
} from "antd";
import {
  UploadOutlined,
  EyeOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
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

interface HolidayEntry {
  firstName: string;
  lastName: string;
  daysOff: number;
}

interface HolidaySummary {
  fullName: string;
  firstName: string;
  lastName: string;
  totalHolidayDays: number;
}

interface CombinedUserData {
  fullName: string;
  firstName: string;
  lastName: string;
  barrierDays: number | string;
  holidayDays: number | string;
  weeklyHours: number | string;
  daysInOffice: number | string;
  difference: number | string;
  lineManager?: string;
}

interface UserListEntry {
  firstName: string;
  lastName: string;
  fullName: string;
  lineManager: string;
}

interface FlexibleRemoteEntry {
  fullName: string;
  firstName: string;
  lastName: string;
  timeInOffice: number | string;
}

interface FlexibleRemoteSummary {
  fullName: string;
  firstName: string;
  lastName: string;
  timeInOffice: number | string;
}

interface DailyAttendance {
  dayOfWeek: string;
  date: string;
  count: number;
}

interface WeeklyAttendanceSummary {
  dayOfWeek: string;
  totalCount: number;
}

interface WeWorkProps {}

const WeWork: React.FC<WeWorkProps> = () => {
  const [rawData, setRawData] = useState<WeWorkEntry[]>([]);
  const [personSummaries, setPersonSummaries] = useState<PersonSummary[]>([]);
  const [holidayData, setHolidayData] = useState<HolidayEntry[]>([]);
  const [holidaySummaries, setHolidaySummaries] = useState<HolidaySummary[]>(
    []
  );
  const [combinedData, setCombinedData] = useState<CombinedUserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userList, setUserList] = useState<UserListEntry[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [barrierFileUploaded, setBarrierFileUploaded] = useState(false);
  const [holidayFileUploaded, setHolidayFileUploaded] = useState(false);
  const [userListFileUploaded, setUserListFileUploaded] = useState(false);
  const [flexibleRemoteData, setFlexibleRemoteData] = useState<
    FlexibleRemoteEntry[]
  >([]);
  const [flexibleRemoteSummaries, setFlexibleRemoteSummaries] = useState<
    FlexibleRemoteSummary[]
  >([]);
  const [flexibleRemoteLoading, setFlexibleRemoteLoading] = useState(false);
  const [flexibleRemoteFileUploaded, setFlexibleRemoteFileUploaded] =
    useState(false);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendance[]>([]);
  const [weeklyAttendanceSummary, setWeeklyAttendanceSummary] = useState<
    WeeklyAttendanceSummary[]
  >([]);
  const [unmatchedBarrierUsers, setUnmatchedBarrierUsers] = useState<
    PersonSummary[]
  >([]);

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

  const calculateDailyAttendance = (data: WeWorkEntry[]) => {
    // Map to store unique people per day (day -> Set of fullNames)
    const dayMap = new Map<string, Set<string>>();

    data.forEach((entry) => {
      // Extract date part (before comma if it exists)
      let datePart = entry.date;
      if (entry.date.includes(",")) {
        datePart = entry.date.split(",")[0].trim();
      } else {
        datePart = entry.date.trim();
      }

      // Try to parse the date
      let date: Date | null = null;

      if (datePart) {
        // First try parsing as is (handles locale date strings like "1/15/2024")
        date = new Date(datePart);

        // If invalid, try parsing as Excel date number
        // if (isNaN(date.getTime())) {
        //   const dateNum = parseFloat(datePart);
        //   if (!isNaN(dateNum) && dateNum > 25000) {
        //     // Likely an Excel date
        //     const excelEpoch = new Date(1900, 0, 1);
        //     date = new Date(
        //       excelEpoch.getTime() + (dateNum - 2) * 24 * 60 * 60 * 1000
        //     );
        //   } else {
        // Try with different separators (DD/MM/YYYY format)
        const parts = datePart.split(/[\/\-]/);
        if (parts.length === 3) {
          // Try DD/MM/YYYY format
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          if (!isNaN(month) && !isNaN(day) && !isNaN(year) && year > 1900) {
            date = new Date(year, month, day);
          }
        }
        // }
        // }
      }

      if (date && !isNaN(date.getTime())) {
        const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, new Set());
        }

        dayMap.get(dayKey)!.add(entry.fullName);
      }
    });

    // Convert to array and sort by date
    const attendance: DailyAttendance[] = Array.from(dayMap.entries()).map(
      ([dayKey, people]) => {
        const [year, month, day] = dayKey.split("-");
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        return {
          dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          count: people.size,
        };
      }
    );

    // Sort by date
    attendance.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setDailyAttendance(attendance);

    // Calculate weekly summary (aggregate by day of week)
    const weeklyMap = new Map<string, number>();
    attendance.forEach((entry) => {
      const currentCount = weeklyMap.get(entry.dayOfWeek) || 0;
      weeklyMap.set(entry.dayOfWeek, currentCount + entry.count);
    });

    // Convert to array and sort by day of week order
    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const summary: WeeklyAttendanceSummary[] = Array.from(weeklyMap.entries())
      .map(([dayOfWeek, totalCount]) => ({
        dayOfWeek,
        totalCount,
      }))
      .sort((a, b) => {
        const indexA = daysOfWeek.indexOf(a.dayOfWeek);
        const indexB = daysOfWeek.indexOf(b.dayOfWeek);
        return indexA - indexB;
      });

    setWeeklyAttendanceSummary(summary);
  };

  const processHolidaySummaries = (data: HolidayEntry[]) => {
    const holidayMap = new Map<string, HolidaySummary>();

    data.forEach((entry) => {
      const key = `${entry.firstName} ${entry.lastName}`;

      if (!holidayMap.has(key)) {
        holidayMap.set(key, {
          fullName: key,
          firstName: entry.firstName,
          lastName: entry.lastName,
          totalHolidayDays: 0,
        });
      }

      const holiday = holidayMap.get(key)!;
      holiday.totalHolidayDays += entry.daysOff;
    });

    // Sort by total holiday days (descending) then by name
    const summaries = Array.from(holidayMap.values()).sort((a, b) => {
      if (b.totalHolidayDays !== a.totalHolidayDays) {
        return b.totalHolidayDays - a.totalHolidayDays;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    setHolidaySummaries(summaries);
  };

  const processFlexibleRemoteSummaries = (data: FlexibleRemoteEntry[]) => {
    const flexibleRemoteMap = new Map<string, FlexibleRemoteSummary>();

    data.forEach((entry) => {
      const key = `${entry.firstName} ${entry.lastName}`;

      if (!flexibleRemoteMap.has(key)) {
        flexibleRemoteMap.set(key, {
          fullName: key,
          firstName: entry.firstName,
          lastName: entry.lastName,
          timeInOffice: entry.timeInOffice,
        });
      } else {
        // If duplicate, use the latest entry
        const existing = flexibleRemoteMap.get(key)!;
        existing.timeInOffice = entry.timeInOffice;
      }
    });

    // Sort by name
    const summaries = Array.from(flexibleRemoteMap.values()).sort((a, b) => {
      return a.fullName.localeCompare(b.fullName);
    });

    setFlexibleRemoteSummaries(summaries);
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
        calculateDailyAttendance(processedData);
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

  const parseHolidayFile = (file: File) => {
    setHolidayLoading(true);

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

        // Process data - columns A (first name), B (last name), H (days off)
        const processedData: HolidayEntry[] = [];

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];

          // Check if row has enough columns and data
          if (row && row.length >= 8 && row[0] && row[1] && row[7]) {
            const firstName = row[0]; // Column A
            const lastName = row[1]; // Column B
            const daysOff = row[7]; // Column H

            // Only add if we have valid data
            if (
              firstName &&
              lastName &&
              daysOff !== undefined &&
              daysOff !== null
            ) {
              const daysOffNumber =
                typeof daysOff === "number"
                  ? daysOff
                  : parseFloat(daysOff.toString());

              if (!isNaN(daysOffNumber) && daysOffNumber > 0) {
                processedData.push({
                  firstName: firstName.toString().trim(),
                  lastName: lastName.toString().trim(),
                  daysOff: daysOffNumber,
                });
              }
            }
          }
        }

        setHolidayData(processedData);
        processHolidaySummaries(processedData);
        setHolidayFileUploaded(true);
        message.success(
          `Successfully loaded ${processedData.length} holiday entries from spreadsheet`
        );
      } catch (error) {
        console.error("Error parsing holiday Excel file:", error);
        message.error(
          "Error parsing holiday Excel file. Please check the file format."
        );
      } finally {
        setHolidayLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileUpload = (info: any) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      parseExcelFile(file);
      setBarrierFileUploaded(true);
    } else {
      message.error("No file found in upload");
    }
  };

  const handleHolidayFileUpload = (info: any) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      parseHolidayFile(file);
    } else {
      message.error("No file found in upload");
    }
  };

  const parseUserListFile = (file: File) => {
    setUserListLoading(true);

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

        // Process data starting from row 2 (index 1), columns B (last name), C (first name), and E (line manager)
        const processedData: UserListEntry[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];

          // Check if row has enough columns and data
          // Column B = index 1, Column C = index 2, Column E = index 4
          if (row && row.length >= 3 && row[1] && row[2]) {
            const lastName = row[1]; // Column B
            const firstName = row[2]; // Column C
            const lineManager = row[4] ? row[4].toString().trim() : ""; // Column E

            // Only add if we have valid data
            if (firstName && lastName) {
              processedData.push({
                firstName: firstName.toString().trim(),
                lastName: lastName.toString().trim(),
                fullName: `${firstName.toString().trim()} ${lastName.toString().trim()}`,
                lineManager: lineManager,
              });
            }
          }
        }

        setUserList(processedData);
        setUserListFileUploaded(true);
        message.success(
          `Successfully loaded ${processedData.length} users from spreadsheet`
        );
      } catch (error) {
        console.error("Error parsing user list Excel file:", error);
        message.error(
          "Error parsing user list Excel file. Please check the file format."
        );
      } finally {
        setUserListLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleUserListFileUpload = (info: any) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      parseUserListFile(file);
    } else {
      message.error("No file found in upload");
    }
  };

  const parseFlexibleRemoteFile = (file: File) => {
    setFlexibleRemoteLoading(true);

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

        // Process data starting from row 2 (index 1), columns A (full name) and F (time in office)
        const processedData: FlexibleRemoteEntry[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];

          // Check if row has enough columns and data
          // Column A = index 0, Column F = index 5
          if (row && row.length >= 6 && row[0]) {
            const fullName = row[0]; // Column A
            const timeInOffice = row[5]; // Column F

            // Only add if we have valid full name
            if (fullName) {
              const fullNameStr = fullName.toString().trim();

              // Split by last space to get firstName and lastName
              const lastSpaceIndex = fullNameStr.lastIndexOf(" ");
              let firstName: string;
              let lastName: string;

              if (lastSpaceIndex > 0) {
                firstName = fullNameStr.substring(0, lastSpaceIndex).trim();
                lastName = fullNameStr.substring(lastSpaceIndex + 1).trim();
              } else {
                // If no space found, treat entire string as lastName
                firstName = "";
                lastName = fullNameStr;
              }

              // Handle timeInOffice - can be number or string
              let timeInOfficeValue: number | string;
              if (
                timeInOffice !== undefined &&
                timeInOffice !== null &&
                timeInOffice !== ""
              ) {
                if (typeof timeInOffice === "number") {
                  timeInOfficeValue = timeInOffice;
                } else {
                  const timeStr = timeInOffice.toString().trim();
                  const timeNum = parseFloat(timeStr);
                  // If it's a valid number, use it; otherwise keep as string
                  timeInOfficeValue = !isNaN(timeNum) ? timeNum : timeStr;
                }
              } else {
                timeInOfficeValue = "Data not found";
              }

              processedData.push({
                fullName: fullNameStr,
                firstName: firstName,
                lastName: lastName,
                timeInOffice: timeInOfficeValue,
              });
            }
          }
        }

        setFlexibleRemoteData(processedData);
        processFlexibleRemoteSummaries(processedData);
        setFlexibleRemoteFileUploaded(true);
        message.success(
          `Successfully loaded ${processedData.length} flexible/remote entries from spreadsheet`
        );
      } catch (error) {
        console.error("Error parsing flexible/remote Excel file:", error);
        message.error(
          "Error parsing flexible/remote Excel file. Please check the file format."
        );
      } finally {
        setFlexibleRemoteLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFlexibleRemoteFileUpload = (info: any) => {
    const file = info.file.originFileObj || info.file;
    if (file) {
      parseFlexibleRemoteFile(file);
    } else {
      message.error("No file found in upload");
    }
  };

  const calculateCombinedData = () => {
    const combined: CombinedUserData[] = [];

    // Debug: Log the data to see what we're working with
    console.log(
      "Barrier data:",
      personSummaries.map((p) => ({
        fullName: p.fullName,
        firstName: p.firstName,
        lastName: p.lastName,
      }))
    );
    console.log(
      "Holiday data:",
      holidaySummaries.map((h) => ({
        fullName: h.fullName,
        firstName: h.firstName,
        lastName: h.lastName,
      }))
    );

    // Helper function to normalize names for matching
    const normalizeName = (name: string) => {
      return name.toLowerCase().trim().replace(/\s+/g, " ");
    };

    // Helper function to create a key for matching
    const createMatchKey = (firstName: string, lastName: string) => {
      return normalizeName(`${firstName} ${lastName}`);
    };

    // Helper function for fuzzy first name matching
    const fuzzyMatchFirstName = (
      firstName1: string,
      firstName2: string
    ): boolean => {
      const n1 = normalizeName(firstName1);
      const n2 = normalizeName(firstName2);

      // Exact match
      if (n1 === n2) return true;

      // Check if one is a substring of the other (for cases like "Chris" -> "Christopher")
      if (n1.includes(n2) || n2.includes(n1)) return true;

      // Check for common abbreviations
      const abbreviations: { [key: string]: string[] } = {
        chris: ["christopher", "christian"],
        mike: ["michael"],
        joe: ["joseph"],
        dave: ["david"],
        steve: ["steven", "stephen"],
        bob: ["robert"],
        bill: ["william"],
        jim: ["james"],
        tom: ["thomas"],
        dan: ["daniel"],
        matt: ["matthew"],
        nick: ["nicholas"],
        alex: ["alexander", "alexandra"],
        sam: ["samuel", "samantha"],
        ben: ["benjamin"],
        josh: ["joshua"],
        jon: ["jonathan", "john"],
        rob: ["robert"],
        tim: ["timothy"],
        pete: ["peter"],
        tony: ["anthony"],
        fara: ["farasat"],
        ioana: ["ioana maria"],
        agi: ["agnes"],
        natasa: ["nataša"],
        petre: ["petre-iulian"],
      };

      // Check if either name is an abbreviation of the other
      for (const [abbrev, fullNames] of Object.entries(abbreviations)) {
        if (
          (n1 === abbrev && fullNames.includes(n2)) ||
          (n2 === abbrev && fullNames.includes(n1))
        ) {
          return true;
        }
      }

      // Check for partial matches (for cases like "Ioana Maria" -> "Ioana")
      const words1 = n1.split(" ");
      const words2 = n2.split(" ");

      // If one name has more words, check if the shorter one matches the beginning
      if (words1.length > words2.length) {
        const shortName = words2.join(" ");
        const longNameStart = words1.slice(0, words2.length).join(" ");
        if (shortName === longNameStart) return true;
      } else if (words2.length > words1.length) {
        const shortName = words1.join(" ");
        const longNameStart = words2.slice(0, words1.length).join(" ");
        if (shortName === longNameStart) return true;
      }

      return false;
    };

    // Helper function for fuzzy last name matching
    const fuzzyMatchLastName = (
      lastName1: string,
      lastName2: string
    ): boolean => {
      const n1 = normalizeName(lastName1);
      const n2 = normalizeName(lastName2);

      // Exact match
      if (n1 === n2) return true;

      // Check for custom last name aliases
      const lastNameAliases: { [key: string]: string[] } = {
        sproule: ["donald"],
        donald: ["sproule"],
        truchel: ["arkadiusz"],
        arkadiusz: ["truchel"],
        iulian: ["dumitru"],
        dumitru: ["iulian"],
        dominique: ["cahu"],
        cahu: ["dominique"],
      };

      // Check if either name is an alias of the other
      for (const [alias, fullNames] of Object.entries(lastNameAliases)) {
        if (
          (n1 === alias && fullNames.includes(n2)) ||
          (n2 === alias && fullNames.includes(n1))
        ) {
          return true;
        }
      }

      // Check for double surnames (if one surname matches, it's probably the same person)
      const words1 = n1.split(/[\s-]+/);
      const words2 = n2.split(/[\s-]+/);

      // Check if any surname from one name appears in the other
      const hasMatchingSurname =
        words1.some((surname) => words2.includes(surname)) ||
        words2.some((surname) => words1.includes(surname));

      return hasMatchingSurname;
    };

    // Helper function to reorganize names by moving second part of first name to surname
    const reorganizeName = (firstName: string, lastName: string) => {
      const fn = normalizeName(firstName);
      const ln = normalizeName(lastName);

      const fnParts = fn.split(" ");

      if (fnParts.length > 1) {
        // Move everything except the first part to the beginning of the surname
        const newFirstName = fnParts[0];
        const movedParts = fnParts.slice(1);
        const newLastName = `${movedParts.join(" ")} ${ln}`.trim();

        return { firstName: newFirstName, lastName: newLastName };
      }

      return { firstName: fn, lastName: ln };
    };

    // Helper function for smart name matching with reorganization
    const smartNameMatch = (
      firstName1: string,
      lastName1: string,
      firstName2: string,
      lastName2: string
    ): boolean => {
      // First try normal fuzzy matching
      if (
        fuzzyMatchFirstName(firstName1, firstName2) &&
        fuzzyMatchLastName(lastName1, lastName2)
      ) {
        return true;
      }

      // Try reorganizing both names and matching
      const reorganized1 = reorganizeName(firstName1, lastName1);
      const reorganized2 = reorganizeName(firstName2, lastName2);

      // Try original vs reorganized
      if (
        fuzzyMatchFirstName(firstName1, reorganized2.firstName) &&
        fuzzyMatchLastName(lastName1, reorganized2.lastName)
      ) {
        return true;
      }

      if (
        fuzzyMatchFirstName(reorganized1.firstName, firstName2) &&
        fuzzyMatchLastName(reorganized1.lastName, lastName2)
      ) {
        return true;
      }

      // Try reorganized vs reorganized
      if (
        fuzzyMatchFirstName(reorganized1.firstName, reorganized2.firstName) &&
        fuzzyMatchLastName(reorganized1.lastName, reorganized2.lastName)
      ) {
        return true;
      }

      return false;
    };

    // Create maps for easier matching
    const barrierMap = new Map<string, PersonSummary>();
    const holidayMap = new Map<string, HolidaySummary>();
    const flexibleRemoteMap = new Map<string, FlexibleRemoteSummary>();

    // Index barrier data by normalized name
    personSummaries.forEach((person) => {
      const key = createMatchKey(person.firstName, person.lastName);
      barrierMap.set(key, person);
    });

    // Index holiday data by normalized name
    holidaySummaries.forEach((holiday) => {
      const key = createMatchKey(holiday.firstName, holiday.lastName);
      holidayMap.set(key, holiday);
    });

    // Index flexible/remote data by normalized name
    flexibleRemoteSummaries.forEach((flexibleRemote) => {
      const key = createMatchKey(
        flexibleRemote.firstName,
        flexibleRemote.lastName
      );
      flexibleRemoteMap.set(key, flexibleRemote);
    });

    // Use user list to determine which users to show
    // If user list is available, use it; otherwise fall back to holiday list
    const usersToShow =
      userList.length > 0
        ? userList
        : holidaySummaries.map((h) => ({
            firstName: h.firstName,
            lastName: h.lastName,
            fullName: h.fullName,
            lineManager: "",
          }));

    // Create combined data for each user
    usersToShow.forEach((user) => {
      // Try exact match first for barrier data
      const normalizedUserName = normalizeName(user.fullName);
      let barrierPerson = barrierMap.get(normalizedUserName);

      // If no exact match, try smart name matching for barrier data
      if (!barrierPerson) {
        barrierPerson = personSummaries.find((person) => {
          return smartNameMatch(
            person.firstName,
            person.lastName,
            user.firstName,
            user.lastName
          );
        });
      }

      // Try exact match first for holiday data
      let holidayPerson = holidayMap.get(normalizedUserName);

      // If no exact match, try smart name matching for holiday data
      if (!holidayPerson) {
        holidayPerson = holidaySummaries.find((holiday) => {
          return smartNameMatch(
            holiday.firstName,
            holiday.lastName,
            user.firstName,
            user.lastName
          );
        });
      }

      // Try exact match first for flexible/remote data
      let flexibleRemotePerson = flexibleRemoteMap.get(normalizedUserName);

      // If no exact match, try smart name matching for flexible/remote data
      if (!flexibleRemotePerson) {
        flexibleRemotePerson = flexibleRemoteSummaries.find(
          (flexibleRemote) => {
            return smartNameMatch(
              flexibleRemote.firstName,
              flexibleRemote.lastName,
              user.firstName,
              user.lastName
            );
          }
        );
      }

      // Debug: Log what we found for this user
      console.log(`User: ${user.fullName} (normalized: ${normalizedUserName})`);
      console.log(
        `  Barrier match:`,
        barrierPerson
          ? `${barrierPerson.firstName} ${barrierPerson.lastName}`
          : "None"
      );
      console.log(
        `  Holiday match:`,
        holidayPerson
          ? `${holidayPerson.firstName} ${holidayPerson.lastName}`
          : "None"
      );
      console.log(
        `  Flexible/Remote match:`,
        flexibleRemotePerson
          ? `${flexibleRemotePerson.firstName} ${flexibleRemotePerson.lastName}`
          : "None"
      );

      const barrierDaysValue = barrierPerson ? barrierPerson.uniqueDays : 0;
      const holidayDaysValue = holidayPerson
        ? holidayPerson.totalHolidayDays
        : 0;

      // Calculate base days in office
      // Priority: flexible/remote data > default (8)
      let baseDaysInOffice: number | string;
      if (flexibleRemotePerson) {
        // Use flexible/remote data directly (can be number or string)
        baseDaysInOffice = flexibleRemotePerson.timeInOffice;
      } else {
        baseDaysInOffice = 8;
      }

      // Calculate days in office value
      // If baseDaysInOffice is a number, apply holiday reduction
      // If it's a string, keep it as is
      let daysInOfficeValue: number | string;
      if (typeof baseDaysInOffice === "number") {
        // Reduce required days by 8 * (holidays / 20)
        // Example: 10 holidays = 8 * (10/20) = 4 days reduction
        const holidayReduction = Math.ceil(8 * (holidayDaysValue / 20));
        daysInOfficeValue = Math.max(
          0,
          Math.floor(baseDaysInOffice - holidayReduction)
        );
      } else {
        // If it's a string (like "Data not found" or some exception), keep it as is
        daysInOfficeValue = baseDaysInOffice;
      }

      // Calculate difference: Barrier Days - Agreed Days in Office per month
      // Only calculate if both are numbers
      const difference =
        typeof daysInOfficeValue === "number"
          ? barrierDaysValue - daysInOfficeValue
          : "N/A";

      combined.push({
        fullName: user.fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        barrierDays: barrierDaysValue,
        holidayDays: holidayPerson ? holidayPerson.totalHolidayDays : 0,
        weeklyHours: "Data not found",
        daysInOffice: daysInOfficeValue,
        difference: difference,
        lineManager: user.lineManager || undefined,
      });
    });

    // Sort by barrier days (descending), then by name
    combined.sort((a, b) => {
      const aBarrier = typeof a.barrierDays === "number" ? a.barrierDays : -1;
      const bBarrier = typeof b.barrierDays === "number" ? b.barrierDays : -1;

      if (bBarrier !== aBarrier) {
        return bBarrier - aBarrier;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    setCombinedData(combined);

    // Find barrier users that don't match any user in the user list
    const unmatched: PersonSummary[] = [];

    if (userList.length > 0) {
      personSummaries.forEach((barrierPerson) => {
        // Check if this barrier person matches any user in the user list
        const hasMatch = usersToShow.some((user) => {
          // Try exact match first
          const normalizedBarrierName = normalizeName(barrierPerson.fullName);
          const normalizedUserName = normalizeName(user.fullName);

          if (normalizedBarrierName === normalizedUserName) {
            return true;
          }

          // Try smart name matching
          return smartNameMatch(
            barrierPerson.firstName,
            barrierPerson.lastName,
            user.firstName,
            user.lastName
          );
        });

        // If no match found, add to unmatched list
        if (!hasMatch) {
          unmatched.push(barrierPerson);
        }
      });

      // Sort unmatched by name
      unmatched.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    setUnmatchedBarrierUsers(unmatched);

    // Debug: Log the full barrier list for comparison
    console.log("Full barrier list:", personSummaries);
    console.log("Full holiday list:", holidaySummaries);
    console.log("Final combined data:", combined);
    console.log("Unmatched barrier users:", unmatched);

    message.success(`Calculated combined data for ${combined.length} users`);
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
    if (combinedData.length === 0) {
      message.warning("No combined data to export");
      return;
    }

    // Create headers
    const headers = [
      "First Name",
      "Last Name",
      "Barrier Days",
      "Holiday Days",
      "Agreed Days in Office Per Month",
      "Difference",
    ];

    // Create data rows
    const rows = combinedData.map((user) => [
      user.firstName,
      user.lastName,
      user.barrierDays,
      user.holidayDays,
      user.daysInOffice,
      user.difference,
    ]);

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Combined Analysis");

    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
    const filename = `combined_analysis_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
    message.success(`Exported ${combinedData.length} records to ${filename}`);
  };

  const combinedColumns = [
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
      width: 150,
      sorter: (a: CombinedUserData, b: CombinedUserData) =>
        a.firstName.localeCompare(b.firstName),
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
      width: 150,
      sorter: (a: CombinedUserData, b: CombinedUserData) =>
        a.lastName.localeCompare(b.lastName),
    },
    {
      title: "Line Manager",
      dataIndex: "lineManager",
      key: "lineManager",
      width: 150,
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aManager = a.lineManager || "";
        const bManager = b.lineManager || "";
        return aManager.localeCompare(bManager);
      },
    },
    {
      title: "Barrier Days",
      dataIndex: "barrierDays",
      key: "barrierDays",
      width: 150,
      render: (days: number | string) => {
        if (typeof days === "number") {
          return <Tag color="blue">{days}</Tag>;
        }
        return <Tag color="red">{days}</Tag>;
      },
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aDays = typeof a.barrierDays === "number" ? a.barrierDays : -1;
        const bDays = typeof b.barrierDays === "number" ? b.barrierDays : -1;
        return aDays - bDays;
      },
    },
    {
      title: "Holiday Days",
      dataIndex: "holidayDays",
      key: "holidayDays",
      width: 150,
      render: (days: number | string) => {
        if (typeof days === "number") {
          return <Tag color="green">{days}</Tag>;
        }
        return <Tag color="red">{days}</Tag>;
      },
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aDays = typeof a.holidayDays === "number" ? a.holidayDays : -1;
        const bDays = typeof b.holidayDays === "number" ? b.holidayDays : -1;
        return aDays - bDays;
      },
    },
    {
      title: "Weekly Hours",
      dataIndex: "weeklyHours",
      key: "weeklyHours",
      width: 150,
      render: (hours: number | string) => {
        if (typeof hours === "number") {
          return <Tag color="purple">{hours}</Tag>;
        }
        return "-";
      },
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aHours = typeof a.weeklyHours === "number" ? a.weeklyHours : -1;
        const bHours = typeof b.weeklyHours === "number" ? b.weeklyHours : -1;
        return aHours - bHours;
      },
    },
    {
      title: "Agreed Days in Office Per Month",
      dataIndex: "daysInOffice",
      key: "daysInOffice",
      width: 150,
      render: (days: number | string) => {
        if (typeof days === "number") {
          return <Tag color="orange">{days}</Tag>;
        }
        return <Tag color="default">{days}</Tag>;
      },
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aDays = typeof a.daysInOffice === "number" ? a.daysInOffice : -1;
        const bDays = typeof b.daysInOffice === "number" ? b.daysInOffice : -1;
        return aDays - bDays;
      },
    },
    {
      title: "Difference",
      dataIndex: "difference",
      key: "difference",
      width: 150,
      render: (diff: number | string) => {
        if (typeof diff === "number") {
          const color = diff < 0 ? "red" : "blue";
          return <Tag color={color}>{diff}</Tag>;
        }
        return <Tag color="red">{diff}</Tag>;
      },
      sorter: (a: CombinedUserData, b: CombinedUserData) => {
        const aDiff = typeof a.difference === "number" ? a.difference : -1;
        const bDiff = typeof b.difference === "number" ? b.difference : -1;
        return aDiff - bDiff;
      },
    },
  ];

  const unmatchedBarrierColumns = [
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
      width: 150,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.firstName.localeCompare(b.firstName),
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
      width: 150,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.lastName.localeCompare(b.lastName),
    },
    {
      title: "Barrier Days",
      dataIndex: "uniqueDays",
      key: "uniqueDays",
      width: 150,
      render: (days: number) => <Tag color="orange">{days}</Tag>,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        b.uniqueDays - a.uniqueDays,
    },
    {
      title: "Total Entries",
      dataIndex: "totalEntries",
      key: "totalEntries",
      width: 150,
      render: (entries: number) => <Tag color="cyan">{entries}</Tag>,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        b.totalEntries - a.totalEntries,
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

  const barrierDataColumns = [
    {
      title: "First Name",
      dataIndex: "firstName",
      key: "firstName",
      width: 150,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.firstName.localeCompare(b.firstName),
    },
    {
      title: "Last Name",
      dataIndex: "lastName",
      key: "lastName",
      width: 150,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        a.lastName.localeCompare(b.lastName),
    },
    {
      title: "Barrier Days",
      dataIndex: "uniqueDays",
      key: "uniqueDays",
      width: 150,
      render: (days: number) => <Tag color="blue">{days}</Tag>,
      sorter: (a: PersonSummary, b: PersonSummary) =>
        b.uniqueDays - a.uniqueDays,
    },
  ];

  const dailyAttendanceColumns = [
    {
      title: "Day of the Week",
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      width: 150,
      sorter: (a: DailyAttendance, b: DailyAttendance) => {
        const daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const indexA = daysOfWeek.indexOf(a.dayOfWeek);
        const indexB = daysOfWeek.indexOf(b.dayOfWeek);
        return indexA - indexB;
      },
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 150,
    },
    {
      title: "Number of People",
      dataIndex: "count",
      key: "count",
      width: 150,
      render: (count: number) => <Tag color="cyan">{count}</Tag>,
      sorter: (a: DailyAttendance, b: DailyAttendance) => b.count - a.count,
    },
  ];

  const weeklyAttendanceSummaryColumns = [
    {
      title: "Day of the Week",
      dataIndex: "dayOfWeek",
      key: "dayOfWeek",
      width: 150,
      sorter: (a: WeeklyAttendanceSummary, b: WeeklyAttendanceSummary) => {
        const daysOfWeek = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const indexA = daysOfWeek.indexOf(a.dayOfWeek);
        const indexB = daysOfWeek.indexOf(b.dayOfWeek);
        return indexA - indexB;
      },
    },
    {
      title: "Total Count",
      dataIndex: "totalCount",
      key: "totalCount",
      width: 150,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
      sorter: (a: WeeklyAttendanceSummary, b: WeeklyAttendanceSummary) =>
        b.totalCount - a.totalCount,
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <Card
        title="Security Barriers & Holidays Analyzer"
        style={{ marginBottom: "20px" }}
      >
        <div
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Upload
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={() => false} // Prevent auto upload
            onChange={handleUserListFileUpload}
          >
            <Button icon={<UploadOutlined />} loading={userListLoading}>
              Upload User List
            </Button>
          </Upload>
          {userListFileUploaded && <Tag color="green">✓ Uploaded</Tag>}

          <Upload
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={() => false} // Prevent auto upload
            onChange={handleHolidayFileUpload}
          >
            <Button icon={<UploadOutlined />} loading={holidayLoading}>
              Upload Holiday Data
            </Button>
          </Upload>
          {holidayFileUploaded && <Tag color="green">✓ Uploaded</Tag>}

          <Upload
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={() => false} // Prevent auto upload
            onChange={handleFlexibleRemoteFileUpload}
          >
            <Button icon={<UploadOutlined />} loading={flexibleRemoteLoading}>
              Upload Flexible and Remote
            </Button>
          </Upload>
          {flexibleRemoteFileUploaded && <Tag color="green">✓ Uploaded</Tag>}

          <Upload
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={() => false} // Prevent auto upload
            onChange={handleFileUpload}
          >
            <Button icon={<UploadOutlined />} loading={loading}>
              Upload Barrier Data
            </Button>
          </Upload>
          {barrierFileUploaded && <Tag color="green">✓ Uploaded</Tag>}

          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={calculateCombinedData}
            disabled={!barrierFileUploaded || !holidayFileUploaded}
            size="large"
          >
            Calculate
          </Button>
        </div>
      </Card>

      {combinedData.length > 0 && unmatchedBarrierUsers.length > 0 && (
        <Card
          title={`⚠️ Unmatched Barrier Users (${unmatchedBarrierUsers.length} users not in user list)`}
          style={{ marginBottom: "20px", borderColor: "#faad14" }}
        >
          <Table
            columns={unmatchedBarrierColumns}
            dataSource={unmatchedBarrierUsers}
            rowKey="fullName"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
            size="small"
          />
        </Card>
      )}

      {combinedData.length > 0 && (
        <Card
          title={`Combined Analysis (${combinedData.length} users)`}
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
            columns={combinedColumns}
            dataSource={combinedData}
            rowKey="fullName"
            pagination={{ pageSize: 20 }}
            scroll={{ x: 600 }}
            size="small"
          />
        </Card>
      )}

      {combinedData.length === 0 &&
        barrierFileUploaded &&
        holidayFileUploaded && (
          <Card title="No Combined Data Found">
            <p>
              No combined data was calculated. Please check that both files
              contain valid data and try calculating again.
            </p>
          </Card>
        )}

      {barrierFileUploaded && personSummaries.length > 0 && (
        <Card style={{ marginBottom: "20px" }}>
          <Collapse
            items={[
              {
                key: "barrier-data",
                label: `Processed Barrier Data (${personSummaries.length} users)`,
                children: (
                  <Table
                    columns={barrierDataColumns}
                    dataSource={personSummaries}
                    rowKey="fullName"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 450 }}
                    size="small"
                  />
                ),
              },
            ]}
            defaultActiveKey={[]}
          />
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

      {dailyAttendance.length > 0 && (
        <Card
          title={`Daily Attendance by Day of Month (${dailyAttendance.length} days)`}
          style={{ marginTop: "20px" }}
        >
          <Table
            columns={dailyAttendanceColumns}
            dataSource={dailyAttendance}
            rowKey={(record) => `${record.dayOfWeek}-${record.date}`}
            pagination={{ pageSize: 31 }}
            scroll={{ x: 400 }}
            size="small"
          />
        </Card>
      )}

      {weeklyAttendanceSummary.length > 0 && (
        <Card
          title="Weekly Attendance Summary by Day of Week"
          style={{ marginTop: "20px" }}
        >
          <Table
            columns={weeklyAttendanceSummaryColumns}
            dataSource={weeklyAttendanceSummary}
            rowKey="dayOfWeek"
            pagination={false}
            scroll={{ x: 300 }}
            size="small"
          />
        </Card>
      )}
    </div>
  );
};

export default WeWork;
