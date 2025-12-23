'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { getProducts } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Package, X } from 'lucide-react';

export default function POSPage() {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [storeId, setStoreId] = useState('');
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: ''
  });

  useEffect(() => {
    const currentStore = localStorage.getItem('currentStore') || '550e8400-e29b-41d4-a716-446655440001';
    setStoreId(currentStore);
    fetchProducts(currentStore);
  }, []);

  const fetchProducts = async (storeId) => {
    try {
      setLoading(true);
      const productsData = await getProducts(storeId);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const addToCart = (product) => {
    if (product.stock_quantity === 0) {
      alert('Product is out of stock');
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        if (newQuantity > product.stock_quantity) {
          alert('Cannot add more than available stock');
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      const product = products.find(p => p.id === productId);
      if (quantity > product.stock_quantity) {
        alert('Cannot exceed available stock');
        return;
      }
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.selling_price * item.quantity), 0);
  };

  const calculateTax = () => {
    return cart.reduce((total, item) => {
      const itemTotal = item.selling_price * item.quantity;
      return total + (itemTotal * (item.tax_rate / 100));
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    try {
      const saleData = {
        bill_number: `BILL-${Date.now()}`,
        customer_name: customerInfo.name || 'Walk-in Customer',
        customer_phone: customerInfo.phone || '',
        subtotal: calculateSubtotal(),
        discount_amount: 0,
        tax_amount: calculateTax(),
        total_amount: calculateTotal(),
        payment_method: paymentMethod,
        payment_status: 'paid',
        staff_id: '550e8400-e29b-41d4-a716-446655440011', // Default staff ID
        store_id: storeId,
        notes: '',
        sale_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price,
          discount_amount: 0,
          tax_amount: (item.selling_price * item.quantity) * (item.tax_rate / 100),
          total_price: item.selling_price * item.quantity
        }))
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sale');
      }
      
      alert(`Sale completed successfully! Total: $${calculateTotal().toFixed(2)}`);
      setCart([]);
      setCustomerInfo({ name: '', phone: '' });
      
      // Refresh products to update stock
      await fetchProducts(storeId);
    } catch (error) {
      console.error('Failed to complete sale:', error);
      alert('Failed to complete sale. Please try again.');
    }
  };

  return (
    <AppLayout 
      title="POS Terminal"
      description="Process sales and manage transactions"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-muted rounded-lg h-32 animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-2 flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium text-sm mb-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {product.sku}
                        </p>
                        <p className="text-lg font-bold text-primary">
                          ${product.selling_price}
                        </p>
                        <Badge variant={product.stock_quantity > 0 ? 'secondary' : 'destructive'} className="mt-2">
                          Stock: {product.stock_quantity}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Shopping Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    placeholder="Enter customer name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone Number</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Enter phone number"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  />
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${item.selling_price} each
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            ${(item.selling_price * item.quantity).toFixed(2)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span>${calculateTax().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="mobile">Mobile Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleCheckout} 
                      className="w-full"
                      disabled={cart.length === 0}
                    >
                      Complete Sale
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
