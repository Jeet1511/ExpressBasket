import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from '../../utils/axios';
import Swal from 'sweetalert2';

const AddProductContainer = styled.div``;

const FormContainer = styled.div`
  background: var(--card-bg);
  border-radius: 10px;
  padding: 30px;
  box-shadow: 0 4px 6px var(--shadow);
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

const AddProduct = () => {
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
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const units = ['kg', 'g', 'l', 'ml', 'piece', 'dozen', 'pack'];

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
    if (!formData.name || !formData.price || !formData.category || !formData.stock || !formData.unit || !formData.description) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please fill in all required fields (name, description, price, category, stock, unit)'
      });
      return;
    }

    if (!image) {
      Swal.fire({
        icon: 'error',
        title: 'Image Required',
        text: 'Please upload a product image'
      });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');

      // Upload image directly to Cloudinary from the client
      const uploadImageToCloudinary = async (file) => {
        const cloudForm = new FormData();
        cloudForm.append('file', file);
        cloudForm.append('upload_preset', 'basket_products');

        const res = await fetch(`https://api.cloudinary.com/v1_1/dk57ostu8/upload`, {
          method: 'POST',
          body: cloudForm
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Upload failed');
        }
        return data.secure_url;
      };

      const imageUrl = await uploadImageToCloudinary(image);

      const payload = { ...formData, image: imageUrl };

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      await axios.post('/admin/products', payload, config);

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Product added successfully',
        timer: 1500,
        showConfirmButton: false
      });

      // Reset form
      setFormData({
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
      setImage(null);
      setImagePreview('');

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to add product'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddProductContainer>
      <FormContainer>
        <FormTitle>Add New Product</FormTitle>

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
            <Label className="required">Product Image</Label>
            <ImageUpload>
              <label htmlFor="image-upload">
                <UploadIcon>
                  <i className="expDel_cloud_upload_alt"></i>
                </UploadIcon>
                <p>Click to upload product image</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Recommended size: 500x500px
                </p>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required
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
                  <i className="expDel_spinner fa-spin"></i> Adding Product...
                </>
              ) : (
                'Add Product'
              )}
            </SubmitButton>
          </FormGroup>
        </Form>
      </FormContainer>
    </AddProductContainer>
  );
};

export default AddProduct;