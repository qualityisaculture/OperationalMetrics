import React from "react";
import { Card, List, Typography, Alert, Tag } from "antd";
import { JiraIssueWithAggregated } from "../types";

interface AccountMismatchItem {
  key: string;
  summary: string;
  url: string;
  workstreamKey: string;
  workstreamName: string;
  issueAccount: string;
  workstreamAccount: string;
}

interface AccountMismatchListProps {
  mismatches: AccountMismatchItem[];
}

// Helper function to recursively find account mismatches
export const findAccountMismatches = (
  projectIssues: JiraIssueWithAggregated[]
): AccountMismatchItem[] => {
  const mismatches: AccountMismatchItem[] = [];

  // Recursive function to check all children of a workstream
  // If a child is also a workstream, use its account for its children
  const checkChildren = (
    issue: JiraIssueWithAggregated,
    parentWorkstreamKey: string,
    parentWorkstreamName: string,
    parentWorkstreamAccount: string
  ) => {
    // Check if this issue is a workstream itself
    const isWorkstream = issue.type === "Workstream";
    
    // Determine the account to compare against
    // If this is a workstream, use its own account for its children
    // Otherwise, use the parent workstream account
    const expectedAccount = isWorkstream
      ? issue.account || "None"
      : parentWorkstreamAccount;
    
    const workstreamKey = isWorkstream ? issue.key : parentWorkstreamKey;
    const workstreamName = isWorkstream ? issue.summary : parentWorkstreamName;

    // Only check non-workstream issues against their parent workstream account
    // Workstreams themselves are not checked (they define the account)
    if (!isWorkstream) {
      // Check if this issue's account doesn't match the expected account
      // Only check if both accounts are defined and not "None"
      if (
        issue.account &&
        expectedAccount &&
        issue.account !== "None" &&
        expectedAccount !== "None" &&
        issue.account !== expectedAccount
      ) {
        mismatches.push({
          key: issue.key,
          summary: issue.summary,
          url: issue.url,
          workstreamKey,
          workstreamName,
          issueAccount: issue.account,
          workstreamAccount: expectedAccount,
        });
      }
    }

    // Recursively check all children
    if (issue.children && issue.children.length > 0) {
      for (const child of issue.children) {
        checkChildren(child, workstreamKey, workstreamName, expectedAccount);
      }
    }
  };

  // Iterate through all top-level workstreams
  for (const workstream of projectIssues) {
    const workstreamAccount = workstream.account || "None";

    // Recursively check all children of this workstream
    if (workstream.children && workstream.children.length > 0) {
      for (const child of workstream.children) {
        checkChildren(
          child,
          workstream.key,
          workstream.summary,
          workstreamAccount
        );
      }
    }
  }

  return mismatches;
};

const AccountMismatchList: React.FC<AccountMismatchListProps> = ({
  mismatches,
}) => {
  if (mismatches.length === 0) {
    return (
      <Card title="Account Mismatch Detection" style={{ margin: "16px 0" }}>
        <Alert
          message="No Account Mismatches Found"
          description="All tickets have accounts that match their parent workstream account."
          type="success"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={{ marginRight: "8px" }}>⚠️</span>
          <span style={{ color: "#fa8c16" }}>
            Account Mismatch Detection - {mismatches.length} Mismatch
            {mismatches.length !== 1 ? "es" : ""} Found
          </span>
        </div>
      }
      style={{
        margin: "16px 0",
        borderColor: "#fa8c16",
        borderWidth: "2px",
      }}
      headStyle={{
        backgroundColor: "#fff7e6",
        borderBottomColor: "#fa8c16",
      }}
    >
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        <List
          dataSource={mismatches}
          renderItem={(mismatch) => (
            <List.Item>
              <div style={{ width: "100%" }}>
                <div style={{ marginBottom: "4px" }}>
                  <Typography.Text strong>
                    <a
                      href={mismatch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        color: "#1890ff",
                        fontWeight: "bold",
                      }}
                    >
                      <Tag color="orange">{mismatch.key}</Tag>
                    </a>
                  </Typography.Text>
                  <Typography.Text style={{ marginLeft: "8px" }}>
                    {mismatch.summary}
                  </Typography.Text>
                </div>
                <div style={{ marginTop: "4px", fontSize: "12px", color: "#666" }}>
                  <Typography.Text type="secondary">
                    Workstream:{" "}
                    <Tag color="blue">{mismatch.workstreamKey}</Tag>{" "}
                    {mismatch.workstreamName}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Issue Account: <Tag color="red">{mismatch.issueAccount}</Tag>{" "}
                    | Expected: <Tag color="green">{mismatch.workstreamAccount}</Tag>
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    </Card>
  );
};

export default AccountMismatchList;

