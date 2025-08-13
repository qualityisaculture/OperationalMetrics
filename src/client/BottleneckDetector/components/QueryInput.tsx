import React from 'react';
import { Input, Button, Space, Card } from 'antd';
import { SearchOutlined, ClearOutlined } from '@ant-design/icons';
import { DEFAULT_JQL_QUERY } from '../constants';

const { TextArea } = Input;

interface QueryInputProps {
  query: string;
  onQueryChange: (query: string) => void;
  onExecute: () => void;
  onClear: () => void;
  isLoading: boolean;
}

export const QueryInput: React.FC<QueryInputProps> = ({
  query,
  onQueryChange,
  onExecute,
  onClear,
  isLoading
}) => {
  const handleUseDefault = () => {
    onQueryChange(DEFAULT_JQL_QUERY);
  };

  return (
    <Card title="JQL Query" style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <TextArea
          rows={3}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Enter your JQL query here..."
          disabled={isLoading}
        />
        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onExecute}
            loading={isLoading}
            disabled={!query.trim()}
          >
            Execute Query
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            disabled={isLoading}
          >
            Clear
          </Button>
          <Button
            onClick={handleUseDefault}
            disabled={isLoading}
          >
            Use Default Query
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
