import React, { useState } from "react";
import {
  Button,
  Input,
  Space,
  Card,
  Typography,
  Popconfirm,
  Select,
  Divider,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { Queue, UnassignedStatus } from "../types";

const { Title, Text } = Typography;
const { Option } = Select;

interface QueueManagerProps {
  queues: Queue[];
  unassignedStatuses: UnassignedStatus[];
  onQueuesChange: (queues: Queue[]) => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  queues,
  unassignedStatuses,
  onQueuesChange,
}) => {
  const [editingQueue, setEditingQueue] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const [newQueueName, setNewQueueName] = useState<string>("");

  const handleCreateQueue = () => {
    if (newQueueName.trim()) {
      const newQueue: Queue = {
        id: `queue-${Date.now()}`,
        name: newQueueName.trim(),
        statuses: [],
        order: queues.length,
      };
      onQueuesChange([...queues, newQueue]);
      setNewQueueName("");
    }
  };

  const handleDeleteQueue = (queueId: string) => {
    onQueuesChange(queues.filter((q) => q.id !== queueId));
  };

  const handleStartEdit = (queue: Queue) => {
    setEditingQueue(queue.id);
    setEditingName(queue.name);
  };

  const handleSaveEdit = (queueId: string) => {
    if (editingName.trim()) {
      onQueuesChange(
        queues.map((q) =>
          q.id === queueId ? { ...q, name: editingName.trim() } : q
        )
      );
      setEditingQueue(null);
      setEditingName("");
    }
  };

  const handleCancelEdit = () => {
    setEditingQueue(null);
    setEditingName("");
  };

  const handleMoveQueue = (queueId: string, direction: "up" | "down") => {
    const currentIndex = queues.findIndex((q) => q.id === queueId);
    if (currentIndex === -1) return;

    const newQueues = [...queues];
    if (direction === "up" && currentIndex > 0) {
      [newQueues[currentIndex], newQueues[currentIndex - 1]] = [
        newQueues[currentIndex - 1],
        newQueues[currentIndex],
      ];
    } else if (direction === "down" && currentIndex < newQueues.length - 1) {
      [newQueues[currentIndex], newQueues[currentIndex + 1]] = [
        newQueues[currentIndex + 1],
        newQueues[currentIndex],
      ];
    }

    // Update order numbers
    newQueues.forEach((q, index) => {
      q.order = index;
    });

    onQueuesChange(newQueues);
  };

  const handleStatusAssignment = (queueId: string, status: string) => {
    onQueuesChange(
      queues.map((q) =>
        q.id === queueId ? { ...q, statuses: [...q.statuses, status] } : q
      )
    );
  };

  const handleStatusRemoval = (queueId: string, status: string) => {
    onQueuesChange(
      queues.map((q) =>
        q.id === queueId
          ? { ...q, statuses: q.statuses.filter((s) => s !== status) }
          : q
      )
    );
  };

  const getAvailableStatuses = (excludeQueueId?: string) => {
    const assignedStatuses = queues
      .filter((q) => !excludeQueueId || q.id !== excludeQueueId)
      .flatMap((q) => q.statuses);

    return unassignedStatuses.filter(
      (s) => !assignedStatuses.includes(s.status)
    );
  };

  return (
    <Card title="Queue Management" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        {/* Create new queue */}
        <Space>
          <Input
            placeholder="Enter queue name"
            value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)}
            onPressEnter={handleCreateQueue}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateQueue}
            disabled={!newQueueName.trim()}
          >
            Add Queue
          </Button>
        </Space>

        <Divider />

        {/* Existing queues */}
        {queues.map((queue, index) => (
          <Card
            key={queue.id}
            size="small"
            style={{ border: "1px solid #d9d9d9" }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="small">
              {/* Queue header */}
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Space>
                  {editingQueue === queue.id ? (
                    <Space>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onPressEnter={() => handleSaveEdit(queue.id)}
                        style={{ width: 150 }}
                      />
                      <Button
                        size="small"
                        icon={<SaveOutlined />}
                        onClick={() => handleSaveEdit(queue.id)}
                      />
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={handleCancelEdit}
                      />
                    </Space>
                  ) : (
                    <Title level={5} style={{ margin: 0 }}>
                      {queue.name}
                    </Title>
                  )}
                </Space>

                <Space>
                  <Button
                    size="small"
                    onClick={() => handleMoveQueue(queue.id, "up")}
                    disabled={index === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    size="small"
                    onClick={() => handleMoveQueue(queue.id, "down")}
                    disabled={index === queues.length - 1}
                  >
                    ↓
                  </Button>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleStartEdit(queue)}
                  />
                  <Popconfirm
                    title="Are you sure you want to delete this queue?"
                    onConfirm={() => handleDeleteQueue(queue.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Space>

              {/* Status assignment */}
              <Space
                direction="vertical"
                style={{ width: "100%" }}
                size="small"
              >
                <Text strong>Statuses:</Text>
                <Space wrap>
                  {queue.statuses.map((status) => (
                    <Tag
                      key={status}
                      closable
                      onClose={() => handleStatusRemoval(queue.id, status)}
                      color="blue"
                    >
                      {status}
                    </Tag>
                  ))}
                </Space>

                {/* Add status dropdown */}
                {getAvailableStatuses(queue.id).length > 0 && (
                  <Select
                    placeholder="Add status to queue"
                    style={{ width: 200 }}
                    onSelect={(status: string) =>
                      handleStatusAssignment(queue.id, status)
                    }
                  >
                    {getAvailableStatuses(queue.id).map((status) => (
                      <Option key={status.status} value={status.status}>
                        {status.status} ({status.count})
                      </Option>
                    ))}
                  </Select>
                )}
              </Space>
            </Space>
          </Card>
        ))}

        {queues.length === 0 && (
          <Text type="secondary">
            No queues created yet. Create your first queue above.
          </Text>
        )}
      </Space>
    </Card>
  );
};
