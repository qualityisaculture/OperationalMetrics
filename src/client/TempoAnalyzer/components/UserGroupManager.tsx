import React, { useState } from "react";
import {
  Card,
  Space,
  Button,
  Input,
  Select,
  Popconfirm,
  Typography,
  Divider,
  Collapse,
} from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  UserOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { UserGroup, UserGroupAssignment } from "../types";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface UserGroupManagerProps {
  userGroups: {
    groups: UserGroup[];
    assignments: UserGroupAssignment[];
  };
  onCreateGroup: (name: string) => void;
  onUpdateGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string, name: string) => void;
  onAssignUser: (fullName: string, groupId: string | null) => void;
}

export const UserGroupManager: React.FC<UserGroupManagerProps> = ({
  userGroups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAssignUser,
}) => {
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName);
      setNewGroupName("");
    }
  };

  const handleUpdateGroup = () => {
    if (editingGroup && editingGroup.name.trim()) {
      onUpdateGroup(editingGroup.id, editingGroup.name);
      setEditingGroup(null);
    }
  };

  const startEditing = (group: UserGroup) => {
    setEditingGroup({ id: group.id, name: group.name });
  };

  const cancelEditing = () => {
    setEditingGroup(null);
  };

  const getUsersInGroup = (groupId: string | null) => {
    return userGroups.assignments
      .filter((assignment) => assignment.groupId === groupId)
      .map((assignment) => assignment.fullName);
  };

  const getUnassignedUsers = () => {
    return userGroups.assignments
      .filter((assignment) => assignment.groupId === null)
      .map((assignment) => assignment.fullName);
  };

  return (
    <Card style={{ marginTop: "20px" }}>
      <Collapse defaultActiveKey={[]} ghost>
        <Panel
          header={
            <span>
              <TeamOutlined style={{ marginRight: "8px" }} />
              User Group Management
            </span>
          }
          key="user-groups"
        >
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Create New Group */}
            <div>
              <Title level={5}>Create New Group</Title>
              <Space>
                <Input
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onPressEnter={handleCreateGroup}
                  style={{ width: 200 }}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  Create Group
                </Button>
              </Space>
            </div>

            <Divider />

            {/* Groups with Users */}
            <div>
              <Title level={5}>Groups and Users</Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                {userGroups.groups.map((group) => {
                  const usersInGroup = getUsersInGroup(group.id);

                  return (
                    <div
                      key={group.id}
                      style={{
                        border: "1px solid #f0f0f0",
                        borderRadius: "8px",
                        padding: "16px",
                        backgroundColor: "#fafafa",
                      }}
                    >
                      {/* Group Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        {editingGroup?.id === group.id ? (
                          <>
                            <Input
                              value={editingGroup.name}
                              onChange={(e) =>
                                setEditingGroup({
                                  ...editingGroup,
                                  name: e.target.value,
                                })
                              }
                              style={{ width: 200 }}
                            />
                            <Button size="small" onClick={handleUpdateGroup}>
                              Save
                            </Button>
                            <Button size="small" onClick={cancelEditing}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Title
                              level={4}
                              style={{
                                margin: 0,
                                color:
                                  group.id === "uncategorised"
                                    ? "#666"
                                    : "#1890ff",
                              }}
                            >
                              {group.name}
                            </Title>
                            {group.id !== "uncategorised" && (
                              <>
                                <Button
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => startEditing(group)}
                                >
                                  Edit
                                </Button>
                                <Popconfirm
                                  title="Are you sure you want to delete this group?"
                                  description="All users in this group will be moved to 'Uncategorised'."
                                  onConfirm={() =>
                                    onDeleteGroup(group.id, group.name)
                                  }
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                  >
                                    Delete
                                  </Button>
                                </Popconfirm>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Users in this group */}
                      <div style={{ marginLeft: "20px" }}>
                        {usersInGroup.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            {usersInGroup.map((userName) => (
                              <div
                                key={userName}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: "4px 8px",
                                  backgroundColor: "white",
                                  border: "1px solid #d9d9d9",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                <UserOutlined
                                  style={{ fontSize: "12px", color: "#666" }}
                                />
                                <Text style={{ fontSize: "12px" }}>
                                  {userName}
                                </Text>
                                {group.id !== "uncategorised" && (
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    onClick={() => onAssignUser(userName, null)}
                                    style={{
                                      padding: "0 4px",
                                      minWidth: "auto",
                                    }}
                                  >
                                    ×
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontSize: "12px" }}>
                            No users in this group
                          </Text>
                        )}
                      </div>

                      {/* Add user to group (only for non-uncategorised groups) */}
                      {group.id !== "uncategorised" && (
                        <div style={{ marginTop: "12px", marginLeft: "20px" }}>
                          <Select
                            placeholder="Add user to this group"
                            style={{ width: 200 }}
                            onChange={(value) => onAssignUser(value, group.id)}
                            allowClear
                          >
                            {getUnassignedUsers().map((userName) => (
                              <Option key={userName} value={userName}>
                                {userName}
                              </Option>
                            ))}
                          </Select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Space>
            </div>
          </Space>
        </Panel>
      </Collapse>
    </Card>
  );
};
