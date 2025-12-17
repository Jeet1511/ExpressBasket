import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from '../../utils/axios';
import ProductCard from '../../components/ProductCard.jsx';

const CategoriesContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const CategorySection = styled.section`
  margin-bottom: 50px;
`;

const CategoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 2px solid var(--border-light);
`;

const CategoryTitle = styled.h2`
  font-size: 28px;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 10px;
  
  i {
    color: var(--btn-primary);
  }
`;

const ViewAll = styled.button`
  background: none;
  border: 2px solid var(--btn-primary);
  color: var(--btn-primary);
  padding: 8px 20px;
  border-radius: 5px;
  font-weight: 500;
  transition: all 0.3s;
  
  &:hover {
    background-color: var(--btn-primary);
    color: white;
  }
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 30px;
`;

const NoProducts = styled.div`
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-size: 18px;
`;

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data);

      // Fetch products for each category
      response.data.forEach(async (category) => {
        try {
          const productsResponse = await axios.get(`/products/category/${category._id}`);
          setCategoryProducts(prev => ({
            ...prev,
            [category._id]: productsResponse.data.slice(0, 4) // Show only 4 products per category
          }));
        } catch (error) {
          console.error(`Error fetching products for category ${category.name}:`, error);
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleViewAll = (categoryId) => {
    navigate(`/store?category=${categoryId}`);
  };
  const categoryIcons = {
    'Fruits & Vegetables': 'expDel_fruits',
    'Dairy & Eggs': 'expDel_dairy',
    'Beverages': 'expDel_beverages',
    'Snacks': 'expDel_snacks',
    'Cooking Essentials': 'expDel_cooking',
    'Personal Care': 'expDel_personal',
    'Bakery': 'expDel_bakery',
    'Frozen Foods': 'expDel_frozen',
    'Meat & Fish': 'expDel_meat',
    'Household': 'expDel_household',
  };

  return (
    <CategoriesContainer>
      <h1 style={{ fontSize: '36px', marginBottom: '30px', color: 'var(--text-color)' }}>All Categories</h1>

      {categories.map(category => (
        <CategorySection key={category._id}>
          <CategoryHeader>
            <CategoryTitle>
              <i className={categoryIcons[category.name] || 'expDel_shopping_basket'}></i>
              {category.name}
            </CategoryTitle>
            <ViewAll onClick={() => handleViewAll(category._id)}>View All</ViewAll>
          </CategoryHeader>

          <ProductGrid>
            {categoryProducts[category._id]?.length > 0 ? (
              categoryProducts[category._id].map(product => (
                <ProductCard key={product._id} product={product} />
              ))
            ) : (
              <NoProducts>No products available in this category</NoProducts>
            )}
          </ProductGrid>
        </CategorySection>
      ))}
    </CategoriesContainer>
  );
};

export default Categories;