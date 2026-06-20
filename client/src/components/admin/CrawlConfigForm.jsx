import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Tabs,
  Row,
  Col,
  Divider,
  Button,
  message,
  Table,
  Typography,
  Segmented,
  Empty,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  RobotOutlined,
  GlobalOutlined,
  FacebookOutlined,
} from '@ant-design/icons';
import { crawlAPI } from '../../api';

const { Title, Link } = Typography;

const CrawlConfigForm = ({ visible, onCancel, onSubmit, initialData }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [sourceType, setSourceType] = useState('website');

  useEffect(() => {
    if (visible) {
      if (initialData) {
        form.setFieldsValue(initialData);
        setSourceType(initialData.sourceType || 'website');
      } else {
        form.resetFields();
        form.setFieldsValue({
          isActive: true,
          sourceType: 'website',
          interval: 15,
          pagination: { type: 'url-param', paramName: 'page', maxPages: 5 },
        });
        setSourceType('website');
      }
      setTestResults(null);
      setActiveTab('basic');
    }
  }, [visible, initialData, form]);

  const handleSourceTypeChange = (val) => {
    setSourceType(val);
    form.setFieldValue('sourceType', val);
  };

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

  const handleAISuggest = async () => {
    const url = form.getFieldValue('url');
    if (!url) { message.warning('Vui lòng nhập URL trước khi dùng AI Helper'); return; }
    setSuggesting(true);
    try {
      const { data } = await crawlAPI.aiSuggest(url);
      if (data.success && data.suggestions) {
        const current = form.getFieldsValue();
        form.setFieldsValue({
          ...current,
          selectors: {
            ...current.selectors,
            ...data.suggestions,
            fields: { ...(current.selectors?.fields || {}), ...(data.suggestions.fields || {}) },
          },
        });
        message.success('AI đã gợi ý xong! Kiểm tra tab DOM Selectors');
        setActiveTab('selectors');
      } else {
        message.error('AI không tìm thấy gợi ý phù hợp');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi gọi AI gợi ý');
    } finally {
      setSuggesting(false);
    }
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      setActiveTab('test');
      setTestResults(null);
      const { data } = await crawlAPI.test({ url: values.url, selectors: values.selectors });
      if (data.success) {
        setTestResults(data.data);
        message.success(`Lấy được ${data.count} kết quả thử nghiệm`);
      } else {
        message.error(data.message || 'Crawl thử nghiệm thất bại');
      }
    } catch (error) {
      if (error.errorFields) {
        message.warning('Vui lòng điền đầy đủ các trường bắt buộc');
        const hasBasicError = error.errorFields.some(f => ['name', 'url'].includes(f.name[0]));
        setActiveTab(hasBasicError ? 'basic' : 'selectors');
      } else {
        message.error(error.response?.data?.message || 'Lỗi kết nối Puppeteer');
      }
    } finally {
      setTesting(false);
    }
  };

  const isFacebook = sourceType === 'facebook';

  const tabItems = [
    {
      key: 'basic',
      label: 'Thông tin cơ bản',
      children: (
        <>
          {/* Source type toggle */}
          <Form.Item name="sourceType" label="Loại nguồn">
            <Segmented
              options={[
                { label: <span><GlobalOutlined /> Website</span>, value: 'website' },
                { label: <span><FacebookOutlined /> Facebook Group</span>, value: 'facebook' },
              ]}
              onChange={handleSourceTypeChange}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label={isFacebook ? 'Tên nhóm / Nguồn' : 'Tên Website / Nguồn'}
                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              >
                <Input placeholder={isFacebook ? 'VD: FB Group BĐS HCM' : 'VD: Batdongsan.com.vn - Nhà đất bán'} />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="interval" label="Chu kỳ (phút)">
                <InputNumber min={1} max={1440} style={{ width: '100%' }} placeholder="15" />
              </Form.Item>
            </Col>
            <Col span={5}>
              <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="url"
            label={isFacebook ? 'URL Facebook Group' : 'URL Mục tiêu (Trang danh sách)'}
            rules={[{ required: true, message: 'Vui lòng nhập URL' }]}
          >
            <Input
              placeholder={
                isFacebook
                  ? 'https://www.facebook.com/groups/...'
                  : 'https://batdongsan.com.vn/nha-dat-ban'
              }
              addonAfter={
                !isFacebook && (
                  <Button
                    type="text"
                    size="small"
                    icon={<RobotOutlined />}
                    onClick={handleAISuggest}
                    loading={suggesting}
                    style={{ color: '#1890ff', border: 'none', height: 'auto', padding: '0 4px' }}
                  >
                    AI Helper
                  </Button>
                )
              }
            />
          </Form.Item>

          {isFacebook && (
            <>
              <Form.Item
                name={['pagination', 'maxPages']}
                label="Số bài đăng mỗi lần crawl"
                tooltip="Mỗi lần chạy sẽ lấy tối đa số bài này từ nhóm"
              >
                <InputNumber min={5} max={200} style={{ width: 160 }} placeholder="20" />
              </Form.Item>
              <Alert
                type="info"
                showIcon
                message="Facebook Group tự động dùng trình phân tích NLP để trích xuất địa chỉ, giá, diện tích từ nội dung bài đăng. Không cần cấu hình DOM Selectors."
                style={{ marginTop: 8 }}
              />
            </>
          )}

          {!isFacebook && (
            <Form.Item
              name={['pagination', 'maxPages']}
              label="Số trang tối đa"
            >
              <InputNumber min={1} max={50} style={{ width: 160 }} placeholder="5" />
            </Form.Item>
          )}
        </>
      ),
    },
    ...(!isFacebook
      ? [
          {
            key: 'selectors',
            label: 'DOM Selectors',
            children: (
              <>
                <Row gutter={16}>
                  <Col span={12}>
                    <Title level={5}>Container Selectors</Title>
                    <Form.Item name={['selectors', 'listContainer']} label="List Container">
                      <Input placeholder=".product-list" />
                    </Form.Item>
                    <Form.Item
                      name={['selectors', 'itemSelector']}
                      label="Item Selector"
                      rules={[{ required: true, message: 'Cần Item selector' }]}
                    >
                      <Input placeholder=".js-item-card" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Title level={5}>Pagination</Title>
                    <Form.Item name={['pagination', 'type']} label="Loại phân trang">
                      <Input disabled defaultValue="URL Parameter" />
                    </Form.Item>
                    <Form.Item name={['pagination', 'paramName']} label="Tên tham số">
                      <Input placeholder="page" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Divider orientation="left">1. Địa chỉ & Thời gian</Divider>
                    <Form.Item name={['selectors', 'fields', 'address']} label="Địa chỉ đầy đủ">
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
                    <Form.Item name={['selectors', 'fields', 'publishedDate']} label="Ngày đăng">
                      <Input placeholder=".re__card-published-date" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Divider orientation="left">2. Thông tin BĐS</Divider>
                    <Form.Item name={['selectors', 'fields', 'title']} label="Tiêu đề">
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
                    <Form.Item name={['selectors', 'fields', 'wc']} label="Số WC">
                      <Input placeholder=".re__card-config-toilet" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Divider orientation="left">3. Pháp lý</Divider>
                    <Form.Item name={['selectors', 'fields', 'legal']} label="Tình trạng pháp lý">
                      <Input placeholder=".re__card-legal" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Divider orientation="left">4. Thông tin khác</Divider>
                    <Form.Item name={['selectors', 'fields', 'phone']} label="Số điện thoại">
                      <Input placeholder=".re__card-contact-phone" />
                    </Form.Item>
                    <Form.Item name={['selectors', 'fields', 'revealPhoneSelector']} label="Nút hiện số ĐT">
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
              </>
            ),
          },
          {
            key: 'test',
            label: 'Test Preview',
            children: (
              <div style={{ minHeight: 300 }}>
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
                        render: (addr) =>
                          `${addr?.street ? addr.street + ', ' : ''}${addr?.ward ? addr.ward + ', ' : ''}${addr?.district ? addr.district + ', ' : ''}${addr?.city || addr?.fullAddress || ''}`,
                      },
                      { title: 'Ngày đăng', dataIndex: 'publishedDate', key: 'publishedDate' },
                      {
                        title: 'Link',
                        dataIndex: 'detailLink',
                        key: 'detailLink',
                        render: (link) => <Link href={link} target="_blank">Xem nguồn</Link>,
                      },
                    ]}
                    pagination={false}
                    size="small"
                    rowKey={(_, i) => i}
                  />
                ) : (
                  <Empty description="Nhấn nút 'Test Crawl' để xem trước kết quả" style={{ marginTop: 50 }} />
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Modal
      title={initialData ? 'Chỉnh sửa cấu hình' : 'Thêm nguồn Crawl mới'}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>Hủy</Button>,
        ...(!isFacebook
          ? [
              <Button
                key="test"
                icon={<PlayCircleOutlined />}
                onClick={handleTest}
                loading={testing}
                style={{ backgroundColor: '#faad14', color: 'white', borderColor: '#faad14' }}
              >
                Test Crawl
              </Button>,
            ]
          : []),
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={() => form.submit()}
          loading={submitting}
        >
          Lưu cấu hình
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </Modal>
  );
};

export default CrawlConfigForm;
