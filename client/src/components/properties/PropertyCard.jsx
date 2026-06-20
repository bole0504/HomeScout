import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Typography, Space, Row, Col } from 'antd';
import { EnvironmentOutlined, HomeOutlined, CompressOutlined, CheckCircleOutlined } from '@ant-design/icons';
import BookmarkButton from './BookmarkButton';

const { Title, Text } = Typography;

const PropertyCard = ({ property }) => {
  const navigate = useNavigate();
  const {
    address,
    totalPrice,
    area,
    images,
    land,
    legal,
    dataCompletenessScore,
    goodPrice,
    goodPricePercent
  } = property;

  const fallbackImage = 'https://via.placeholder.com/300x200?text=No+Image';
  const imageUrl = images && images.length > 0 ? images[0] : fallbackImage;

  return (
    <Card
      hoverable
      onClick={() => navigate(`/properties/${property._id}`)}
      cover={<img alt="property" src={imageUrl} style={{ height: 200, objectFit: 'cover' }} />}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Title level={4} style={{ color: '#cf1322', margin: 0 }}>
          {totalPrice ? `${totalPrice / 1000} Tỷ` : 'Thỏa thuận'}
        </Title>
        <Space size={8} align="start">
          {goodPrice && (
            <Tag color="success">Giá Hời {-goodPricePercent}%</Tag>
          )}
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
          <Tag icon={<CheckCircleOutlined />} color={dataCompletenessScore > 80 ? "green" : "gold"}>
            Score: {dataCompletenessScore || 0}
          </Tag>
        </Space>
      </div>
    </Card>
  );
};

export default PropertyCard;
