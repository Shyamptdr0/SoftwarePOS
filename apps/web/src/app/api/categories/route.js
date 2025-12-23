import { NextResponse } from 'next/server';
import { getCategories, createCategory } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    
    console.log('Fetching categories for store:', storeId);
    
    if (!storeId) {
      console.log('Store ID missing in request');
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }
    
    const categories = await getCategories(storeId);
    console.log('Categories fetched:', categories);
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch categories'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, storeId } = body;
    
    console.log('Category creation request:', { name, description, storeId });
    
    if (!name || !storeId) {
      console.log('Missing required fields:', { name, storeId });
      return NextResponse.json({
        success: false,
        error: 'Name and store ID are required'
      }, { status: 400 });
    }
    
    const category = await createCategory({ name, description, store_id: storeId });
    console.log('Category created successfully:', category);
    
    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create category'
    }, { status: 500 });
  }
}
