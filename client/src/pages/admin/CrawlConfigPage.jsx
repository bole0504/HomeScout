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
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { crawlAPI } from '../../api';
import CrawlConfigForm from '../../components/admin/CrawlConfigForm';

const { Title, Text } = Typography;

const CrawlConfigPage = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await crawlAPI.getConfigs();
      setConfigs(data);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải danh sách cấu hình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleAdd = () => {
    setCurrentConfig(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setCurrentConfig(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await crawlAPI.deleteConfig(id);
      message.success('Đã xóa cấu hình');
      fetchConfigs();
    } catch (error) {
      message.error('Lỗi khi xóa cấu hình');
    }
  };

  const columns = [
    {
      title: 'Tên Website',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" size="small" style={{ fontSize: '12px' }}>{record.url}</Text>
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Đang hoạt động' : 'Tạm dừng'}
        </Tag>
      )
    },
    {
      title: 'Lần cuối crawl',
      dataIndex: 'lastCrawledAt',
      key: 'lastCrawledAt',
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : 'Chưa chạy'
    },
    {
      title: 'Tổng số data',
      dataIndex: 'totalCrawled',
      key: 'totalCrawled',
      align: 'center'
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa cấu hình">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="Test Crawl (Preview)">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              style={{ color: '#faad14' }}
              onClick={() => handleEdit(record)} // For now, edit modal allows testing
            />
          </Tooltip>
          <Tooltip title="Dừng/Chạy Scheduler">
            <Button 
              type="text" 
              icon={<PlayCircleOutlined />} 
              style={{ color: '#52c41a' }}
              disabled
            />
          </Tooltip>
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record._id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card bordered={false}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>Cấu hình Crawl Engine</Title>
            <Text type="secondary">Quản lý danh sách website và mapping dữ liệu</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            size="large"
          >
            Thêm Nguồn mới
          </Button>
        </div>

        <Table 
          columns={columns} 
          dataSource={configs} 
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <CrawlConfigForm
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSubmit={() => {
          setModalVisible(false);
          fetchConfigs();
        }}
        initialData={currentConfig}
      />
    </div>
  );
};

export default CrawlConfigPage;
