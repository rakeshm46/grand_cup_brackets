const { buildMatches } = require('../data-engine');
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewState = searchParams.get('viewState') || 'current';
    const bracket = searchParams.get('bracket') || 'A';
    
    const matches = buildMatches(viewState, bracket);
    return NextResponse.json(matches);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch matches' }, { status: 500 });
  }
}
