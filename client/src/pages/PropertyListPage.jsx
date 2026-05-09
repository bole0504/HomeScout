import React, { useState, useEffect } from 'react';
import { Row, Col, Pagination, Spin, Empty, Tabs, Typography } from 'antd';
import { propertiesAPI, bookmarksAPI } from '../api';
import PropertyCard from '../components/properties/PropertyCard';
import PropertyFilters from '../components/properties/PropertyFilters';

const { Title } = Typography;

const PropertyListPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });
  const [filters, setFilters] = useState({});
  const [activeTab, setActiveTab] = useState('all');

  const fetchProperties = async (page = 1, currentFilters = filters, tab = activeTab) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        ...currentFilters,
      };

      if (tab === 'good-price') {
        params.goodPrice = true;
      }

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

  const items = [
    { key: 'all', label: 'Tất cả BĐS' },
    { key: 'good-price', label: 'Giá Hời' },
    { key: 'bookmarked', label: 'Đang theo dõi' },
  ];

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Title level={2} style={{ margin: '24px 0' }}>Kho Bất Động Sản</Title>

      <PropertyFilters onFilter={handleFilter} />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        style={{ marginBottom: 16 }}
      />

      <Spin spinning={loading}>
        {properties.length > 0 ? (
          <>
            <Row gutter={[16, 16]}>
              {properties.map((property) => (
                <Col xs={24} sm={12} md={8} lg={6} key={property._id}>
                  <PropertyCard property={property} />
                </Col>
              ))}
            </Row>

            <div style={{ marginTop: 32, textAlign: 'center' }}>
              <Pagination
                current={pagination.page}
                total={pagination.total}
                pageSize={pagination.limit}
                onChange={handlePageChange}
                showSizeChanger={false}
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
