const { getBalanceSeries, getMatchTrades } = require('../../data-engine');
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { matchId } = params;
    const { searchParams } = new URL(request.url);
    const viewState = searchParams.get('viewState') || 'current';
    const bracket = searchParams.get('bracket') || 'A';
    
    const series = getBalanceSeries(matchId, viewState, bracket);
    const trades = getMatchTrades(matchId, viewState, bracket);
    
    if (!series || !trades) {
      return NextResponse.json({ error: 'Match details not found' }, { status: 404 });
    }
    
    return NextResponse.json({ series, trades });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch match details' }, { status: 500 });
  }
}
