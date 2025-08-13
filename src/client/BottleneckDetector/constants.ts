export const DEFAULT_JQL_QUERY =
  'project = "PROJECT" AND status != "Done" ORDER BY updated DESC';

export const TABLE_COLUMNS = [
  {
    title: "Key",
    dataIndex: "key",
    key: "key",
  },
  {
    title: "Summary",
    dataIndex: "summary",
    key: "summary",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
  },
  {
    title: "Assignee",
    dataIndex: "assignee",
    key: "assignee",
  },
  {
    title: "Priority",
    dataIndex: "priority",
    key: "priority",
  },
  {
    title: "Type",
    dataIndex: "issueType",
    key: "issueType",
  },
  {
    title: "Created",
    dataIndex: "created",
    key: "created",
  },
  {
    title: "Updated",
    dataIndex: "updated",
    key: "updated",
  },
];
