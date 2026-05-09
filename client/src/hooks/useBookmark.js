import { useState } from 'react';
import { bookmarksAPI } from '../api';
import { message } from 'antd';

export const useBookmark = (propertyId, initialIsBookmarked = false, initialCount = 0) => {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [bookmarkCount, setBookmarkCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const toggleBookmark = async (e) => {
    // Prevent event propagation if this is embedded in a clickable card
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Optimistic update
    const previousState = isBookmarked;
    const previousCount = bookmarkCount;

    setIsBookmarked(!previousState);
    setBookmarkCount(prev => prev + (previousState ? -1 : 1));
    setIsLoading(true);

    try {
      if (previousState) {
        // Was bookmarked, so remove it
        await bookmarksAPI.remove(propertyId);
      } else {
        // Was not bookmarked, so add it
        await bookmarksAPI.add(propertyId);
      }
    } catch (error) {
      // Revert on error
      setIsBookmarked(previousState);
      setBookmarkCount(previousCount);
      console.error('Failed to toggle bookmark:', error);
      message.error(error.response?.data?.error || 'Không thể thay đổi trạng thái theo dõi');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isBookmarked,
    bookmarkCount,
    toggleBookmark,
    isLoading
  };
};

export default useBookmark;
