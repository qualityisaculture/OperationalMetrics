import React from "react";
import {
  Table,
  Card,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
} from "antd";
import { JiraProject } from "../server/graphManagers/JiraReportGraphManager";
import {
  ReloadOutlined,
  ProjectOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

const { Title, Text } = Typography;

interface Props {}

interface State {
  projects: JiraProject[];
  isLoading: boolean;
  error: string | null;
  selectedProject: JiraProject | null;
  isModalVisible: boolean;
}

export default class JiraReport extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      projects: [],
      isLoading: false,
      error: null,
      selectedProject: null,
      isModalVisible: false,
    };
  }

  componentDidMount() {
    this.loadProjects();
  }

  loadProjects = async () => {
    this.setState({ isLoading: true, error: null });

    try {
      const response = await fetch("/api/jiraReport/projects");
      const data = await response.json();

      if (response.ok) {
        const projects: JiraProject[] = JSON.parse(data.data);
        this.setState({ projects, isLoading: false });
      } else {
        this.setState({
          error: data.message || "Failed to load projects",
          isLoading: false,
        });
      }
    } catch (error) {
      this.setState({
        error: "Network error while loading projects",
        isLoading: false,
      });
    }
  };

  showProjectDetails = (project: JiraProject) => {
    this.setState({
      selectedProject: project,
      isModalVisible: true,
    });
  };

  handleModalClose = () => {
    this.setState({
      selectedProject: null,
      isModalVisible: false,
    });
  };

  render() {
    const { projects, isLoading, error, selectedProject, isModalVisible } =
      this.state;

    const columns: ColumnsType<JiraProject> = [
      {
        title: "Project Key",
        dataIndex: "key",
        key: "key",
        render: (key: string) => <Tag color="green">{key}</Tag>,
        sorter: (a, b) => a.key.localeCompare(b.key),
        defaultSortOrder: "ascend",
      },
      {
        title: "Project Name",
        dataIndex: "name",
        key: "name",
        render: (name: string) => <Text strong>{name}</Text>,
        sorter: (a, b) => a.name.localeCompare(b.name),
        filterable: true,
        onFilter: (value, record) =>
          record.name.toLowerCase().includes((value as string).toLowerCase()),
        filterSearch: true,
        filters: projects.map((project) => ({
          text: project.name,
          value: project.name,
        })),
      },
      {
        title: "Project ID",
        dataIndex: "id",
        key: "id",
        render: (id: string) => <Tag color="blue">{id}</Tag>,
        sorter: (a, b) => a.id.localeCompare(b.id),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_, record) => (
          <Button
            type="link"
            icon={<InfoCircleOutlined />}
            onClick={() => this.showProjectDetails(record)}
          >
            Details
          </Button>
        ),
      },
    ];

    if (isLoading) {
      return (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" />
          <div style={{ marginTop: "16px" }}>Loading Jira projects...</div>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ margin: "16px" }}
          action={
            <Button size="small" danger onClick={this.loadProjects}>
              Retry
            </Button>
          }
        />
      );
    }

    return (
      <div style={{ padding: "16px" }}>
        <div style={{ marginBottom: "16px" }}>
          <Space align="center">
            <Title level={2} style={{ margin: 0 }}>
              <ProjectOutlined /> Jira Report
            </Title>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={this.loadProjects}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <Card
          title={
            <Space>
              <ProjectOutlined />
              Projects ({projects.length})
            </Space>
          }
          extra={
            <Text type="secondary">
              Last updated: {new Date().toLocaleString()}
            </Text>
          }
        >
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} projects`,
            }}
            onRow={(record) => ({
              onClick: () => this.showProjectDetails(record),
              style: { cursor: "pointer" },
            })}
          />
        </Card>

        <Modal
          title={
            <Space>
              <ProjectOutlined />
              Project Details
            </Space>
          }
          open={isModalVisible}
          onCancel={this.handleModalClose}
          footer={[
            <Button key="close" onClick={this.handleModalClose}>
              Close
            </Button>,
          ]}
        >
          {selectedProject && (
            <div>
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                <div>
                  <Title level={4}>{selectedProject.name}</Title>
                  <Space>
                    <Tag color="blue">ID: {selectedProject.id}</Tag>
                    <Tag color="green">Key: {selectedProject.key}</Tag>
                  </Space>
                </div>

                <div>
                  <Text strong>Project Information:</Text>
                  <div style={{ marginTop: "8px" }}>
                    <Text>• Project Name: {selectedProject.name}</Text>
                    <br />
                    <Text>• Project Key: {selectedProject.key}</Text>
                    <br />
                    <Text>• Project ID: {selectedProject.id}</Text>
                  </div>
                </div>

                <div>
                  <Text type="secondary">
                    Click "Close" to return to the project list.
                  </Text>
                </div>
              </Space>
            </div>
          )}
        </Modal>
      </div>
    );
  }
}
