import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

const ManageCategoriesContainer = styled.div``;

const Section = styled.section`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px var(--shadow);
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  color: var(--text-color);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border-light);
`;

const CategoryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    text-align: left;
    padding: 12px 15px;
    background-color: var(--nav-link-hover);
    color: var(--text-color);
    font-weight: 600;
    border-bottom: 2px solid var(--border-color);
  }
  
  td {
    padding: 12px 15px;
    border-bottom: 1px solid var(--border-color);
  }
  
  tr:hover {
    background-color: var(--nav-link-hover);
  }
`;

const ActionButton = styled.button`
  padding: 5px 10px;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 5px;
  
  &.edit {
    background-color: var(--warning-bg);
    color: var(--warning-text);
    
    &:hover {
      background-color: var(--warning-bg);
    }
  }
  
  &.delete {
    background-color: var(--btn-danger);
    color: white;
    
    &:hover {
      background-color: var(--btn-danger-hover);
    }
  }
  
  &.toggle {
    background-color: ${props => props.active ? 'var(--btn-primary)' : 'var(--btn-secondary)'};
    color: white;
    
    &:hover {
      background-color: ${props => props.active ? 'var(--btn-primary-hover)' : 'var(--btn-secondary-hover)'};
    }
  }
`;

const FormContainer = styled.div`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px var(--shadow);
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
`;

const FormGroup = styled.div`
  &.full-width {
    grid-column: 1 / -1;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-weight: 500;
  
  &.required::after {
    content: ' *';
    color: var(--btn-danger);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  background: var(--input-bg);
  color: var(--text-color);
  
  &:focus {
    outline: none;
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  min-height: 100px;
  resize: vertical;
  transition: all 0.3s;
  background: var(--input-bg);
  color: var(--text-color);
  
  &:focus {
    outline: none;
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }
`;

const ImageUpload = styled.div`
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--bg-color);
  color: var(--text-color);
  
  &:hover {
    border-color: var(--input-focus-border);
    background-color: rgba(40, 167, 69, 0.05);
  }
  
  input[type="file"] {
    display: none;
  }
`;

const ImagePreview = styled.div`
  margin-top: 20px;
  
  img {
    max-width: 200px;
    max-height: 200px;
    border-radius: 8px;
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  color: var(--btn-primary);
  margin-bottom: 15px;
`;

const SubmitButton = styled.button`
  padding: 15px 30px;
  background-color: var(--btn-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 20px;
  
  &:hover {
    background-color: var(--btn-primary-hover);
  }
  
  &:disabled {
    background-color: var(--btn-secondary);
    cursor: not-allowed;
  }
`;

const ManageCategories = () => {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Viewer role check - viewers cannot edit
  const admin = JSON.parse(localStorage.getItem('admin') || '{}');
  const viewOnly = admin?.role === 'normal_viewer' || admin?.role === 'special_viewer';

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Category name is required'
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');

      // If there's an image file, upload directly to Cloudinary first
      let imageUrl = '';
      if (image) {
        const cloudForm = new FormData();
        cloudForm.append('file', image);
        cloudForm.append('upload_preset', 'basket_categories');

        const res = await fetch(`https://api.cloudinary.com/v1_1/dk57ostu8/upload`, {
          method: 'POST',
          body: cloudForm
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Upload failed');
        }
        imageUrl = data.secure_url;
      }

      const payload = { ...formData, image: imageUrl };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      if (editingId) {
        // Update existing category
        await axios.put(`/admin/categories/${editingId}`, payload, config);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Category updated successfully',
          timer: 1500,
          showConfirmButton: false
        });
        setEditingId(null);
      } else {
        // Create new category
        await axios.post('/admin/categories', payload, config);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Category added successfully',
          timer: 1500,
          showConfirmButton: false
        });
      }

      // Reset form
      setFormData({ name: '', description: '' });
      setImage(null);
      setImagePreview('');
      fetchCategories();

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to save category'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setEditingId(category._id);
    if (category.image) {
      setImagePreview(category.image);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (categoryId, categoryName) => {
    const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${categoryName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--btn-danger)',
      cancelButtonColor: 'var(--btn-secondary)',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('adminToken');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`
          }
        };

        await axios.delete(`/admin/categories/${categoryId}`, config);

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Category has been deleted.',
          timer: 1500,
          showConfirmButton: false
        });

        fetchCategories();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete category'
        });
      }
    }
  };

  const handleToggleStatus = async (categoryId, currentStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      await axios.put(`/admin/categories/${categoryId}`,
        { isActive: !currentStatus },
        config
      );

      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Category status updated',
        timer: 1500,
        showConfirmButton: false
      });

      fetchCategories();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update category status'
      });
    }
  };

  const cancelEdit = () => {
    setFormData({ name: '', description: '' });
    setEditingId(null);
    setImage(null);
    setImagePreview('');
  };

  return (
    <ManageCategoriesContainer>
      {!viewOnly && (
        <Section>
          <SectionTitle>
            {editingId ? 'Edit Category' : 'Add New Category'}
          </SectionTitle>

          <FormContainer>
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label className="required">Category Name</Label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter category name"
                  required
                />
              </FormGroup>

              <FormGroup className="full-width">
                <Label>Description</Label>
                <TextArea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter category description (optional)"
                />
              </FormGroup>

              <FormGroup className="full-width">
                <Label>Category Image</Label>
                <ImageUpload>
                  <label htmlFor="category-image-upload">
                    <UploadIcon>
                      <i className="expDel_cloud_upload_alt"></i>
                    </UploadIcon>
                    <p>Click to upload category image</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      Optional - Recommended size: 500x500px
                    </p>
                    <input
                      id="category-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </ImageUpload>

                {imagePreview && (
                  <ImagePreview>
                    <img src={imagePreview} alt="Preview" />
                  </ImagePreview>
                )}
              </FormGroup>

              <FormGroup className="full-width">
                <SubmitButton type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <i className="expDel_spinner fa-spin"></i> Saving...
                    </>
                  ) : editingId ? (
                    'Update Category'
                  ) : (
                    'Add Category'
                  )}
                </SubmitButton>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={{
                      padding: '15px 30px',
                      background: 'none',
                      border: '2px solid var(--btn-secondary)',
                      color: 'var(--btn-secondary)',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      marginLeft: '15px'
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </FormGroup>
            </Form>
          </FormContainer>
        </Section>
      )}

      <Section>
        <SectionTitle>All Categories ({categories.length})</SectionTitle>
        <CategoryTable>
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <tr key={category._id}>
                <td>{category.name}</td>
                <td>{category.description || '-'}</td>
                <td>
                  <span style={{
                    color: category.isActive ? 'var(--btn-primary)' : 'var(--btn-danger)',
                    fontWeight: '500'
                  }}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {!viewOnly ? (
                    <>
                      <ActionButton
                        className="edit"
                        onClick={() => handleEdit(category)}
                      >
                        <i className="expDel_edit"></i> Edit
                      </ActionButton>
                      <ActionButton
                        className="toggle"
                        active={category.isActive}
                        onClick={() => handleToggleStatus(category._id, category.isActive)}
                      >
                        <i className={`expDel_${category.isActive ? 'eye_slash' : 'eye'}`}></i>
                        {category.isActive ? ' Deactivate' : ' Activate'}
                      </ActionButton>
                      <ActionButton
                        className="delete"
                        onClick={() => handleDelete(category._id, category.name)}
                      >
                        <i className="expDel_trash"></i> Delete
                      </ActionButton>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>View Only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </CategoryTable>
      </Section>
    </ManageCategoriesContainer>
  );
};

export default ManageCategories;