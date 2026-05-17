import { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Switch, 
  Tabs, 
  Row, 
  Col, 
  Divider, 
  Button, 
  message,
  Table,
  Typography,
  Space,
  Empty
} from 'antd';
import { PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { crawlAPI } from '../../api';

const { Title, Text, Link } = Typography;

const CrawlConfigForm = ({ visible, onCancel, onSubmit, initialData }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
          sourceType: 'website',
          pagination: {
            type: 'url-param',
            paramName: 'page',
            maxPages: 5
          }
        });
      }
      setTestResults(null);
      setActiveTab('basic');
    }
  }, [visible, initialData, form]);

  const handleFinish = async (values) => {
    setSubmitting(true);
    try {
      if (initialData) {
        await crawlAPI.updateConfig(initialData._id, values);
        message.success('Đã cập nhật cấu hình');
      } else {
        await crawlAPI.createConfig(values);
        message.success('Đã tạo cấu hình mới');
      }
      onSubmit();
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTest = async () => {
    try {
      // Validate only visible fields or all fields
      const values = await form.validateFields();
      
      setTesting(true);
      setActiveTab('test');
      setTestResults(null);
      
      const { data } = await crawlAPI.test({
        url: values.url,
        selectors: values.selectors
      });

      if (data.success) {
        setTestResults(data.data);
        message.success(`Đã lấy được ${data.count} kết quả thử nghiệm`);
      } else {
        message.error(data.message || 'Crawl thử nghiệm thất bại');
      }
    } catch (error) {
      // Check if it's a validation error (no error.response) or an API error
      if (error.errorFields) {
        message.warning('Vui lòng điền đầy đủ các trường bắt buộc (URL và Item Selector)');
        // Automatically switch to the tab with errors if needed
        const hasBasicError = error.errorFields.some(f => ['name', 'url'].includes(f.name[0]));
        if (hasBasicError) setActiveTab('basic');
        else setActiveTab('selectors');
      } else {
        console.error('Test API Error:', error);
        message.error(error.response?.data?.message || 'Lỗi hệ thống khi kết nối tới Puppeteer');
      }
    } finally {
      setTesting(false);
    }
  };

  const testColumns = [
    { title: 'Giá', dataIndex: 'price', key: 'price' },
    { title: 'Diện tích', dataIndex: 'area', key: 'area' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { 
      title: 'Link', 
      dataIndex: 'detailLink', 
      key: 'detailLink',
      render: link => <Link href={link} target="_blank">Xem nguồn</Link>
    },
  ];

  return (
    <Modal
      title={initialData ? 'Chỉnh sửa cấu hình' : 'Thêm nguồn Crawl mới'}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        <Button 
          key="test" 
          icon={<PlayCircleOutlined />} 
          onClick={handleTest}
          loading={testing}
          style={{ backgroundColor: '#faad14', color: 'white', borderColor: '#faad14' }}
        >
          Test Crawl
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={() => form.submit()}
          loading={submitting}
        >
          Lưu cấu hình
        </Button>
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="Thông tin cơ bản" key="basic">
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="name"
                  label="Tên Website/Nguồn"
                  rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                  <Input placeholder="Ví dụ: Batdongsan.com.vn - Nhà đất bán" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                  <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="url"
              label="URL Mục tiêu (Trang danh sách)"
              rules={[{ required: true, message: 'Vui lòng nhập URL' }]}
            >
              <Input placeholder="https://batdongsan.com.vn/nha-dat-ban" />
            </Form.Item>
          </Tabs.TabPane>

          <Tabs.TabPane tab="DOM Selectors" key="selectors">
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>Container Selectors</Title>
                <Form.Item
                  name={['selectors', 'listContainer']}
                  label="List Container (Bao quanh toàn bộ danh sách)"
                >
                  <Input placeholder=".product-list" />
                </Form.Item>
                <Form.Item
                  name={['selectors', 'itemSelector']}
                  label="Item Selector (Đại diện cho 1 tin đăng)"
                  rules={[{ required: true, message: 'Cần Item selector' }]}
                >
                  <Input placeholder=".js-item-card" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Title level={5}>Bổ trợ (Pagination)</Title>
                <Form.Item name={['pagination', 'type']} label="Loại phân trang">
                  <Input disabled value="URL Parameter" />
                </Form.Item>
                <Form.Item name={['pagination', 'paramName']} label="Tên tham số (VD: page, p)">
                  <Input placeholder="page" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Divider orientation="left">1. Địa chỉ & Thời gian</Divider>
                <Form.Item name={['selectors', 'fields', 'address']} label="Địa chỉ đầy đủ (Chuỗi text)">
                  <Input placeholder=".re__card-location" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'street']} label="Tên đường">
                  <Input placeholder=".re__card-street" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'ward']} label="Phường/Xã">
                  <Input placeholder=".re__card-ward" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'district']} label="Quận/Huyện">
                  <Input placeholder=".re__card-district" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'city']} label="Tỉnh/Thành phố">
                  <Input placeholder=".re__card-city" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'publishedDate']} label="Ngày đăng tin">
                  <Input placeholder=".re__card-published-date" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Divider orientation="left">2. Thông tin BĐS</Divider>
                <Form.Item name={['selectors', 'fields', 'title']} label="Tiêu đề tin đăng">
                  <Input placeholder=".re__card-title" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'price']} label="Giá niêm yết">
                  <Input placeholder=".re__card-config-price" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'pricePerM2']} label="Giá / m²">
                  <Input placeholder=".re__card-config-price-per-m2" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'area']} label="Diện tích">
                  <Input placeholder=".re__card-config-area" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'bedrooms']} label="Số phòng ngủ">
                  <Input placeholder=".re__card-config-bedroom" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'wc']} label="Số phòng vệ sinh (WC)">
                  <Input placeholder=".re__card-config-toilet" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Divider orientation="left">3. Pháp lý</Divider>
                <Form.Item name={['selectors', 'fields', 'legal']} label="Tình trạng pháp lý (Sổ đỏ/hồng)">
                  <Input placeholder=".re__card-legal" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Divider orientation="left">4. Thông tin khác</Divider>
                <Form.Item 
                  name={['selectors', 'fields', 'phone']} 
                  label="Số điện thoại"
                  tooltip="Element chứa số điện thoại"
                >
                  <Input placeholder=".re__card-contact-phone" />
                </Form.Item>
                <Form.Item 
                  name={['selectors', 'fields', 'revealPhoneSelector']} 
                  label="Nút hiện số ĐT"
                  tooltip="Selector nút để Click hiện số"
                >
                  <Input placeholder=".btn-reveal" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'description']} label="Mô tả">
                  <Input placeholder=".re__card-description" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'images']} label="Selector Ảnh">
                  <Input placeholder=".re__card-image img" />
                </Form.Item>
                <Form.Item name={['selectors', 'fields', 'detailLink']} label="Link chi tiết">
                  <Input placeholder="a" />
                </Form.Item>
              </Col>
            </Row>
          </Tabs.TabPane>

          <Tabs.TabPane tab="Test Preview" key="test">
            <div style={{ minHeight: '300px' }}>
              {testing ? (
                <div style={{ textAlign: 'center', marginTop: 50 }}>
                  <PlayCircleOutlined spin style={{ fontSize: 40, color: '#faad14' }} />
                  <div style={{ marginTop: 16 }}>Đang chạy Puppeteer để extract dữ liệu...</div>
                </div>
              ) : testResults ? (
                <Table 
                  dataSource={testResults} 
                  columns={[
                    { title: 'Giá', dataIndex: 'price', key: 'price' },
                    { title: 'Diện tích', dataIndex: 'area', key: 'area' },
                    { 
                      title: 'Địa chỉ chi tiết', 
                      dataIndex: 'address', 
                      key: 'address',
                      render: (addr) => (
                        <span>
                          {addr.street ? `${addr.street}, ` : ''}
                          {addr.ward ? `${addr.ward}, ` : ''}
                          {addr.district ? `${addr.district}, ` : ''}
                          {addr.city || addr.fullAddress || ''}
                        </span>
                      )
                    },
                    { title: 'Ngày đăng', dataIndex: 'publishedDate', key: 'publishedDate' },
                    { 
                      title: 'Link', 
                      dataIndex: 'detailLink', 
                      key: 'detailLink',
                      render: link => <Link href={link} target="_blank">Xem nguồn</Link>
                    },
                  ]} 
                  pagination={false} 
                  size="small"
                  rowKey={(record, index) => index}
                />
              ) : (
                <Empty description="Nhấn nút 'Test Crawl' để xem trước kết quả" style={{ marginTop: 50 }} />
              )}
            </div>
          </Tabs.TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default CrawlConfigForm;
