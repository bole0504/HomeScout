import React, { useState, useEffect } from 'react';
import { Row, Col, Pagination, Spin, Empty, Tabs, Typography, Grid } from 'antd';
import { propertiesAPI, bookmarksAPI } from '../api';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';

const { Title } = Typography;
const { useBreakpoint } = Grid;

const PropertyListPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const fetchProperties = async (page = 1, currentFilters = filters, tab = activeTab) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...currentFilters,
      };

      if (tab === 'good-price') params.goodPrice = true;

      const res = tab === 'bookmarked'
        ? await bookmarksAPI.getAll(params)
        : await propertiesAPI.getAll(params);

      const { data } = res;
      if (data.success) {
        setProperties(data.data);
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
        });
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(1, filters, activeTab);
  }, [filters, activeTab]);

  const handlePageChange = (page) => {
    fetchProperties(page);
  };

  const handleFilter = (newFilters) => {
    setFilters(newFilters);
  };

  const tabItems = [
    { key: 'all', label: 'Tất cả' },
    { key: 'good-price', label: 'Giá Hời' },
    { key: 'bookmarked', label: 'Theo dõi' },
  ];

  return (
    <div style={{ padding: isMobile ? '0 0 8px' : '0 24px 24px' }}>
      <Title
        level={isMobile ? 4 : 2}
        style={{ margin: isMobile ? '12px 0' : '24px 0' }}
      >
        Kho Bất Động Sản
      </Title>

      <PropertyFilters onFilter={handleFilter} />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size={isMobile ? 'small' : 'middle'}
        style={{ marginBottom: isMobile ? 8 : 16 }}
      />

      <Spin spinning={loading}>
        {properties.length > 0 ? (
          <>
            <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
              {properties.map((property) => (
                <Col xs={24} sm={12} md={8} lg={6} key={property._id}>
                  <PropertyCard property={property} />
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: isMobile ? 16 : 32, textAlign: 'center' }}>
              <Pagination
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.limit}
                onChange={handlePageChange}
                showSizeChanger={false}
                size={isMobile ? 'small' : 'default'}
              />
            </div>
          </>
        ) : (
          <div style={{ padding: '48px 0' }}>
            <Empty description="Không tìm thấy bất động sản nào phù hợp" />
          </div>
        )}
      </Spin>
    </div>
  );
};

export default PropertyListPage;
