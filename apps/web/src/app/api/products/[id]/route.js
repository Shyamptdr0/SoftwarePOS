import { NextResponse } from 'next/server';
import { getProducts, updateProduct, supabase } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const productData = await request.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }
    
    // Validate required fields
    const requiredFields = ['sku', 'name', 'selling_price'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }
    
    // Get the product to find its store_id
    const existingProducts = await getProducts(productData.store_id);
    const existingProduct = existingProducts.find(p => p.id === id);
    
    if (!existingProduct) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 });
    }
    
    const storeId = existingProduct.store_id;
    
    // Check if SKU already exists for this store (excluding current product)
    const existingSku = existingProducts.find(p => p.sku === productData.sku && p.id !== id);
    
    if (existingSku) {
      return NextResponse.json({
        success: false,
        error: 'SKU already exists'
      }, { status: 400 });
    }
    
    const updatedProduct = await updateProduct(id, productData, storeId);
    
    return NextResponse.json({
      success: true,
      data: updatedProduct
    });
  } catch (error) {
    console.error('Failed to update product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update product'
    }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Product ID is required'
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Failed to delete product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete product'
    }, { status: 500 });
  }
}
