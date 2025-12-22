import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import axios from '../../utils/axios';
import ProductCard from '../../components/ProductCard.jsx';
import { useSocket } from '../../context/SocketContext';

const StoreContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const StoreHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
`;

const StoreTitle = styled.h1`
  font-size: 36px;
  color: var(--text-color);
`;

const Filters = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  padding: 10px 15px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--input-bg);
  color: var(--text-color);
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: var(--input-focus-border);
  }
  
  option {
    background: var(--input-bg);
    color: var(--text-color);
  }
`;

const SearchBox = styled.div`
  display: flex;
  flex: 1;
  max-width: 400px;
  
  input {
    flex: 1;
    padding: 10px 15px;
    border: 1px solid var(--border-color);
    border-radius: 5px 0 0 5px;
    background: var(--input-bg);
    color: var(--text-color);
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: var(--input-focus-border);
    }
  }
  
  button {
    padding: 0 20px;
    background-color: var(--btn-primary);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    font-weight: 500;
  }
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 30px;
  margin-bottom: 50px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 30px;
`;

const PageButton = styled.button`
  padding: 8px 15px;
  border: 1px solid var(--border-color);
  background: ${props => props.$active ? 'var(--btn-primary)' : 'var(--card-bg)'};
  color: ${props => props.$active ? 'white' : 'var(--text-color)'};
  border-radius: 5px;
  
  &:hover {
    background-color: ${props => props.$active ? 'var(--btn-primary-hover)' : 'var(--nav-link-hover)'};
  }
`;

const Loading = styled.div`
  text-align: center;
  padding: 50px;
  color: var(--text-secondary);
  font-size: 18px;
`;

const NoProducts = styled.div`
  text-align: center;
  padding: 50px;
  color: var(--text-secondary);
  font-size: 18px;
  grid-column: 1 / -1;
`;

const Store = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchParams] = useSearchParams();
  const { socket } = useSocket() || {};
  const productsPerPage = 12;

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [searchParams]);

  // Socket listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for product updates
    const handleProductUpdate = (data) => {
      console.log('Product updated:', data.action);
      fetchProducts();
    };

    // Listen for category updates
    const handleCategoryUpdate = (data) => {
      console.log('Category updated:', data.action);
      fetchCategories();
    };

    socket.on('product_updated', handleProductUpdate);
    socket.on('category_updated', handleCategoryUpdate);

    // Cleanup listeners on unmount
    return () => {
      socket.off('product_updated', handleProductUpdate);
      socket.off('category_updated', handleCategoryUpdate);
    };
  }, [socket]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/products');
      setProducts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
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

  const filteredProducts = products.filter(product => {
    // Guard fields
    const name = product.name || '';
    const description = product.description || '';

    // Filter by search term (case-insensitive)
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      description.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter by category. `product.category` may be populated object or an id string.
    const categoryId = product.category && (product.category._id ? product.category._id : product.category);
    const matchesCategory = selectedCategory === 'all' || categoryId === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      case 'featured':
        return b.isFeatured - a.isFeatured;
      default:
        return 0;
    }
  });

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = sortedProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <StoreContainer>
        <Loading>
          <i className="expDel_spinner fa-spin"></i> Loading products...
        </Loading>
      </StoreContainer>
    );
  }

  return (
    <StoreContainer>
      <StoreHeader>
        <StoreTitle>All Products</StoreTitle>

        <Filters>
          <SearchBox onSubmit={handleSearch}>
            <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1 }}>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </button>
            </form>
          </SearchBox>

          <FilterSelect
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </FilterSelect>
        </Filters>
      </StoreHeader>

      {filteredProducts.length === 0 ? (
        <NoProducts>
          <i className="expDel_search" style={{ fontSize: '40px', marginBottom: '20px' }}></i>
          <h3>No products found</h3>
          <p>Try changing the search or filter criteria</p>
        </NoProducts>
      ) : (
        <>
          <ProductGrid>
            {currentProducts.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </ProductGrid>

          {totalPages > 1 && (
            <Pagination>
              <PageButton
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </PageButton>

              {[...Array(totalPages)].map((_, index) => (
                <PageButton
                  key={index + 1}
                  $active={currentPage === index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </PageButton>
              ))}

              <PageButton
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
    </StoreContainer>
  );
};

export default Store;