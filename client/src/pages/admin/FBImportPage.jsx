import { useState } from 'react';
import {
  Card, Input, Button, Table, Tag, Typography, Space, Form,
  InputNumber, Collapse, Badge, Alert, Statistic, Row, Col, Tooltip, message,
} from 'antd';
import {
  FacebookOutlined, SearchOutlined, SaveOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EditOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const DEFAULT_GROUP = 'https://www.facebook.com/groups/183134592371580/';

const formatPrice = (val) => {
  if (!val) return '—';
  return val >= 1000 ? `${(val / 1000).toFixed(2)} tỷ` : `${val} triệu`;
};

export default function FBImportPage() {
  const [groupUrl, setGroupUrl]   = useState(DEFAULT_GROUP);
  const [limit, setLimit]         = useState(10);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [previews, setPreviews]   = useState([]);
  const [selected, setSelected]   = useState([]);
  const [saveResult, setSaveResult] = useState(null);

  const handlePreview = async () => {
    if (!groupUrl.trim()) return;
    setLoading(true);
    setSaveResult(null);
    setPreviews([]);
    setSelected([]);
    try {
      const res = await fetch('/api/crawl/fb-group/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ groupUrl, limit }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      const withKeys = json.data.map((d, i) => ({ ...d, _key: i }));
      setPreviews(withKeys);
      setSelected(withKeys.map(d => d._key));
      message.success(`Lấy được ${json.count} bài từ group`);
    } catch (err) {
      message.error(err.message || 'Crawl thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const items = previews.filter(p => selected.includes(p._key));
    if (!items.length) { message.warning('Chưa chọn bài nào để lưu'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/crawl/fb-group/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      setSaveResult(json.stats);
      message.success(`Đã lưu ${json.stats.inserted} BĐS`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Tiêu đề / Mô tả',
      dataIndex: 'title',
      key: 'title',
      width: '35%',
      render: (text, record) => (
        <Space direction="vertical" size={2}>
          <Text strong ellipsis={{ tooltip: text }} style={{ maxWidth: 280 }}>{text || '(Chưa có tiêu đề)'}</Text>
          {record.address?.fullAddress && (
            <Text type="secondary" style={{ fontSize: 12 }}>📍 {record.address.fullAddress}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      width: 110,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={r.transactionType === 'rent' ? 'blue' : 'green'}>
            {r.transactionType === 'rent' ? 'Cho thuê' : 'Bán'}
          </Tag>
          <Tag>{r.propertyType || 'Nhà'}</Tag>
        </Space>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'rawPrice',
      key: 'rawPrice',
      width: 110,
      render: (v, r) => (
        <Space direction="vertical" size={2}>
          <Text>{formatPrice(v)}</Text>
          {r.rawPricePerM2 && <Text type="secondary" style={{ fontSize: 11 }}>{r.rawPricePerM2} tr/m²</Text>}
        </Space>
      ),
    },
    {
      title: 'Diện tích',
      dataIndex: 'rawArea',
      key: 'rawArea',
      width: 80,
      render: v => v ? `${v} m²` : '—',
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 110,
      render: v => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Pháp lý',
      dataIndex: 'legal',
      key: 'legal',
      width: 90,
      render: v => v || '—',
    },
    {
      title: 'Post',
      key: 'sourceUrl',
      width: 60,
      render: (_, r) =>
        r.sourceUrl ? (
          <Tooltip title="Xem bài gốc">
            <a href={r.sourceUrl} target="_blank" rel="noreferrer">
              <FacebookOutlined style={{ color: '#1877f2', fontSize: 18 }} />
            </a>
          </Tooltip>
        ) : '—',
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Title level={4} style={{ margin: 0 }}>
        <FacebookOutlined style={{ color: '#1877f2', marginRight: 8 }} />
        Import từ Facebook Group
      </Title>

      {/* Config */}
      <Card>
        <Space wrap>
          <Input
            prefix={<FacebookOutlined style={{ color: '#1877f2' }} />}
            placeholder="URL Facebook Group"
            value={groupUrl}
            onChange={e => setGroupUrl(e.target.value)}
            style={{ width: 420 }}
          />
          <InputNumber
            min={1} max={30} value={limit}
            onChange={setLimit}
            addonBefore="Số bài"
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handlePreview}
          >
            {loading ? 'Đang crawl...' : 'Crawl Group'}
          </Button>
        </Space>

        {loading && (
          <Alert
            style={{ marginTop: 12 }}
            type="info"
            message="Browser đang mở và đăng nhập Facebook. Lần đầu có thể mất 30-60 giây..."
            showIcon
          />
        )}
      </Card>

      {/* Results */}
      {previews.length > 0 && (
        <Card
          title={
            <Space>
              <Text strong>Kết quả ({previews.length} bài)</Text>
              <Badge count={selected.length} color="green" />
              <Text type="secondary">bài được chọn</Text>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!selected.length}
              onClick={handleSave}
            >
              Lưu {selected.length} BĐS
            </Button>
          }
        >
          <Table
            rowKey="_key"
            columns={columns}
            dataSource={previews}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: setSelected,
            }}
            expandable={{
              expandedRowRender: record => (
                <Paragraph
                  style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', margin: 0, fontSize: 13 }}
                >
                  {record.description}
                </Paragraph>
              ),
            }}
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
          />
        </Card>
      )}

      {/* Save result */}
      {saveResult && (
        <Card>
          <Row gutter={24}>
            <Col>
              <Statistic title="Đã lưu" value={saveResult.inserted}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
            </Col>
            <Col>
              <Statistic title="Trùng (bỏ qua)" value={saveResult.skipped}
                prefix={<CloseCircleOutlined style={{ color: '#faad14' }} />} />
            </Col>
            <Col>
              <Statistic title="Lỗi" value={saveResult.failed}
                prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />} />
            </Col>
          </Row>
        </Card>
      )}
    </Space>
  );
}
