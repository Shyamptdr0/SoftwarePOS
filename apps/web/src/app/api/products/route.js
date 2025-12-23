import { NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }
    
    const products = await getProducts(storeId);
    
    return NextResponse.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const productData = await request.json();
    
    // Validate required fields
    const requiredFields = ['sku', 'name', 'selling_price', 'store_id'];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }
    
    // Check if SKU already exists for this store
    const existingProducts = await getProducts(productData.store_id);
    const existingSku = existingProducts.find(p => p.sku === productData.sku);
    
    if (existingSku) {
      return NextResponse.json({
        success: false,
        error: 'SKU already exists'
      }, { status: 400 });
    }
    
    const newProduct = await createProduct(productData);
    
    return NextResponse.json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create product'
    }, { status: 500 });
  }
}
