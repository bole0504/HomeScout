import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Typography, Space, Row, Col } from 'antd';
import {
  EnvironmentOutlined,
  HomeOutlined,
  CompressOutlined,
  CheckCircleOutlined,
  FacebookOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import BookmarkButton from './BookmarkButton';

const { Title, Text, Paragraph } = Typography;

// Card cho FB post đã extract đủ thông tin
const StructuredCard = ({ property, onClick }) => {
  const { address, totalPrice, area, images, land, legal, dataCompletenessScore, goodPrice, goodPricePercent } = property;
  const fallbackImage = 'https://via.placeholder.com/300x200?text=No+Image';
  const imageUrl = images?.length > 0 ? images[0] : fallbackImage;

  return (
    <Card
      hoverable
      onClick={onClick}
      cover={<img alt="property" src={imageUrl} style={{ height: 200, objectFit: 'cover' }} />}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Title level={4} style={{ color: '#cf1322', margin: 0 }}>
          {totalPrice ? `${totalPrice / 1000} Tỷ` : 'Thỏa thuận'}
        </Title>
        <Space size={8} align="start">
          {goodPrice && <Tag color="success">Giá Hời {-goodPricePercent}%</Tag>}
          <BookmarkButton
            propertyId={property._id}
            initialIsBookmarked={property.isBookmarked}
            initialCount={property.bookmarkCount}
          />
        </Space>
      </div>

      <Text type="secondary" ellipsis style={{ marginBottom: 12, display: 'block' }}>
        <EnvironmentOutlined /> {address?.fullAddress || `${address?.district}, ${address?.province}`}
      </Text>

      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Space>
            <CompressOutlined />
            <Text>{area || land?.actualArea} m²</Text>
          </Space>
        </Col>
        <Col span={12}>
          <Space>
            <HomeOutlined />
            <Text>{land?.frontWidth ? `MT ${land.frontWidth}m` : 'Hẻm'}</Text>
          </Space>
        </Col>
      </Row>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
        <Space wrap>
          {legal?.titleDeed && <Tag color="blue">{legal.titleDeed}</Tag>}
          {legal?.ownerType === 'chính chủ' && <Tag color="geekblue">Chính chủ</Tag>}
          <Tag icon={<CheckCircleOutlined />} color={dataCompletenessScore > 80 ? 'green' : 'gold'}>
            Score: {dataCompletenessScore || 0}
          </Tag>
        </Space>
      </div>
    </Card>
  );
};

// Card cho FB post chưa extract được thông tin — hiện raw caption
const RawFBCard = ({ property, onClick }) => {
  const { originalData, phone, images, totalPrice } = property;
  const imageUrl = images?.length > 0 ? images[0] : null;

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: '#e6f4ff' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}
    >
      {/* FB badge + bookmark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Tag icon={<FacebookOutlined />} color="#1877f2" style={{ margin: 0 }}>
          Facebook
        </Tag>
        <Space size={6}>
          {totalPrice && (
            <Text strong style={{ color: '#cf1322' }}>{totalPrice / 1000} Tỷ</Text>
          )}
          <BookmarkButton
            propertyId={property._id}
            initialIsBookmarked={property.isBookmarked}
            initialCount={property.bookmarkCount}
          />
        </Space>
      </div>

      {/* Image nếu có */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="post"
          style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 10 }}
        />
      )}

      {/* Raw caption */}
      <Paragraph
        ellipsis={{ rows: 5, expandable: false }}
        style={{ fontSize: 13, color: '#333', lineHeight: 1.6, margin: 0, flex: 1 }}
      >
        {originalData}
      </Paragraph>

      {/* Phone nếu có */}
      {phone && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <PhoneOutlined style={{ marginRight: 4 }} />{phone}
          </Text>
        </div>
      )}
    </Card>
  );
};

// Main component — tự chọn variant
const PropertyCard = ({ property }) => {
  const navigate = useNavigate();
  const onClick = () => navigate(`/properties/${property._id}`);

  if (property.sourceType === 'facebook' && property.originalData) {
    return <RawFBCard property={property} onClick={onClick} />;
  }

  return <StructuredCard property={property} onClick={onClick} />;
};

export default PropertyCard;
