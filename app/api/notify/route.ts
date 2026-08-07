import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Silent backend notification dispatched:', body);
    return NextResponse.json({
      success: true,
      message: 'Notification dispatched silently',
      data: body,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to dispatch notification' },
      { status: 500 }
    );
  }
}
