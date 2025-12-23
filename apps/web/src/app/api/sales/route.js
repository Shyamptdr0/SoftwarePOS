import { NextResponse } from 'next/server';
import { getSales, createSale } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }
    
    const sales = await getSales(storeId, limit);
    
    return NextResponse.json({
      success: true,
      data: sales
    });
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch sales'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const saleData = await request.json();
    
    // Validate required fields
    const requiredFields = ['bill_number', 'total_amount', 'payment_method', 'store_id', 'staff_id', 'sale_items'];
    for (const field of requiredFields) {
      if (!saleData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }
    
    // Validate sale items
    if (!Array.isArray(saleData.sale_items) || saleData.sale_items.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Sale items are required'
      }, { status: 400 });
    }
    
    const newSale = await createSale(saleData);
    
    return NextResponse.json({
      success: true,
      data: newSale
    });
  } catch (error) {
    console.error('Failed to create sale:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create sale'
    }, { status: 500 });
  }
}
