'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Search, Edit, Trash2, Package } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [storeId, setStoreId] = useState('');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: ''
  });

  useEffect(() => {
    const currentStore = localStorage.getItem('currentStore') || '550e8400-e29b-41d4-a716-446655440001';
    setStoreId(currentStore);
    fetchProducts(currentStore);
    fetchCategories(currentStore);
  }, []);

  const fetchProducts = async (storeId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?storeId=${storeId}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (storeId) => {
    try {
      console.log('Frontend: Fetching categories for store:', storeId);
      const response = await fetch(`/api/categories?storeId=${storeId}`);
      const data = await response.json();
      
      console.log('Frontend: Categories response:', data);
      
      if (data.success) {
        console.log('Frontend: Setting categories:', data.data);
        setCategories(data.data);
      } else {
        console.error('Frontend: API returned error:', data.error);
      }
    } catch (error) {
      console.error('Frontend: Failed to fetch categories:', error);
    }
  };

  const handleCreateCategory = async () => {
    try {
      console.log('Frontend: Creating category with data:', newCategory);
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCategory,
          storeId
        })
      });
      
      const data = await response.json();
      console.log('Frontend: Category creation response:', data);
      
      if (data.success) {
        console.log('Frontend: Adding new category to local state:', data.data);
        setCategories([...categories, data.data]);
        setNewCategory({ name: '' });
        setShowCategoryDialog(false);
      } else {
        console.error('Frontend: Category creation failed:', data.error);
        alert(data.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Frontend: Failed to create category:', error);
      alert('Failed to create category');
    }
  };

  const handleAddProduct = async (newProduct) => {
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProduct,
          store_id: storeId
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProducts(storeId);
        fetchCategories(storeId); // Refresh categories after product creation
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  const handleEditProduct = async (updatedProduct) => {
    try {
      const response = await fetch(`/api/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProduct),
      });
      
      const data = await response.json();
      if (data.success) {
        fetchProducts(storeId);
        fetchCategories(storeId); // Refresh categories after product update
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const response = await fetch(`/api/products/${productId}`, {
          method: 'DELETE',
        });
        
        const data = await response.json();
        if (data.success) {
          fetchProducts(storeId);
        }
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const categoryOptions = ['all', ...categories.map(cat => cat.name)];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const ProductForm = ({ product, onSubmit, onCancel, categories }) => {
    const [formData, setFormData] = useState(product || {
      name: '',
      selling_price: '',
      category_id: '',
      stock_quantity: '',
      sku: '',
      description: '',
      cost_price: '',
      tax_rate: '8.25',
      min_stock_level: '5',
      unit: 'pcs'
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      await onSubmit({
        ...formData,
        selling_price: parseFloat(formData.selling_price),
        stock_quantity: parseInt(formData.stock_quantity),
        cost_price: parseFloat(formData.cost_price) || 0,
        tax_rate: parseFloat(formData.tax_rate) || 0,
        min_stock_level: parseInt(formData.min_stock_level) || 5
      });
    };

    return (
      <Dialog open={true} onOpenChange={onCancel}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                required
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category_id || ""} 
                onValueChange={(value) => setFormData({...formData, category_id: value})}
                placeholder="Select a category"
              >
                {categories && categories.length > 0 ? (
                  categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>No categories available</SelectItem>
                )}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costPrice">Cost Price</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="sellingPrice">Selling Price</Label>
                <Input
                  id="sellingPrice"
                  type="number"
                  step="0.01"
                  required
                  value={formData.selling_price}
                  onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  required
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})}
                  placeholder="5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter product description"
              />
            </div>
            <div className="flex space-x-3">
              <Button type="submit" className="flex-1">
                {product ? 'Update' : 'Add'} Product
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <AppLayout 
      title="Products"
      description="Manage your product catalog and inventory"
    >
      <div className="space-y-6">
        {/* Category Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Categories</CardTitle>
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCategory}>
                      Create Category
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant="outline"
                  size="sm"
                >
                  {category.name}
                </Button>
              ))}
              {categories.length === 0 && (
                <p className="text-muted-foreground text-sm">No categories created yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Products
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory} placeholder="All Categories">
  <SelectItem value="all">All Categories</SelectItem>
  {categories.map((category) => (
    <SelectItem key={category.id} value={category.name}>
      {category.name}
    </SelectItem>
  ))}
</Select>
              </div>
              
              <Button onClick={() => setShowAddModal(true)}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {product.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {product.sku}
                      </TableCell>
                      <TableCell>
                        {product.categories?.name || 'Uncategorized'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${parseFloat(product.selling_price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {product.stock_quantity}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          product.stock_quantity > product.min_stock_level 
                            ? 'secondary'
                            : product.stock_quantity > 0
                            ? 'default'
                            : 'destructive'
                        }>
                          {product.stock_quantity > product.min_stock_level ? 'In Stock' : product.stock_quantity > 0 ? 'Low Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProduct(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {showAddModal && (
        <ProductForm
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddModal(false)}
          categories={categories}
        />
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSubmit={handleEditProduct}
          onCancel={() => setEditingProduct(null)}
          categories={categories}
        />
      )}
    </AppLayout>
  );
}
