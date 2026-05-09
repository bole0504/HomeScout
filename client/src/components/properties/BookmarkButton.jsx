import React from 'react';
import { Button, Space, Typography } from 'antd';
import { HeartOutlined, HeartFilled } from '@ant-design/icons';
import { useBookmark } from '../../hooks/useBookmark';

const { Text } = Typography;

const BookmarkButton = ({ propertyId, initialIsBookmarked, initialCount }) => {
  const { isBookmarked, bookmarkCount, toggleBookmark, isLoading } = useBookmark(
    propertyId,
    initialIsBookmarked,
    initialCount
  );

  return (
    <Button 
      type="text" 
      onClick={toggleBookmark} 
      loading={isLoading}
      style={{ padding: '0 4px' }}
    >
      <Space size={4}>
        {isBookmarked ? (
          <HeartFilled style={{ color: '#ff4d4f', fontSize: '18px' }} />
        ) : (
          <HeartOutlined style={{ fontSize: '18px' }} />
        )}
        {bookmarkCount > 0 && (
          <Text type="secondary">{bookmarkCount}</Text>
        )}
      </Space>
    </Button>
  );
};

export default BookmarkButton;
