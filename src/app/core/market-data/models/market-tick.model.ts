export interface MarketTick {
  symbol: string;
  venue: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  bid?: number;
  ask?: number;
  timestamp: number | string;
}
