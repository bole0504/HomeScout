import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const LoginPage = () => {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/'} replace />;
  }

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg(null);
    
    const result = await login(values.identifier, values.password);
    
    if (result.success) {
      message.success('Đăng nhập thành công!');
      navigate('/admin');
    } else {
      setErrorMsg(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-background fade-in">
        <Card className="login-card shadow-lg" bordered={false}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Title level={2} style={{ color: 'var(--color-primary)', marginBottom: 8 }}>
              CapNhatGia
            </Title>
            <Text type="secondary">Hệ thống quản lý dữ liệu Bất Động Sản</Text>
          </div>

          {errorMsg && (
            <Alert 
              message={errorMsg} 
              type="error" 
              showIcon 
              style={{ marginBottom: 24 }} 
            />
          )}

          <Form
            name="normal_login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="identifier"
              rules={[{ required: true, message: 'Vui lòng nhập Username hoặc Email!' }]}
            >
              <Input 
                prefix={<UserOutlined className="site-form-item-icon" />} 
                placeholder="Username hoặc Email" 
                autoFocus
              />
            </Form.Item>
            
            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="site-form-item-icon" />}
                placeholder="Mật khẩu"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 32 }}>
              <Button type="primary" htmlType="submit" className="login-form-button" loading={loading} block>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
