import React from 'react';
import { Form, Input, Select, InputNumber, Button, Space, Row, Col } from 'antd';

const { Option } = Select;

const PROVINCES = ['Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng'];
const DISTRICTS = {
  'Hồ Chí Minh': ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 7', 'Bình Thạnh'],
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Đống Đa'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê']
};

const PropertyFilters = ({ onFilter }) => {
  const [form] = Form.useForm();
  const province = Form.useWatch('province', form);

  const handleFinish = (values) => {
    onFilter(values);
  };

  const handleReset = () => {
    form.resetFields();
    onFilter({});
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      style={{ marginBottom: 24, padding: 24, background: '#fafafa', borderRadius: 8 }}
    >
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="search" label="Tìm kiếm">
            <Input placeholder="Nhập địa chỉ, từ khóa..." allowClear />
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Form.Item name="province" label="Tỉnh/Thành phố">
            <Select placeholder="Chọn tỉnh/thành" allowClear onChange={() => form.setFieldsValue({ district: undefined })}>
              {PROVINCES.map(p => <Option key={p} value={p}>{p}</Option>)}
            </Select>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Form.Item name="district" label="Quận/Huyện">
            <Select placeholder="Chọn quận/huyện" allowClear disabled={!province}>
              {province && DISTRICTS[province]?.map(d => <Option key={d} value={d}>{d}</Option>)}
            </Select>
          </Form.Item>
        </Col>
        
        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Khoảng giá (Triệu VNĐ)">
            <Input.Group compact>
              <Form.Item name="minPrice" noStyle>
                <InputNumber style={{ width: '45%', textAlign: 'center' }} placeholder="Tối thiểu" />
              </Form.Item>
              <Input
                style={{ width: '10%', borderLeft: 0, borderRight: 0, pointerEvents: 'none', background: 'transparent' }}
                placeholder="-"
                disabled
              />
              <Form.Item name="maxPrice" noStyle>
                <InputNumber style={{ width: '45%', textAlign: 'center', borderLeft: 0 }} placeholder="Tối đa" />
              </Form.Item>
            </Input.Group>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Form.Item label="Diện tích (m²)">
            <Input.Group compact>
              <Form.Item name="minArea" noStyle>
                <InputNumber style={{ width: '45%', textAlign: 'center' }} placeholder="Tối thiểu" />
              </Form.Item>
              <Input
                style={{ width: '10%', borderLeft: 0, borderRight: 0, pointerEvents: 'none', background: 'transparent' }}
                placeholder="-"
                disabled
              />
              <Form.Item name="maxArea" noStyle>
                <InputNumber style={{ width: '45%', textAlign: 'center', borderLeft: 0 }} placeholder="Tối đa" />
              </Form.Item>
            </Input.Group>
          </Form.Item>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Form.Item name="sort" label="Sắp xếp">
            <Select placeholder="Mặc định (Mới nhất)" allowClear>
              <Option value="date_asc">Cũ nhất</Option>
              <Option value="price_asc">Giá tăng dần</Option>
              <Option value="price_desc">Giá giảm dần</Option>
              <Option value="area_desc">Diện tích lớn nhất</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row>
        <Col span={24} style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={handleReset}>Xóa bộ lọc</Button>
            <Button type="primary" htmlType="submit">
              Áp dụng
            </Button>
          </Space>
        </Col>
      </Row>
    </Form>
  );
};

export default PropertyFilters;
