import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Example: Get all users from the database
    // Replace 'users' with any table that exists in your database
    const data = await prisma.users.findMany({
      take: 10, // Limit to 10 records
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from database' },
      { status: 500 }
    );
  }
}
