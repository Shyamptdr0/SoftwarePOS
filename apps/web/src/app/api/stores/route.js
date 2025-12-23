import { NextResponse } from 'next/server';
import { getStores } from '@/lib/db';

export async function GET() {
  try {
    const stores = await getStores();
    
    return NextResponse.json({
      success: true,
      data: stores
    });
  } catch (error) {
    console.error('Failed to fetch stores:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stores'
    }, { status: 500 });
  }
}
