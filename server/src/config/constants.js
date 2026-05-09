module.exports = {
  // User roles
  ROLES: {
    ADMIN: 'admin',
    USER: 'user',
  },

  // Property status
  PROPERTY_STATUS: {
    ACTIVE: 'active',
    SOLD: 'sold',
    ARCHIVED: 'archived',
  },

  // Source types
  SOURCE_TYPES: {
    WEBSITE: 'website',
    FACEBOOK: 'facebook',
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // Crawl pagination types
  CRAWL_PAGINATION: {
    URL_PARAM: 'url-param',
    NEXT_BUTTON: 'next-button',
    INFINITE_SCROLL: 'infinite-scroll',
  },

  // Vietnamese provinces for reference / validation
  // (abbreviated list — full list will be in seed data)
  MAJOR_CITIES: [
    'Hồ Chí Minh',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Hải Phòng',
    'Biên Hòa',
    'Bình Dương',
    'Long An',
  ],
};
