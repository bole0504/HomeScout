/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Tag, 
  Space, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Typography,
  Popconfirm,
  Badge
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { usersAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll();
      setUsers(res.data.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách người dùng');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      setEditingUser(null);
      form.resetFields();
      form.setFieldsValue({ role: 'user', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingUser(null);
  };

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update user
        const updateData = { ...values };
        if (!updateData.password) {
          delete updateData.password;
        }
        await usersAPI.update(editingUser._id, updateData);
        message.success('Cập nhật người dùng thành công');
      } else {
        // Create user
        await usersAPI.create(values);
        message.success('Tạo người dùng thành công');
      }
      handleModalClose();
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      if (currentStatus) {
        await usersAPI.update(id, { isActive: false }); // There is a specific endpoint for deactivate, but update works too if body has isActive
        // Wait, let's use the update endpoint with isActive
      } else {
        await usersAPI.update(id, { isActive: true });
      }
      message.success(`Đã ${currentStatus ? 'khóa' : 'mở khóa'} tài khoản`);
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.error || 'Có lỗi xảy ra');
    }
  };

  const columns = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'admin' ? 'blue' : 'default'} style={{ textTransform: 'uppercase' }}>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Badge status={isActive ? 'success' : 'error'} text={isActive ? 'Hoạt động' : 'Đã khóa'} />
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => {
        const isSelf = currentUser?._id === record._id;
        
        return (
          <Space size="middle">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleOpenModal(record)}
            />
            {!isSelf && (
              <Popconfirm
                title={record.isActive ? "Bạn có chắc muốn khóa tài khoản này?" : "Bạn có chắc muốn mở khóa tài khoản này?"}
                onConfirm={() => toggleUserStatus(record._id, record.isActive)}
                okText="Đồng ý"
                cancelText="Hủy"
              >
                <Button 
                  type="text" 
                  danger={record.isActive}
                  style={{ color: !record.isActive ? 'var(--color-success)' : undefined }}
                  icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />} 
                />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Quản lý người dùng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
          Thêm người dùng
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="_id" 
        loading={loading}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
      />

      <Modal
        title={editingUser ? 'Cập nhật người dùng' : 'Tạo mới người dùng'}
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ role: 'user', isActive: true }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Vui lòng nhập username' },
              { min: 3, message: 'Tối thiểu 3 ký tự' }
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' }
            ]}
          >
            <Input type="email" disabled={!!editingUser} />
          </Form.Item>
          
          <Form.Item
            name="password"
            label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            rules={[
              { required: !editingUser, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Tối thiểu 6 ký tự' }
            ]}
          >
            <Input.Password />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select>
              <Option value="user">User</Option>
              <Option value="admin">Admin</Option>
            </Select>
          </Form.Item>

          {editingUser && (
            <Form.Item
              name="isActive"
              label="Trạng thái"
              rules={[{ required: true }]}
            >
              <Select disabled={editingUser._id === currentUser?._id}>
                <Option value={true}>Hoạt động</Option>
                <Option value={false}>Khóa</Option>
              </Select>
            </Form.Item>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={handleModalClose}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              {editingUser ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
