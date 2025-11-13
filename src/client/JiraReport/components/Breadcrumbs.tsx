import React from "react";
import { Breadcrumb, Button, Tooltip } from "antd";
import {
  HomeOutlined,
  ProjectOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

interface Props {
  navigationStack: Array<{
    type: "project" | "issue";
    key: string;
    name: string;
  }>;
  handleBreadcrumbClick: (index: number) => void;
}

export const Breadcrumbs: React.FC<Props> = ({
  navigationStack,
  handleBreadcrumbClick,
}) => {
  return (
    <div style={{ marginBottom: "16px" }}>
      <Breadcrumb>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<HomeOutlined />}
            onClick={() => handleBreadcrumbClick(-1)}
            style={{ padding: 0, height: "auto" }}
          >
            Projects
          </Button>
        </Breadcrumb.Item>
        {navigationStack.map((item, index) => (
          <Breadcrumb.Item key={item.key}>
            <Tooltip title={item.key}>
              <Button
                type="link"
                onClick={() => handleBreadcrumbClick(index)}
                style={{ padding: 0, height: "auto" }}
              >
                {item.type === "project" ? (
                  <ProjectOutlined style={{ marginRight: "4px" }} />
                ) : (
                  <InfoCircleOutlined style={{ marginRight: "4px" }} />
                )}
                {item.name}
              </Button>
            </Tooltip>
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
    </div>
  );
};
