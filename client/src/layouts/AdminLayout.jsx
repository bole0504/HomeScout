import { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, theme, Typography, Grid } from 'antd';
import {
  TeamOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  DatabaseOutlined,
  FacebookOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/properties',
      icon: <DatabaseOutlined />,
      label: 'Bất động sản',
      mobileLabel: 'BĐS',
    },
    ...(isAdmin ? [
      {
        key: '/admin/users',
        icon: <TeamOutlined />,
        label: 'Người dùng',
        mobileLabel: 'Users',
      },
      {
        key: '/admin/crawl',
        icon: <SettingOutlined />,
        label: 'Cấu hình Crawl',
        mobileLabel: 'Crawl',
      },
      {
        key: '/admin/fb-import',
        icon: <FacebookOutlined style={{ color: '#1877f2' }} />,
        label: 'Import Facebook',
        mobileLabel: 'Facebook',
      },
    ] : []),
  ];

  const userMenuItems = [
    {
      key: 'info',
      label: <Text strong>{user?.username}</Text>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
      onClick: handleLogout,
    },
  ];

  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        {/* Mobile Header */}
        <Header
          style={{
            padding: '0 16px',
            background: colorBgContainer,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: 'var(--shadow-sm)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            height: 52,
          }}
        >
          <div
            style={{
              color: 'var(--color-primary)',
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: '-0.3px',
            }}
          >
            CapNhatGia
          </div>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar size={32} style={{ backgroundColor: 'var(--color-primary)' }} icon={<UserOutlined />}>
                {user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </span>
          </Dropdown>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: '12px 12px 80px',
            background: 'var(--color-bg-base)',
            minHeight: 'calc(100vh - 52px)',
          }}
        >
          <Outlet />
        </Content>

        {/* Bottom Navigation */}
        <nav className="mobile-bottom-nav">
          {menuItems.map((item) => {
            const active = location.pathname === item.key ||
              (item.key !== '/properties' && location.pathname.startsWith(item.key));
            return (
              <button
                key={item.key}
                className={`mobile-bottom-nav__item${active ? ' active' : ''}`}
                onClick={() => navigate(item.key)}
              >
                <span className="mobile-bottom-nav__icon">{item.icon}</span>
                <span className="mobile-bottom-nav__label">{item.mobileLabel || item.label}</span>
              </button>
            );
          })}
        </nav>
      </Layout>
    );
  }

  // Desktop layout (unchanged)
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth="80"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        theme="light"
        style={{ boxShadow: 'var(--shadow-sm)', zIndex: 10 }}
      >
        <div className="admin-logo">
          {collapsed ? 'CNG' : 'CapNhatGia'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: 0,
          background: colorBgContainer,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 9,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ paddingRight: 24 }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar style={{ backgroundColor: 'var(--color-primary)' }}>
                  {user?.username?.[0]?.toUpperCase()}
                </Avatar>
                <Text>{user?.username}</Text>
              </span>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          margin: '24px 16px',
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
