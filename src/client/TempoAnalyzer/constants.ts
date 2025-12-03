import { IssueKeyException } from "./types";

// Configuration for issue keys that should be split into their own categories
export const ISSUE_KEY_EXCEPTIONS: IssueKeyException[] = [
  {
    issueKeys: ["ABS-56", "ABS-58", "ABS-57"],
    categorySuffix: "Holiday & Absence",
  },
  {
    issueKeys: [
      "HR-57",
      "LD-47",
      "DEL-12",
      "DEL-15",
      "LD-48",
      "LD-58",
      "DEL-22",
      "HR-50",
      "HR-46",
      "AF-18326",
    ],
    categorySuffix: "Meeting",
  },
  {
    issueKeys: [
      "HR-48",
      "DEL-14",
      "HR-49",
      "LD-53",
      "HR-68",
      "LD-54",
      "DEL-13",
      "LAM-39",
    ],
    categorySuffix: "Team Management",
  },
  {
    issueKeys: ["LD-50", "HR-47", "LD-45"],
    categorySuffix: "Training",
  },
  {
    issueKeys: ["STR-45"],
    categorySuffix: "XFT Reorg",
  },
  {
    account: "PMO Projects",
    categorySuffix: "PMO Projects",
  },
  {
    account: "Technical Services",
    categorySuffix: "Technical Services",
  },
  // {
  //   typeOfWork: "Functional feature investment",
  //   categorySuffix: "Product",
  // },
  // Add more exceptions here as needed:
  // { issueKeys: ["ABS-57", "ABS-58"], categorySuffix: "Sick Leave" },
  // { issueKeys: ["LD-51", "LD-52", "LD-53"], categorySuffix: "Advanced Training" },
];
