const { TRADERS_BY_HANDLE, scenarioState } = require('../../../data-engine');
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { handle } = params;
    const { searchParams } = new URL(request.url);
    const scenarioId = searchParams.get('scenarioId') || 'duel_advancing';
    const viewState = searchParams.get('viewState') || 'current';

    const trader = TRADERS_BY_HANDLE[handle.toLowerCase()];
    if (!trader) {
      return NextResponse.json({ error: 'Trader not found' }, { status: 404 });
    }

    const state = scenarioState(trader, scenarioId, viewState);
    return NextResponse.json({
      trader,
      ...state,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trader stats' }, { status: 500 });
  }
}
