import { NextResponse } from 'next/server';
import { getInventoryTransactions, createInventoryTransaction, getProducts } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit')) || 100;
    
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }
    
    const transactions = await getInventoryTransactions(storeId, limit);
    
    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Failed to fetch inventory transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inventory transactions'
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const transactionData = await request.json();
    
    // Validate required fields
    const requiredFields = ['product_id', 'transaction_type', 'quantity', 'store_id'];
    for (const field of requiredFields) {
      if (!transactionData[field]) {
        return NextResponse.json({
          success: false,
          error: `${field} is required`
        }, { status: 400 });
      }
    }
    
    // Validate transaction type
    if (!['in', 'out', 'adjustment'].includes(transactionData.transaction_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid transaction type. Must be: in, out, or adjustment'
      }, { status: 400 });
    }
    
    // Validate quantity
    if (transactionData.quantity <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Quantity must be greater than 0'
      }, { status: 400 });
    }
    
    const newTransaction = await createInventoryTransaction(transactionData);
    
    return NextResponse.json({
      success: true,
      data: newTransaction
    });
  } catch (error) {
    console.error('Failed to create inventory transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create inventory transaction'
    }, { status: 500 });
  }
}
