import { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Typography, Select, Space, Button, Card,
  Row, Col, Statistic, Tooltip, Badge, Grid,
} from 'antd';
import {
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, WarningOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { crawlAPI } from '../../api';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const STATUS_CONFIG = {
  success:  { color: 'success',    icon: <CheckCircleOutlined />,  label: 'Thành công' },
  partial:  { color: 'warning',    icon: <WarningOutlined />,      label: 'Một phần'   },
  failed:   { color: 'error',      icon: <CloseCircleOutlined />,  label: 'Thất bại'   },
  running:  { color: 'processing', icon: <LoadingOutlined spin />, label: 'Đang chạy'  },
};

const fmt = (ms) => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
};

const CrawlLogPage = () => {
  const [logs, setLogs]           = useState([]);
  const [configs, setConfigs]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filterConfig, setFilterConfig] = useState(undefined);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterConfig) params.configId = filterConfig;
      if (filterStatus) params.status   = filterStatus;
      const { data } = await crawlAPI.getAllLogs(params);
      if (data.success) {
        setLogs(data.logs);
        setPagination({ page: data.page, limit: data.limit, total: data.total });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterConfig, filterStatus]);

  const fetchConfigs = async () => {
    try {
      const { data } = await crawlAPI.getConfigs();
      setConfigs(data);
    } catch {}
  };

  useEffect(() => { fetchConfigs(); }, []);
  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  // Summary stats from current page
  const summary = logs.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    acc.inserted  += l.stats?.totalInserted || 0;
    acc.scraped   += l.stats?.totalScraped  || 0;
    return acc;
  }, { success: 0, failed: 0, partial: 0, running: 0, inserted: 0, scraped: 0 });

  const columns = [
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 130,
      render: (s) => {
        const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.running;
        return <Tag color={cfg.color} icon={cfg.icon}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Config',
      dataIndex: 'configName',
      ellipsis: true,
      render: (name, row) => (
        <div>
          <Text strong ellipsis style={{ maxWidth: isMobile ? 120 : 220, display: 'block' }}>{name}</Text>
          {row.configUrl && (
            <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
              {row.configUrl}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Kết quả',
      width: 200,
      responsive: ['md'],
      render: (_, row) => {
        const s = row.stats || {};
        return (
          <Space size={4} wrap>
            <Tag color="blue"   >Scrape: {s.totalScraped  || 0}</Tag>
            <Tag color="green"  >Thêm: {s.totalInserted  || 0}</Tag>
            <Tag color="orange" >Bỏ qua: {s.totalSkipped  || 0}</Tag>
            {s.totalFailed > 0 && <Tag color="red">Lỗi: {s.totalFailed}</Tag>}
          </Space>
        );
      },
    },
    {
      title: 'Thời gian',
      width: 160,
      responsive: ['md'],
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {row.startedAt ? new Date(row.startedAt).toLocaleString('vi-VN') : '—'}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>
            Mất {fmt(row.duration)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Trigger',
      dataIndex: 'triggeredBy',
      width: 100,
      responsive: ['lg'],
      render: (t) => {
        const map = { scheduler: 'Tự động', manual: 'Thủ công', 'run-all': 'Run All' };
        return <Tag>{map[t] || t}</Tag>;
      },
    },
    {
      title: 'Lỗi',
      dataIndex: 'error',
      ellipsis: true,
      render: (err) => err
        ? <Tooltip title={err}><Text type="danger" style={{ fontSize: 12 }}>{err}</Text></Tooltip>
        : <Text type="secondary">—</Text>,
    },
  ];

  return (
    <div style={{ padding: isMobile ? 0 : '0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Lịch sử Crawl</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchLogs(1)} loading={loading}>
          {!isMobile && 'Làm mới'}
        </Button>
      </div>

      {/* Summary cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {[
          { label: 'Thành công', value: summary.success, color: '#52c41a' },
          { label: 'Thất bại',   value: summary.failed,  color: '#ff4d4f' },
          { label: 'Đã scrape',  value: summary.scraped, color: '#1677ff' },
          { label: 'Đã lưu',     value: summary.inserted, color: '#722ed1' },
        ].map(s => (
          <Col xs={12} sm={6} key={s.label}>
            <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={s.label}
                value={s.value}
                valueStyle={{ color: s.color, fontSize: 22 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Space wrap style={{ marginBottom: 12 }}>
        <Select
          placeholder="Lọc theo config"
          allowClear
          style={{ width: isMobile ? 160 : 220 }}
          onChange={setFilterConfig}
          value={filterConfig}
        >
          {configs.map(c => (
            <Option key={c._id} value={c._id}>{c.name}</Option>
          ))}
        </Select>

        <Select
          placeholder="Lọc theo trạng thái"
          allowClear
          style={{ width: 160 }}
          onChange={setFilterStatus}
          value={filterStatus}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <Option key={k} value={k}>
              <Tag color={v.color} style={{ margin: 0 }}>{v.label}</Tag>
            </Option>
          ))}
        </Select>
      </Space>

      <Table
        rowKey="_id"
        dataSource={logs}
        columns={columns}
        loading={loading}
        size="small"
        scroll={{ x: 600 }}
        pagination={{
          current: pagination.page,
          total: pagination.total,
          pageSize: pagination.limit,
          showTotal: (t) => `${t} logs`,
          onChange: fetchLogs,
          size: isMobile ? 'small' : 'default',
        }}
        rowClassName={(r) => r.status === 'failed' ? 'row-failed' : ''}
      />
    </div>
  );
};

export default CrawlLogPage;
