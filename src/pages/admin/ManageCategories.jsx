import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

// ==================== STYLED COMPONENTS ====================

const PageContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
`;

const PageTitle = styled.h2`
  font-size: 28px;
  color: var(--text-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: ${props => props.$gradient || 'linear-gradient(135deg, #667eea, #764ba2)'};
  border-radius: 12px;
  padding: 20px;
  color: white;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -20px;
    right: -20px;
    width: 80px;
    height: 80px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 13px;
    opacity: 0.9;
  }
`;

const Section = styled.section`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px var(--shadow);
  margin-bottom: 25px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  color: var(--text-color);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const FilterTab = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$active ? 'var(--btn-primary)' : 'var(--bg-color)'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};

  &:hover {
    background: ${props => props.$active ? 'var(--btn-primary)' : 'var(--border-color)'};
  }
`;

const SearchInput = styled.div`
  position: relative;
  min-width: 250px;

  input {
    width: 100%;
    padding: 10px 15px 10px 40px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--btn-primary);
    }
  }

  svg {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const CategoryCard = styled.div`
  background: var(--bg-color);
  border-radius: 12px;
  border: 1px solid ${props => props.$inactive ? 'rgba(220, 53, 69, 0.3)' : 'var(--border-color)'};
  overflow: hidden;
  transition: all 0.2s;
  opacity: ${props => props.$inactive ? 0.7 : 1};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--shadow);
  }
`;

const CategoryImage = styled.div`
  height: 120px;
  background: ${props => props.$src ? `url(${props.$src}) center/cover` : 'linear-gradient(135deg, #667eea, #764ba2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  .status-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    background: ${props => props.$active ? 'rgba(40, 167, 69, 0.9)' : 'rgba(220, 53, 69, 0.9)'};
    color: white;
  }
`;

const CategoryInfo = styled.div`
  padding: 15px;

  h4 {
    margin: 0 0 8px;
    color: var(--text-color);
    font-size: 16px;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

const CategoryActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 15px 15px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.$variant === 'edit' ? '#ffc107' :
    props.$variant === 'transfer' ? '#17a2b8' :
      props.$variant === 'toggle' ? (props.$active ? '#28a745' : '#6c757d') :
        props.$variant === 'delete' ? '#dc3545' : '#6c757d'};
  color: ${props => props.$variant === 'edit' ? '#333' : 'white'};

  &:hover {
    transform: scale(1.02);
  }
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--card-bg);
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-color);
    font-weight: 500;
  }

  input, textarea, select {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;

    &:focus {
      outline: none;
      border-color: var(--btn-primary);
    }
  }

  textarea {
    min-height: 80px;
    resize: vertical;
  }
`;

const ImageUpload = styled.div`
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-color);

  &:hover {
    border-color: var(--btn-primary);
    background: rgba(102, 126, 234, 0.05);
  }

  input {
    display: none;
  }

  img {
    max-width: 150px;
    max-height: 100px;
    border-radius: 8px;
    margin-top: 10px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: ${props => props.$outline ? '1px solid var(--border-color)' : 'none'};
  background: ${props => props.$outline ? 'transparent' :
    props.$variant === 'primary' ? 'linear-gradient(135deg, #667eea, #764ba2)' :
      props.$variant === 'success' ? '#28a745' : 'var(--btn-secondary)'};
  color: ${props => props.$outline ? 'var(--text-color)' : 'white'};

  &:hover {
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

// ==================== COMPONENT ====================

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const viewOnly = admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get('/admin/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Stats
  const activeCount = categories.filter(c => c.isActive).length;
  const inactiveCount = categories.filter(c => !c.isActive).length;

  // Filtered categories
  const filteredCategories = categories
    .filter(cat => {
      const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && cat.isActive) ||
        (statusFilter === 'inactive' && !cat.isActive);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1));

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      Swal.fire({ icon: 'error', title: 'Validation Error', text: 'Category name is required' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      let imageUrl = '';

      if (image) {
        const cloudForm = new FormData();
        cloudForm.append('file', image);
        cloudForm.append('upload_preset', 'basket_categories');
        const res = await fetch('https://api.cloudinary.com/v1_1/dk57ostu8/upload', {
          method: 'POST',
          body: cloudForm
        });
        const data = await res.json();
        imageUrl = data.secure_url;
      }

      const categoryData = {
        name: formData.name,
        description: formData.description,
        ...(imageUrl && { image: imageUrl })
      };

      if (editingId) {
        await axios.put(`/admin/categories/${editingId}`, categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({ icon: 'success', title: 'Updated!', text: 'Category updated successfully', timer: 1500, showConfirmButton: false });
      } else {
        await axios.post('/admin/categories', categoryData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({ icon: 'success', title: 'Created!', text: 'Category created successfully', timer: 1500, showConfirmButton: false });
      }

      closeFormModal();
      fetchCategories();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Failed to save category' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setFormData({ name: category.name, description: category.description || '' });
    setImagePreview(category.image || '');
    setEditingId(category._id);
    setShowFormModal(true);
  };

  const handleDelete = async (id, name) => {
    const result = await Swal.fire({
      title: 'Delete Category?',
      html: `Are you sure you want to delete <strong>${name}</strong>?<br><small>Categories with products cannot be deleted.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.delete(`/admin/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        fetchCategories();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Failed to delete' });
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`/admin/categories/${id}`, { isActive: !currentStatus }, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      Swal.fire({ icon: 'success', title: 'Updated!', text: `Category ${!currentStatus ? 'activated' : 'deactivated'}`, timer: 1500, showConfirmButton: false });
      fetchCategories();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
    }
  };

  const openTransferModal = (category) => {
    setTransferSource(category);
    setTransferTarget('');
    setShowTransferModal(true);
  };

  const handleTransferProducts = async () => {
    if (!transferTarget) return;
    setTransferLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.post(`/admin/categories/${transferSource._id}/transfer/${transferTarget}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({ icon: 'success', title: 'Transferred!', text: response.data.message, timer: 2000, showConfirmButton: false });
      setShowTransferModal(false);
      fetchCategories();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Transfer failed' });
    } finally {
      setTransferLoading(false);
    }
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setFormData({ name: '', description: '' });
    setImage(null);
    setImagePreview('');
    setEditingId(null);
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader>
        <PageTitle>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          Category Management
        </PageTitle>
        {!viewOnly && (
          <AddButton onClick={() => setShowFormModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Category
          </AddButton>
        )}
      </PageHeader>

      {/* Stats Cards */}
      <StatsGrid>
        <StatCard $gradient="linear-gradient(135deg, #667eea, #764ba2)">
          <div className="stat-value">{categories.length}</div>
          <div className="stat-label">Total Categories</div>
        </StatCard>
        <StatCard $gradient="linear-gradient(135deg, #28a745, #20c997)">
          <div className="stat-value">{activeCount}</div>
          <div className="stat-label">Active Categories</div>
        </StatCard>
        <StatCard $gradient="linear-gradient(135deg, #dc3545, #fd7e14)">
          <div className="stat-value">{inactiveCount}</div>
          <div className="stat-label">Inactive Categories</div>
        </StatCard>
      </StatsGrid>

      {/* Categories Section */}
      <Section>
        <SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <SectionTitle>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              All Categories
            </SectionTitle>
            <FilterTabs>
              <FilterTab $active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All ({categories.length})
              </FilterTab>
              <FilterTab $active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                Active ({activeCount})
              </FilterTab>
              <FilterTab $active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>
                Inactive ({inactiveCount})
              </FilterTab>
            </FilterTabs>
          </div>
          <SearchInput>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchInput>
        </SectionHeader>

        {/* Category Cards Grid */}
        <CategoryGrid>
          {filteredCategories.map(category => (
            <CategoryCard key={category._id} $inactive={!category.isActive}>
              <CategoryImage $src={category.image} $active={category.isActive}>
                {!category.image && (
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" opacity="0.5">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                )}
                <span className="status-badge">
                  {category.isActive ? 'Active' : 'Not Active'}
                </span>
              </CategoryImage>
              <CategoryInfo>
                <h4>{category.name}</h4>
                <p>{category.description || 'No description'}</p>
              </CategoryInfo>
              {!viewOnly && (
                <CategoryActions>
                  <ActionBtn $variant="edit" onClick={() => handleEdit(category)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Edit
                  </ActionBtn>
                  <ActionBtn $variant="transfer" onClick={() => openTransferModal(category)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                    Transfer
                  </ActionBtn>
                  <ActionBtn $variant="toggle" $active={category.isActive} onClick={() => handleToggleStatus(category._id, category.isActive)}>
                    {category.isActive ? 'Deactivate' : 'Activate'}
                  </ActionBtn>
                  <ActionBtn $variant="delete" onClick={() => handleDelete(category._id, category.name)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </ActionBtn>
                </CategoryActions>
              )}
            </CategoryCard>
          ))}
        </CategoryGrid>

        {filteredCategories.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.5, marginBottom: '15px' }}>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p>No categories found</p>
          </div>
        )}
      </Section>

      {/* Add/Edit Category Modal */}
      {showFormModal && (
        <Modal onClick={closeFormModal}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-color)' }}>
              {editingId ? 'Edit Category' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSubmit}>
              <FormGroup>
                <label>Category Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter category name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter category description"
                />
              </FormGroup>
              <FormGroup>
                <label>Category Image</label>
                <ImageUpload onClick={() => document.getElementById('categoryImage').click()}>
                  <input id="categoryImage" type="file" accept="image/*" onChange={handleImageChange} />
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--btn-primary)" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)' }}>Click to upload image</p>
                  {imagePreview && <img src={imagePreview} alt="Preview" />}
                </ImageUpload>
              </FormGroup>
              <ButtonRow>
                <Button type="button" $outline onClick={closeFormModal}>Cancel</Button>
                <Button type="submit" $variant="primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Category' : 'Create Category')}
                </Button>
              </ButtonRow>
            </form>
          </ModalContent>
        </Modal>
      )}

      {/* Transfer Products Modal */}
      {showTransferModal && transferSource && (
        <Modal onClick={() => setShowTransferModal(false)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#17a2b8" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
              Transfer Products
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Move all products from <strong style={{ color: 'var(--text-color)' }}>{transferSource.name}</strong> to another category.
            </p>
            <FormGroup>
              <label>Select Target Category</label>
              <select value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
                <option value="">-- Select a category --</option>
                {categories.filter(cat => cat._id !== transferSource._id && cat.isActive).map(cat => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </FormGroup>
            <ButtonRow>
              <Button type="button" $outline onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button onClick={handleTransferProducts} disabled={transferLoading || !transferTarget} style={{ background: '#17a2b8' }}>
                {transferLoading ? 'Transferring...' : 'Transfer Products'}
              </Button>
            </ButtonRow>
          </ModalContent>
        </Modal>
      )}
    </PageContainer>
  );
};

export default ManageCategories;