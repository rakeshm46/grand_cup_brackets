const { TRADERS } = require('../data-engine');
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bracket = searchParams.get('bracket');

    if (bracket && ['A', 'B', 'C', 'D'].includes(bracket.toUpperCase())) {
      const filtered = TRADERS.filter(t => t.bracket === bracket.toUpperCase());
      return NextResponse.json(filtered);
    }

    return NextResponse.json(TRADERS);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch traders' }, { status: 500 });
  }
}
