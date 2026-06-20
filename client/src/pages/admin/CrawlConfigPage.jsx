import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Card,
  Typography,
  message,
  Popconfirm,
  Tooltip,
  Drawer,
  Badge,
  Switch,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  FacebookOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { crawlAPI } from '../../api';
import CrawlConfigForm from '../../components/admin/CrawlConfigForm';

const { Title, Text } = Typography;

const STATUS_COLOR = {
  success: 'success',
  partial: 'warning',
  failed: 'error',
  running: 'processing',
};

const STATUS_LABEL = {
  success: 'Thành công',
  partial: 'Một phần',
  failed: 'Thất bại',
  running: 'Đang chạy',
};

const formatInterval = (minutes) => {
  if (!minutes) return '15 phút';
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}p` : `${h} giờ`;
};

const CrawlConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningIds, setRunningIds] = useState(new Set());
  const [runningAll, setRunningAll] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [logDrawer, setLogDrawer] = useState({ open: false, config: null, logs: [], loading: false });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await crawlAPI.getConfigs();
      setConfigs(data);
    } catch {
      message.error('Không thể tải danh sách cấu hình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = async (record) => {
    setTogglingIds((prev) => new Set(prev).add(record._id));
    try {
      await crawlAPI.updateConfig(record._id, { isActive: !record.isActive });
      message.success(record.isActive ? 'Đã tạm dừng' : 'Đã kích hoạt');
      fetchConfigs();
    } catch {
      message.error('Không thể thay đổi trạng thái');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(record._id);
        return next;
      });
    }
  };

  const handleRun = async (record) => {
    setRunningIds((prev) => new Set(prev).add(record._id));
    try {
      const { data } = await crawlAPI.runConfig(record._id);
      const { stats, status } = data;
      if (status === 'success' || status === 'partial') {
        message.success(
          `Crawl xong: ${stats.totalInserted} mới, ${stats.totalUpdated} cập nhật, ${stats.totalSkipped} bỏ qua`
        );
      } else {
        message.error('Crawl thất bại — kiểm tra log để biết thêm');
      }
      fetchConfigs();
    } catch (err) {
      message.error(err?.response?.data?.message || 'Lỗi khi chạy crawl');
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(record._id);
        return next;
      });
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    try {
      const { data } = await crawlAPI.runAll();
      const s = data.summary;
      message.success(
        `Hoàn tất ${data.configsRun} nguồn: ${s.totalInserted} mới, ${s.totalUpdated} cập nhật, ${s.totalFailed} lỗi`
      );
      fetchConfigs();
    } catch {
      message.error('Lỗi khi chạy tất cả');
    } finally {
      setRunningAll(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await crawlAPI.deleteConfig(id);
      message.success('Đã xóa cấu hình');
      fetchConfigs();
    } catch {
      message.error('Lỗi khi xóa cấu hình');
    }
  };

  const openLogs = async (record) => {
    setLogDrawer({ open: true, config: record, logs: [], loading: true });
    try {
      const { data } = await crawlAPI.getLogs(record._id, { limit: 30 });
      setLogDrawer((prev) => ({ ...prev, logs: data.logs, loading: false }));
    } catch {
      setLogDrawer((prev) => ({ ...prev, loading: false }));
      message.error('Không thể tải lịch sử crawl');
    }
  };

  const columns = [
    {
      title: 'Tên / URL',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            {record.sourceType === 'facebook'
              ? <FacebookOutlined style={{ color: '#1877f2' }} />
              : <GlobalOutlined style={{ color: '#52c41a' }} />}
            <Text strong>{text}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.url}</Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      align: 'center',
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          loading={togglingIds.has(record._id)}
          onChange={() => handleToggle(record)}
          checkedChildren="Bật"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Chu kỳ',
      dataIndex: 'interval',
      key: 'interval',
      align: 'center',
      render: (interval) => (
        <Tag color="blue">{formatInterval(interval)}</Tag>
      ),
    },
    {
      title: 'Lần cuối crawl',
      dataIndex: 'lastCrawledAt',
      key: 'lastCrawledAt',
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : <Text type="secondary">Chưa chạy</Text>,
    },
    {
      title: 'Tổng đã crawl',
      dataIndex: 'totalCrawled',
      key: 'totalCrawled',
      align: 'center',
      render: (n) => <Text strong>{n ?? 0}</Text>,
    },
    {
      title: 'Lỗi gần nhất',
      dataIndex: 'lastError',
      key: 'lastError',
      render: (err) =>
        err ? (
          <Tooltip title={err}>
            <Tag color="error" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {err.slice(0, 40)}{err.length > 40 ? '…' : ''}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Mở link gốc">
            <Button
              size="small"
              icon={<LinkOutlined />}
              href={record.url}
              target="_blank"
              rel="noopener noreferrer"
            />
          </Tooltip>
          <Tooltip title="Chạy ngay">
            <Button
              type="primary"
              ghost
              size="small"
              icon={<PlayCircleOutlined />}
              loading={runningIds.has(record._id)}
              onClick={() => handleRun(record)}
            />
          </Tooltip>
          <Tooltip title="Lịch sử crawl">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={() => openLogs(record)}
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => { setCurrentConfig(record); setModalVisible(true); }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa cấu hình này?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const logColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d) => new Date(d).toLocaleString('vi-VN'),
    },
    {
      title: 'Kết quả',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Badge status={STATUS_COLOR[s]} text={STATUS_LABEL[s] || s} />,
    },
    {
      title: 'Scraped',
      dataIndex: ['stats', 'totalScraped'],
      key: 'scraped',
      align: 'center',
    },
    {
      title: 'Mới',
      dataIndex: ['stats', 'totalInserted'],
      key: 'inserted',
      align: 'center',
      render: (n) => <Text style={{ color: '#52c41a' }}>{n}</Text>,
    },
    {
      title: 'Cập nhật',
      dataIndex: ['stats', 'totalUpdated'],
      key: 'updated',
      align: 'center',
    },
    {
      title: 'Lỗi',
      dataIndex: ['stats', 'totalFailed'],
      key: 'failed',
      align: 'center',
      render: (n) => n > 0 ? <Text type="danger">{n}</Text> : n,
    },
    {
      title: 'Thời lượng',
      dataIndex: 'duration',
      key: 'duration',
      render: (ms) => ms ? `${(ms / 1000).toFixed(1)}s` : '—',
    },
    {
      title: 'Trigger',
      dataIndex: 'triggeredBy',
      key: 'triggeredBy',
      render: (t) => {
        const map = { scheduler: ['blue', 'Auto'], manual: ['green', 'Thủ công'], 'run-all': ['purple', 'Run All'] };
        const [color, label] = map[t] || ['default', t];
        return <Tag color={color}>{label}</Tag>;
      },
    },
  ];

  const activeCount = configs.filter((c) => c.isActive).length;

  return (
    <div>
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'flex-start' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Cấu hình Crawl Engine</Title>
            <Text type="secondary">Quản lý nguồn dữ liệu và lịch tự động crawl</Text>
          </div>
          <Space>
            <Button
              icon={<ThunderboltOutlined />}
              loading={runningAll}
              onClick={handleRunAll}
              disabled={activeCount === 0}
            >
              Chạy tất cả ({activeCount})
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setCurrentConfig(null); setModalVisible(true); }}
            >
              Thêm nguồn mới
            </Button>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic title="Tổng nguồn" value={configs.length} />
          </Col>
          <Col span={6}>
            <Statistic title="Đang hoạt động" value={activeCount} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic
              title="Tổng đã crawl"
              value={configs.reduce((s, c) => s + (c.totalCrawled || 0), 0)}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="Có lỗi"
              value={configs.filter((c) => c.lastError).length}
              valueStyle={{ color: configs.some((c) => c.lastError) ? '#ff4d4f' : undefined }}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={configs}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <CrawlConfigForm
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={() => { setModalVisible(false); fetchConfigs(); }}
        initialData={currentConfig}
      />

      <Drawer
        title={
          <Space>
            <HistoryOutlined />
            <span>Lịch sử crawl — {logDrawer.config?.name}</span>
          </Space>
        }
        open={logDrawer.open}
        onClose={() => setLogDrawer((prev) => ({ ...prev, open: false }))}
        width={900}
        destroyOnClose
      >
        <Table
          columns={logColumns}
          dataSource={logDrawer.logs}
          rowKey="_id"
          loading={logDrawer.loading}
          size="small"
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'Chưa có lịch sử crawl' }}
        />
      </Drawer>
    </div>
  );
};

export default CrawlConfigPage;
