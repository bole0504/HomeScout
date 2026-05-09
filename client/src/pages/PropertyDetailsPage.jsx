import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Typography, Space, Tag, Button, 
  Carousel, Divider, Input, message, Spin, Empty 
} from 'antd';
import { 
  EnvironmentOutlined, 
  HomeOutlined, 
  CompressOutlined, 
  CheckCircleOutlined,
  ArrowLeftOutlined,
  PhoneOutlined,
  CalendarOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { propertiesAPI, bookmarksAPI } from '../api';
import BookmarkButton from '../components/properties/BookmarkButton';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const res = await propertiesAPI.getById(id);
      if (res.data.success) {
        const propData = res.data.data;
        setProperty(propData);
        setNote(propData.bookmarkNote || '');
      }
    } catch (error) {
      console.error('Failed to fetch property details:', error);
      message.error('Không thể tải thông tin bất động sản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      const res = await bookmarksAPI.updateNote(id, note);
      if (res.data.success) {
        message.success('Đã lưu ghi chú');
        // Refresh to ensure isBookmarked state is correct if it was an auto-bookmark
        if (!property.isBookmarked) {
          fetchProperty();
        }
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      message.error('Không thể lưu ghi chú');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Đang tải thông tin..." />
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ padding: '48px' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
          Quay lại
        </Button>
        <Empty description="Không tìm thấy bất động sản này" />
      </div>
    );
  }

  const {
    address,
    totalPrice,
    area,
    images,
    description,
    land,
    building,
    legal,
    location,
    amenities,
    dataCompletenessScore,
    goodPrice,
    goodPricePercent,
    phone,
    createdAt
  } = property;

  const fallbackImage = 'https://via.placeholder.com/800x400?text=No+Image';
  const displayImages = images && images.length > 0 ? images : [fallbackImage];

  return (
    <div style={{ padding: '24px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        Quay lại danh sách
      </Button>

      <Row gutter={[24, 24]}>
        {/* Main Column */}
        <Col xs={24} lg={16}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {/* Card 1: Images and Basic Info */}
            <Card bodyStyle={{ padding: 0 }} overflow="hidden">
              <Carousel autoplay effect="fade">
                {displayImages.map((img, idx) => (
                  <div key={idx}>
                    <img 
                      src={img} 
                      alt={`property-${idx}`} 
                      style={{ width: '100%', height: '400px', objectFit: 'cover' }} 
                    />
                  </div>
                ))}
              </Carousel>
              
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
                    {address?.fullAddress || `${address?.street}, ${address?.ward}, ${address?.district}`}
                  </Title>
                  <BookmarkButton 
                    propertyId={property._id} 
                    initialIsBookmarked={property.isBookmarked} 
                    initialCount={property.bookmarkCount} 
                  />
                </div>

                <Space size={16} style={{ marginBottom: 16 }}>
                  <Title level={3} style={{ color: '#cf1322', margin: 0 }}>
                    {totalPrice ? `${totalPrice / 1000} Tỷ` : 'Thỏa thuận'}
                  </Title>
                  {goodPrice && (
                    <Tag color="success" style={{ fontSize: '14px', paddingTop: '2px', paddingBottom: '2px' }}>
                      Giá Hời {-goodPricePercent}%
                    </Tag>
                  )}
                  <Tag icon={<CheckCircleOutlined />} color={dataCompletenessScore > 80 ? "green" : "gold"}>
                    Độ tin cậy: {dataCompletenessScore || 0}%
                  </Tag>
                </Space>

                <Row gutter={24}>
                  <Col span={8}>
                    <Space size={4} direction="vertical">
                      <Text type="secondary"><CompressOutlined /> Diện tích</Text>
                      <Text strong>{area || land?.actualArea} m²</Text>
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space size={4} direction="vertical">
                      <Text type="secondary"><CalendarOutlined /> Ngày đăng</Text>
                      <Text strong>{new Date(createdAt).toLocaleDateString('vi-VN')}</Text>
                    </Space>
                  </Col>
                  <Col span={8}>
                    <Space size={4} direction="vertical">
                      <Text type="secondary"><EnvironmentOutlined /> Khu vực</Text>
                      <Text strong>{address?.district}, {address?.province}</Text>
                    </Space>
                  </Col>
                </Row>
              </div>
            </Card>

            {/* Card 2: Property Info */}
            <Card title={<Space><HomeOutlined /> Thông tin chi tiết</Space>}>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={8}>
                  <Text type="secondary">Loại hình:</Text> <Text strong>{building?.type || 'Đang cập nhật'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Kích thước:</Text> <Text strong>{land?.frontWidth && land?.depth ? `${land.frontWidth}m x ${land.depth}m` : 'Đang cập nhật'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Hướng:</Text> <Text strong>{land?.direction || 'Đang cập nhật'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Số tầng:</Text> <Text strong>{building?.floors || '0'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Mặt tiền:</Text> <Text strong>{land?.frontWidth ? `${land.frontWidth}m` : 'Hẻm'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Hình dáng:</Text> <Text strong>{land?.shape || 'Đang cập nhật'}</Text>
                </Col>
              </Row>
            </Card>

            {/* Card 3: Legal Info */}
            <Card title={<Space><CheckCircleOutlined /> Pháp lý</Space>}>
              <Row gutter={[16, 16]}>
                <Col xs={12} md={8}>
                  <Text type="secondary">Giấy tờ:</Text> <Tag color="blue">{legal?.titleDeed || 'Đang cập nhật'}</Tag>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Chính chủ:</Text> <Text strong>{legal?.ownerType === 'chính chủ' ? 'Có' : 'Không rõ'}</Text>
                </Col>
                <Col xs={12} md={8}>
                  <Text type="secondary">Quy hoạch:</Text> <Text strong>{legal?.zoning ? 'Dính quy hoạch' : 'Sạch'}</Text>
                </Col>
              </Row>
            </Card>

            {/* Card 4: Description and Amenities */}
            <Card title="Mô tả chi tiết">
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                {description || 'Không có mô tả chi tiết cho bất động sản này.'}
              </Paragraph>
              
              {(amenities?.nearSchool || amenities?.nearMarket || amenities?.nearPark) && (
                <>
                  <Divider />
                  <Title level={5}>Tiện ích xung quanh</Title>
                  <Space wrap>
                    {amenities?.nearSchool && <Tag color="cyan">Gần trường học</Tag>}
                    {amenities?.nearMarket && <Tag color="cyan">Gần chợ/siêu thị</Tag>}
                    {amenities?.nearPark && <Tag color="cyan">Gần công viên</Tag>}
                    {amenities?.nearMetro && <Tag color="cyan">Gần Metro</Tag>}
                  </Space>
                </>
              )}
            </Card>
          </Space>
        </Col>

        {/* Sidebar Column */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {/* Contact Card */}
            <Card 
              style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}
              bodyStyle={{ textAlign: 'center', padding: '24px' }}
            >
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Liên hệ chính chủ/môi giới</Text>
              <Title level={3} style={{ color: '#1d39c4', margin: '0 0 16px' }}>
                <PhoneOutlined /> {phone || 'Chưa có SĐT'}
              </Title>
              <Button type="primary" block size="large" icon={<PhoneOutlined />}>
                Gọi ngay
              </Button>
            </Card>

            {/* Note Card */}
            <Card title={<Space><SaveOutlined /> Ghi chú cá nhân</Space>}>
              <Paragraph type="secondary">
                Ghi lại suy nghĩ hoặc thông tin riêng tư về BĐS này. (Chỉ bạn nhìn thấy)
              </Paragraph>
              <TextArea 
                rows={6} 
                placeholder="Nhập ghi chú của bạn tại đây..." 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 16 }}
              />
              <Button 
                type="primary" 
                block 
                icon={<SaveOutlined />} 
                onClick={handleSaveNote}
                loading={savingNote}
              >
                Lưu ghi chú
              </Button>
              {!property.isBookmarked && (
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 8, textAlign: 'center' }}>
                  * Lưu ghi chú sẽ tự động thêm BĐS vào danh sách theo dõi
                </Text>
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default PropertyDetailsPage;
