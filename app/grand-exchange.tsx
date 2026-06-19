import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Image, ActivityIndicator, useWindowDimensions, Keyboard,
  KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import Svg, {
  Defs, Rect, RadialGradient, Stop, Line, Path, Text as SvgText,
} from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import {
  ItemMapping, LatestPrice, TimeseriesPoint, TimeRange,
  fetchMapping, searchMapping, fetchLatestPrice, fetchTimeseries,
  formatGP, formatVolume, itemIconUrl, TIME_RANGE_CONFIG, TIME_RANGES,
} from '../constants/ge-api';

const WATCHLIST_KEY = 'ge_watchlist';

// Background

function StoneBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Image source={require('../assets/icons/osrs-bg-scale.png')} style={{ width, height }} resizeMode="cover" />
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject as any}>
        <Defs>
          <RadialGradient id="vigGE" cx="50%" cy="45%" r="70%">
            <Stop offset="0%"   stopColor="#0d0900" stopOpacity="0.0" />
            <Stop offset="75%"  stopColor="#0d0900" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0d0900" stopOpacity="0.92" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#vigGE)" />
      </Svg>
    </View>
  );
}

// Price Chart

type ChartProps = {
  data: TimeseriesPoint[];
  width: number;
  range: TimeRange;
};

function PriceChart({ data, width, range }: ChartProps) {
  if (data.length < 2) {
    return (
      <View style={[chartStyles.empty, { width }]}>
        <Text style={chartStyles.emptyText}>Not enough data for this range</Text>
      </View>
    );
  }

  const PAD_LEFT     = 44;
  const PAD_RIGHT    = 4;
  const PAD_TOP      = 8;
  const PRICE_H      = 150;
  const DIVIDER_GAP  = 14;
  const VOL_LABEL_H  = 14;
  const VOL_H        = 36;
  const XAXIS_H      = 20;
  const totalH       = PAD_TOP + PRICE_H + DIVIDER_GAP + VOL_LABEL_H + VOL_H + XAXIS_H;
  const chartW       = width - PAD_LEFT - PAD_RIGHT;

  const priceTop     = PAD_TOP;
  const priceBottom  = PAD_TOP + PRICE_H;
  const volTop       = priceBottom + DIVIDER_GAP + VOL_LABEL_H;
  const volBottom    = volTop + VOL_H;
  const xAxisY       = volBottom + 14;

  const highPoints = data.filter((d) => d.avgHighPrice != null);
  const lowPoints  = data.filter((d) => d.avgLowPrice  != null);

  const allPrices = [
    ...highPoints.map((d) => d.avgHighPrice!),
    ...lowPoints.map((d)  => d.avgLowPrice!),
  ];
  const minPrice   = Math.min(...allPrices);
  const maxPrice   = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const allVol = data.map((d) => (d.highPriceVolume ?? 0) + (d.lowPriceVolume ?? 0));
  const maxVol = Math.max(...allVol, 1);

  const xScale = (i: number) =>
    PAD_LEFT + (i / Math.max(data.length - 1, 1)) * chartW;
  const yPrice = (p: number) =>
    priceTop + PRICE_H - ((p - minPrice) / priceRange) * PRICE_H;

  const buildPath = (points: TimeseriesPoint[], key: 'avgHighPrice' | 'avgLowPrice') => {
    const segs = points.map((d) => {
      const i = data.indexOf(d);
      return `${xScale(i).toFixed(1)},${yPrice(d[key]!).toFixed(1)}`;
    });
    return segs.length ? `M ${segs.join(' L ')}` : '';
  };

  const highPath = buildPath(highPoints, 'avgHighPrice');
  const lowPath  = buildPath(lowPoints,  'avgLowPrice');

  const yLabels = [0, 1, 2, 3].map((i) => ({
    price: minPrice + (priceRange * i) / 3,
    y:     yPrice(minPrice + (priceRange * i) / 3),
  }));

  const rawIndices = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    Math.round(f * (data.length - 1))
  );
  const labelIndices = rawIndices.map((idx, li) => {
    if (li === rawIndices.length - 1) return Math.min(idx, data.length - 1);
    return idx;
  });

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    if (['1H', '6H', '24H'].includes(range)) {
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const volBarW = Math.max(1.5, (chartW / data.length) * 0.7);

  return (
    <Svg width={width} height={totalH}>
      {yLabels.map(({ y }, i) => (
        <Line key={`grid-${i}`}
          x1={PAD_LEFT} y1={y} x2={PAD_LEFT + chartW} y2={y}
          stroke={theme.colors.border} strokeWidth="0.5" strokeDasharray="3,4" />
      ))}
      <Line x1={PAD_LEFT} y1={priceTop} x2={PAD_LEFT} y2={priceBottom}
        stroke={theme.colors.border} strokeWidth="1" />
      <Line x1={PAD_LEFT} y1={priceBottom} x2={PAD_LEFT + chartW} y2={priceBottom}
        stroke={theme.colors.border} strokeWidth="0.5" />
      {yLabels.map(({ price, y }, i) => (
        <SvgText key={`ylabel-${i}`}
          x={PAD_LEFT - 4} y={y + 3}
          textAnchor="end" fontSize="14"
          fill={theme.colors.parchmentDark} fontFamily={theme.fonts.display}>
          {formatGP(Math.round(price))}
        </SvgText>
      ))}
      {highPath ? <Path d={highPath} stroke="#c8a030" strokeWidth="1.8" fill="none" strokeLinejoin="round" /> : null}
      {lowPath  ? <Path d={lowPath}  stroke="#3a8a24" strokeWidth="1.8" fill="none" strokeLinejoin="round" /> : null}
      <Line x1={PAD_LEFT} y1={priceBottom} x2={PAD_LEFT + chartW} y2={priceBottom}
        stroke={theme.colors.border} strokeWidth="0.8" />
      <SvgText
        x={PAD_LEFT + 4} y={priceBottom + DIVIDER_GAP + 8}
        fontSize="12" fill={theme.colors.textMuted}
        fontFamily={theme.fonts.display} letterSpacing="1">
        VOLUME TRADED
      </SvgText>
      <Line x1={PAD_LEFT} y1={volTop} x2={PAD_LEFT} y2={volBottom}
        stroke={theme.colors.border} strokeWidth="1" />
      <Line x1={PAD_LEFT} y1={volBottom} x2={PAD_LEFT + chartW} y2={volBottom}
        stroke={theme.colors.border} strokeWidth="0.8" />
      {data.map((d, i) => {
        const vol  = (d.highPriceVolume ?? 0) + (d.lowPriceVolume ?? 0);
        const barH = Math.max(1, (vol / maxVol) * VOL_H);
        const cx   = xScale(i);
        const x    = Math.max(PAD_LEFT, cx - volBarW / 2);
        const x2   = Math.min(PAD_LEFT + chartW, cx + volBarW / 2);
        const w    = Math.max(1, x2 - x);
        const y    = volBottom - barH;
        return (
          <Rect key={`vol-${i}`}
            x={x} y={y} width={w} height={barH}
            fill="#c8a030" opacity={0.45} rx="0.5" />
        );
      })}
      {labelIndices.map((idx, li) => {
        if (idx >= data.length) return null;
        const ts = data[idx]?.timestamp;
        if (!ts) return null;
        const x = xScale(idx);
        const anchor = li === 0 ? 'start' : li === labelIndices.length - 1 ? 'end' : 'middle';
        return (
          <SvgText key={`xlabel-${idx}`}
            x={x} y={xAxisY}
            textAnchor={anchor} fontSize="14"
            fill={theme.colors.parchmentDark} fontFamily={theme.fonts.display}>
            {formatTimestamp(ts)}
          </SvgText>
        );
      })}
    </Svg>
  );
}

