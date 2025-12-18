import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

// Reuse styled components from AddProduct.jsx
const EditProductContainer = styled.div``;

const FormContainer = styled.div`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px var(--shadow);
  margin-bottom: 30px;
`;

const FormTitle = styled.h2`
  font-size: 24px;
  color: var(--text-color);
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--border-light);
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
  
  &:focus {
    outline: none;
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 15px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 16px;
  background: var(--input-bg);
  transition: all 0.3s;
  
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
  
  &:focus {
    outline: none;
    border-color: var(--input-focus-border);
    box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
`;

const ImageUpload = styled.div`
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
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
  
  &:hover {
    background-color: var(--btn-primary-hover);
  }
  
  &:disabled {
    background-color: var(--btn-secondary);
    cursor: not-allowed;
  }
`;

const CancelButton = styled.button`
  padding: 15px 30px;
  background-color: var(--btn-secondary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background-color: var(--btn-secondary-hover);
  }
`;

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    stock: '',
    unit: 'kg',
    discount: '0',
    isFeatured: false
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [currentImage, setCurrentImage] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const units = ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'pack'];

  useEffect(() => {
    fetchProductDetails();
    fetchCategories();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const response = await axios.get(`/products/${id}`);
      const product = response.data;

      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category?._id || '',
        stock: product.stock,
        unit: product.unit,
        discount: product.discount,
        isFeatured: product.isFeatured
      });

      setCurrentImage(product.image);
      setFetching(false);
    } catch (error) {
      console.error('Error fetching product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch product details'
      });
      setFetching(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

    // Validation
    if (!formData.name || !formData.price || !formData.category || !formData.stock) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill in all required fields'
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');
      const formDataToSend = new FormData();

      // Append form data
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });

      // Append image if new one is selected
      if (image) {
        formDataToSend.append('image', image);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      };

      await axios.put(`/admin/products/${id}`, formDataToSend, config);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Product updated successfully',
        timer: 1500,
        showConfirmButton: false
      });

      navigate('/admin/products');

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update product'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  if (fetching) {
    return <div>Loading product details...</div>;
  }

  return (
    <EditProductContainer>
      <FormContainer>
        <FormTitle>Edit Product</FormTitle>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label className="required">Product Name</Label>
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter product name"
              required
            />
          </FormGroup>

          <FormGroup className="full-width">
            <Label className="required">Description</Label>
            <TextArea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter product description"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label className="required">Price (₹)</Label>
            <Input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="Enter selling price"
              min="0"
              step="0.01"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label>Original Price (₹)</Label>
            <Input
              type="number"
              name="originalPrice"
              value={formData.originalPrice}
              onChange={handleInputChange}
              placeholder="Enter original price"
              min="0"
              step="0.01"
            />
          </FormGroup>

          <FormGroup>
            <Label className="required">Category</Label>
            <Select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label className="required">Stock Quantity</Label>
            <Input
              type="number"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              placeholder="Enter stock quantity"
              min="0"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label className="required">Unit</Label>
            <Select
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              required
            >
              {units.map(unit => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label>Discount (%)</Label>
            <Input
              type="number"
              name="discount"
              value={formData.discount}
              onChange={handleInputChange}
              placeholder="Enter discount percentage"
              min="0"
              max="100"
            />
          </FormGroup>

          <FormGroup>
            <Label>Featured Product</Label>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleInputChange}
              />
              <span>Mark as featured product</span>
            </CheckboxContainer>
          </FormGroup>

          <FormGroup className="full-width">
            <Label>Product Image</Label>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Current Image:
            </p>
            {currentImage && (
              <img
                src={currentImage}
                alt="Current"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}
              />
            )}

            <ImageUpload>
              <label htmlFor="image-upload">
                <UploadIcon>
                  <i className="expDel_cloud_upload_alt"></i>
                </UploadIcon>
                <p>Click to upload new product image</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Leave empty to keep current image
                </p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            </ImageUpload>

            {imagePreview && (
              <ImagePreview>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  New Image Preview:
                </p>
                <img src={imagePreview} alt="Preview" />
              </ImagePreview>
            )}
          </FormGroup>

          <FormGroup className="full-width">
            <ButtonGroup>
              <SubmitButton type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <i className="expDel_spinner fa-spin"></i> Updating...
                  </>
                ) : (
                  'Update Product'
                )}
              </SubmitButton>
              <CancelButton type="button" onClick={handleCancel}>
                Cancel
              </CancelButton>
            </ButtonGroup>
          </FormGroup>
        </Form>
      </FormContainer>
    </EditProductContainer>
  );
};

export default EditProduct;