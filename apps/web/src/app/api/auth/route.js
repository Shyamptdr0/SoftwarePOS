import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    
    // Mock authentication - replace with real validation
    if (email === 'admin@shreempos.com' && password === 'admin123') {
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@shreempos.com',
          role: 'admin'
        },
        token: 'mock-jwt-token'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid credentials'
    }, { status: 401 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 });
  }
}