const chartStyles = StyleSheet.create({
  empty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
});

// Item Detail Panel

function priceFont(formatted: string): number {
  const len = formatted.length;
  if (len <= 3) return 34;
  if (len <= 4) return 30;
  if (len <= 5) return 26;
  if (len <= 6) return 22;
  return 18;
}

type ItemDetailProps = {
  item: ItemMapping;
  latest: LatestPrice | null;
  series: TimeseriesPoint[];
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  loadingSeries: boolean;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
  screenWidth: number;
  showBuy: boolean;
  showSell: boolean;
  onToggleBuy: () => void;
  onToggleSell: () => void;
  onViewItems: () => void;
};

function ItemDetailPanel({
  item, latest, series, range, onRangeChange, loadingSeries,
  isWatchlisted, onToggleWatchlist, screenWidth,
  showBuy, showSell, onToggleBuy, onToggleSell, onViewItems,
}: ItemDetailProps) {
  const chartWidth = screenWidth - 44;

  const spread = (latest?.high != null && latest?.low != null)
    ? latest.high - latest.low : null;
  const spreadPct = (spread != null && latest?.low)
    ? ((spread / latest.low) * 100).toFixed(1) : null;

  const filteredSeries = series.map((d) => ({
    ...d,
    avgHighPrice:    showBuy  ? d.avgHighPrice  : null,
    avgLowPrice:     showSell ? d.avgLowPrice   : null,
    highPriceVolume: showBuy  ? d.highPriceVolume : null,
    lowPriceVolume:  showSell ? d.lowPriceVolume  : null,
  }));

  return (
    <View style={detailStyles.container}>
      {/* Item header */}
      <View style={detailStyles.itemHeader}>
        <View style={{ flex: 1 }}>
          <Text style={detailStyles.itemName}>{item.name}</Text>
          <Text style={detailStyles.itemMeta}>
            {item.members ? 'Members' : 'Free to play'}
            {item.limit ? ` · Limit: ${item.limit.toLocaleString()}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={detailStyles.watchlistBtn} onPress={onToggleWatchlist}>
          <Text style={[detailStyles.watchlistStar, isWatchlisted && detailStyles.watchlistStarActive]}>
            {isWatchlisted ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
        {item.icon ? (
          <Image source={{ uri: itemIconUrl(item.icon) }} style={detailStyles.itemIcon} resizeMode="contain" />
        ) : null}
      </View>

      {/* Price tiles */}
      <View style={detailStyles.priceRow}>
        <View style={[detailStyles.priceTile, detailStyles.priceTileBuy]}>
          <Text style={detailStyles.priceTileLabel}>Instant Buy</Text>
          <Text style={[detailStyles.priceTileValue, { fontSize: priceFont(formatGP(latest?.high)) }]}>{formatGP(latest?.high)}</Text>
          <Text style={detailStyles.priceTileGP}>gp</Text>
        </View>
        <View style={detailStyles.priceMiddle}>
          {spread != null ? (
            <>
              <Text style={detailStyles.spreadLabel}>Spread</Text>
              <Text style={detailStyles.spreadValue}>{formatGP(spread)}</Text>
              <Text style={detailStyles.spreadPct}>{spreadPct}%</Text>
            </>
          ) : <Text style={detailStyles.spreadLabel}>—</Text>}
        </View>
        <View style={[detailStyles.priceTile, detailStyles.priceTileSell]}>
          <Text style={detailStyles.priceTileLabel}>Instant Sell</Text>
          <Text style={[detailStyles.priceTileValue, detailStyles.priceTileValueSell, { fontSize: priceFont(formatGP(latest?.low)) }]}>{formatGP(latest?.low)}</Text>
          <Text style={detailStyles.priceTileGP}>gp</Text>
        </View>
      </View>

      {/* Alch values */}
      {(item.highalch || item.lowalch) ? (
        <View style={detailStyles.alchRow}>
          {item.highalch ? <Text style={detailStyles.alchText}>High alch: <Text style={detailStyles.alchValue}>{formatGP(item.highalch)} gp</Text></Text> : null}
          {item.lowalch  ? <Text style={detailStyles.alchText}>Low alch: <Text style={detailStyles.alchValue}>{formatGP(item.lowalch)} gp</Text></Text>  : null}
        </View>
      ) : null}

      {/* Chart controls row */}
      <View style={detailStyles.controlsRow}>
        <View style={detailStyles.rangeRow}>
          {TIME_RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[detailStyles.rangeChip, range === r && detailStyles.rangeChipActive]}
              onPress={() => onRangeChange(r)}
            >
              <Text style={[detailStyles.rangeChipText, range === r && detailStyles.rangeChipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={detailStyles.lineToggleRow}>
          <TouchableOpacity
            style={[detailStyles.lineToggle, showBuy && detailStyles.lineToggleBuyActive]}
            onPress={onToggleBuy}
          >
            <Text style={[detailStyles.lineToggleText, showBuy && detailStyles.lineToggleBuyText]}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[detailStyles.lineToggle, showSell && detailStyles.lineToggleSellActive]}
            onPress={onToggleSell}
          >
            <Text style={[detailStyles.lineToggleText, showSell && detailStyles.lineToggleSellText]}>Sell</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart */}
      <View style={detailStyles.chartContainer}>
        {loadingSeries ? (
          <View style={[chartStyles.empty, { width: chartWidth }]}>
            <ActivityIndicator color={theme.colors.gold} />
          </View>
        ) : (
          <PriceChart data={filteredSeries} width={chartWidth} range={range} />
        )}
      </View>

      {/* Chart legend */}
      <View style={detailStyles.legend}>
        <View style={detailStyles.legendItem}>
          <View style={[detailStyles.legendDot, { backgroundColor: '#c8a030' }]} />
          <Text style={detailStyles.legendText}>Instant Buy</Text>
        </View>
        <View style={detailStyles.legendItem}>
          <View style={[detailStyles.legendDot, { backgroundColor: '#3a8a24' }]} />
          <Text style={detailStyles.legendText}>Instant Sell</Text>
        </View>
        <View style={detailStyles.legendItem}>
          <View style={[detailStyles.legendDot, { backgroundColor: theme.colors.borderGold, opacity: 0.5 }]} />
          <Text style={detailStyles.legendText}>Volume</Text>
        </View>
      </View>

      {/* View in Items button */}
      <TouchableOpacity style={detailStyles.itemsBtn} onPress={onViewItems}>
        <Text style={detailStyles.itemsBtnText}>View {item.name} in Items  ▸</Text>
      </TouchableOpacity>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: { backgroundColor: theme.colors.panel, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 4, padding: 14, gap: 12, marginBottom: 16 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemName: { fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.parchment, letterSpacing: 0.5, includeFontPadding: false },
  itemMeta: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted, marginTop: 3 },
  itemIcon: { width: 36, height: 36 },
  watchlistBtn: { paddingHorizontal: 4 },
  watchlistStar: { fontSize: 26, color: theme.colors.textMuted },
  watchlistStarActive: { color: theme.colors.goldLight },
  priceRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  priceTile: { flex: 1, backgroundColor: theme.colors.background, borderWidth: 1, borderRadius: 3, padding: 10, alignItems: 'center', gap: 2 },
  priceTileBuy: { borderColor: theme.colors.borderGold },
  priceTileSell: { borderColor: theme.colors.green },
  priceTileLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.parchmentDark, letterSpacing: 1, textTransform: 'uppercase' },
  priceTileValue: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.goldLight, includeFontPadding: false },
  priceTileValueSell: { color: theme.colors.greenLight },
  priceTileGP: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.textMuted },
  priceMiddle: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, gap: 2 },
  spreadLabel: { fontFamily: theme.fonts.display, fontSize: 12, color: theme.colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  spreadValue: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchment, includeFontPadding: false },
  spreadPct: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDark },
  alchRow: { flexDirection: 'row', gap: 16 },
  alchText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.parchmentDark },
  alchValue: { color: theme.colors.parchment },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rangeRow: { flexDirection: 'row', gap: 4, flex: 1 },
  rangeChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  rangeChipActive: { borderColor: theme.colors.borderGold, backgroundColor: theme.colors.panelLight },
  rangeChipText: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDim },
  rangeChipTextActive: { color: theme.colors.goldLight },
  lineToggleRow: { flexDirection: 'row', gap: 4 },
  lineToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  lineToggleBuyActive: { borderColor: '#c8a030', backgroundColor: 'rgba(200,160,48,0.15)' },
  lineToggleSellActive: { borderColor: '#3a8a24', backgroundColor: 'rgba(58,138,36,0.15)' },
  lineToggleText: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim },
  lineToggleBuyText: { color: '#c8a030' },
  lineToggleSellText: { color: theme.colors.greenLight },
  chartContainer: { marginHorizontal: -14 },
  legend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchmentDark },
  itemsBtn: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, paddingVertical: 12, alignItems: 'center', backgroundColor: theme.colors.background },
  itemsBtnText: { fontFamily: theme.fonts.display, fontSize: 17, color: theme.colors.gold },
});

// Watchlist Card

type WatchlistCardProps = {
  item: ItemMapping;
  onPress: () => void;
};

function WatchlistCard({ item, onPress }: WatchlistCardProps) {
  const [latest, setLatest] = useState<LatestPrice | null>(null);

  useEffect(() => {
    fetchLatestPrice(item.id).then(setLatest);
  }, [item.id]);

  return (
    <TouchableOpacity style={watchStyles.card} onPress={onPress}>
      {item.icon ? (
        <Image source={{ uri: itemIconUrl(item.icon) }} style={watchStyles.icon} resizeMode="contain" />
      ) : null}
      <Text style={watchStyles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={watchStyles.price}>{formatGP(latest?.high)}</Text>
    </TouchableOpacity>
  );
}

const watchStyles = StyleSheet.create({
  card: { width: 90, backgroundColor: theme.colors.panel, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, padding: 8, alignItems: 'center', justifyContent: 'space-between', minHeight: 100, marginRight: 8 },
  icon: { width: 32, height: 32 },
  name: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchmentDark, paddingTop: 10, textAlign: 'center', flex: 1 },
  price: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.goldLight, includeFontPadding: false, marginTop: 4 },
});

//  Main Screen

export default function GrandExchangeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string; q?: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const [mapping, setMapping] = useState<ItemMapping[]>([]);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemMapping[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemMapping | null>(null);
  const [latest, setLatest] = useState<LatestPrice | null>(null);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [range, setRange] = useState<TimeRange>('24H');
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [watchlist, setWatchlist] = useState<ItemMapping[]>([]);
  const [showBuy, setShowBuy] = useState(true);
  const [showSell, setShowSell] = useState(true);

  const searchTimer = useRef<any>(null);

  useEffect(() => {
    const incoming = params.q || params.search;
    if (incoming && mappingLoaded && mapping.length > 0) {
      const found = mapping.find(
        (m) => m.name.toLowerCase() === (incoming as string).toLowerCase()
      );
      if (found) handleSelectItem(found);
      else setSearchQuery(incoming as string);
    }
  }, [params.q, params.search, mappingLoaded]);

  useEffect(() => {
    const init = async () => {
      const [m, raw] = await Promise.all([
        fetchMapping(),
        AsyncStorage.getItem(WATCHLIST_KEY),
      ]);
      setMapping(m);
      setMappingLoaded(true);
      if (raw) {
        try { setWatchlist(JSON.parse(raw)); } catch {}
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => {
      setSearchResults(searchMapping(mapping, searchQuery));
    }, 200);
  }, [searchQuery, mapping]);

  useEffect(() => {
    if (!selectedItem) return;
    const load = async () => {
      setLoadingLatest(true);
      setLoadingSeries(true);
      const { timestep, points } = TIME_RANGE_CONFIG[range];
      const [l, s] = await Promise.all([
        fetchLatestPrice(selectedItem.id),
        fetchTimeseries(selectedItem.id, timestep),
      ]);
      setLatest(l);
      setSeries(s.slice(-points));
      setLoadingLatest(false);
      setLoadingSeries(false);
    };
    load();
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    const load = async () => {
      setLoadingSeries(true);
      const { timestep, points } = TIME_RANGE_CONFIG[range];
      const s = await fetchTimeseries(selectedItem.id, timestep);
      setSeries(s.slice(-points));
      setLoadingSeries(false);
    };
    load();
  }, [range]);

  const handleSelectItem = useCallback((item: ItemMapping) => {
    setSelectedItem(item);
    setSearchQuery('');
    setSearchResults([]);
    setRange('24H');
    Keyboard.dismiss();
  }, []);

  const toggleWatchlist = useCallback(async () => {
    if (!selectedItem) return;
    const isIn = watchlist.some((w) => w.id === selectedItem.id);
    const updated = isIn
      ? watchlist.filter((w) => w.id !== selectedItem.id)
      : [...watchlist, selectedItem];
    setWatchlist(updated);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  }, [selectedItem, watchlist]);

  const isWatchlisted = selectedItem ? watchlist.some((w) => w.id === selectedItem.id) : false;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StoneBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Pressable onPress={Keyboard.dismiss}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Home</Text>
              </TouchableOpacity>
              <View style={styles.ornamentRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.ornamentLabel}>Old School RuneScape</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
              <Text style={styles.screenTitle}>Grand Exchange</Text>
              <View style={styles.taglineRow}>
                <View style={styles.ornamentLine} />
                <Text style={styles.ornamentSymbol}>✦</Text>
                <Text style={styles.screenSubtitle}>Live Prices & Charts</Text>
                <Text style={styles.ornamentSymbol}>✦</Text>
                <View style={styles.ornamentLine} />
              </View>
            </View>

            {/* Watchlist */}
            {watchlist.length > 0 && (
              <View style={styles.section}>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Watchlist</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {watchlist.map((item) => (
                    <WatchlistCard
                      key={item.id}
                      item={item}
                      onPress={() => handleSelectItem(item)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Search */}
            <View style={styles.section}>
              <View style={styles.skillsHeader}>
                <View style={styles.ornamentLine} />
                <View style={styles.diamond} />
                <Text style={styles.sectionTitle}>Item Search</Text>
                <View style={styles.diamond} />
                <View style={styles.ornamentLine} />
              </View>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={mappingLoaded ? 'Search items…' : 'Loading item data…'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  editable={mappingLoaded}
                />
                {!mappingLoaded && (
                  <ActivityIndicator color={theme.colors.gold} style={{ marginLeft: 10 }} />
                )}
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.searchResultItem}
                      onPress={() => handleSelectItem(item)}
                    >
                      {item.icon ? (
                        <Image source={{ uri: itemIconUrl(item.icon) }} style={styles.searchResultIcon} resizeMode="contain" />
                      ) : <View style={styles.searchResultIcon} />}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        <Text style={styles.searchResultMeta}>
                          {item.members ? 'Members' : 'F2P'}
                          {item.limit ? ` · Limit ${item.limit.toLocaleString()}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Item detail */}
            {selectedItem && !searchResults.length && (
              <View style={styles.section}>
                <View style={styles.skillsHeader}>
                  <View style={styles.ornamentLine} />
                  <View style={styles.diamond} />
                  <Text style={styles.sectionTitle}>Price History</Text>
                  <View style={styles.diamond} />
                  <View style={styles.ornamentLine} />
                </View>
                {loadingLatest ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator color={theme.colors.gold} />
                    <Text style={styles.loadingText}>Fetching prices…</Text>
                  </View>
                ) : (
                  <ItemDetailPanel
                    item={selectedItem}
                    latest={latest}
                    series={series}
                    range={range}
                    onRangeChange={setRange}
                    loadingSeries={loadingSeries}
                    isWatchlisted={isWatchlisted}
                    onToggleWatchlist={toggleWatchlist}
                    screenWidth={screenWidth}
                    showBuy={showBuy}
                    showSell={showSell}
                    onToggleBuy={() => setShowBuy((v) => !v)}
                    onToggleSell={() => setShowSell((v) => !v)}
                    onViewItems={() => router.push({ pathname: '/items' as any, params: { q: selectedItem.name } })}
                  />
                )}
              </View>
            )}

            {/* Empty state */}
            {!selectedItem && !searchResults.length && watchlist.length === 0 && mappingLoaded && (
              <View style={styles.emptyState}>
                <Image source={require('../assets/icons/menu/ge-logo.png')} style={styles.emptyIcon} resizeMode="contain" />
                <Text style={styles.emptyText}>Search for any item to see live GE prices and price history charts.</Text>
                <Text style={styles.emptySubtext}>Favourite items to add them to your watchlist.</Text>
              </View>
            )}

          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 6, marginBottom: 12, gap: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 4, paddingBottom: 10 },
  backButtonText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.gold, letterSpacing: 0.5 },
  screenTitle: { fontFamily: theme.fonts.display, fontSize: 34, color: theme.colors.gold, letterSpacing: 1, textShadowColor: 'rgba(200,160,48,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, includeFontPadding: false, lineHeight: 42 },
  screenSubtitle: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.parchmentDim, fontStyle: 'italic', letterSpacing: 1, includeFontPadding: false },
  ornamentRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  taglineRow: { flexDirection: 'row', alignItems: 'center', width: '90%', gap: 6 },
  ornamentLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  ornamentSymbol: { color: theme.colors.goldDim, fontSize: 10 },
  ornamentLabel: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.goldDim, letterSpacing: 3, textTransform: 'uppercase', includeFontPadding: false },
  section: { marginBottom: 20 },
  skillsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  diamond: { width: 6, height: 6, backgroundColor: theme.colors.gold, transform: [{ rotate: '45deg' }], flexShrink: 0 },
  sectionTitle: { fontFamily: theme.fonts.display, fontSize: 20, color: theme.colors.goldLight, letterSpacing: 2, textTransform: 'uppercase', includeFontPadding: false },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, borderWidth: 1.5, borderColor: theme.colors.borderGold, borderRadius: 3, backgroundColor: theme.colors.background, paddingHorizontal: 14, paddingVertical: 12, fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.parchment },
  searchResults: { marginTop: 4, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 3, backgroundColor: theme.colors.panel, overflow: 'hidden' },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  searchResultIcon: { width: 28, height: 28 },
  searchResultName: { fontFamily: theme.fonts.display, fontSize: 15, color: theme.colors.parchment },
  searchResultMeta: { fontFamily: theme.fonts.display, fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  loadingBox: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { fontFamily: theme.fonts.display, fontSize: 18, color: theme.colors.parchmentDim },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyIcon: { width: 56, height: 56, opacity: 0.5 },
  emptyText: { fontFamily: theme.fonts.display, fontSize: 19, color: theme.colors.parchmentDim, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  emptySubtext: { fontFamily: theme.fonts.display, fontSize: 16, color: theme.colors.textMuted, textAlign: 'center' },
});