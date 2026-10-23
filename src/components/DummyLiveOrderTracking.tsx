import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import WebView from 'react-native-webview';
import { radius, spacing, typography, useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import type { OrderStatus } from '../api/orderApi';

type Coordinate = { latitude: number; longitude: number };
type Props = {
  shopName: string;
  shopAddress: string;
  deliveryAddress: string;
  deliveryCoordinates?: Coordinate;
  status: OrderStatus;
};

const geocode = async (query: string): Promise<Coordinate | null> => {
  if (!query.trim()) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        query,
      )}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'QuickCartMobile/1.0',
        },
      },
    );
    if (!response.ok) return null;
    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
    }>;
    if (!results.length) return null;
    const latitude = Number(results[0].lat);
    const longitude = Number(results[0].lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  } catch {
    return null;
  }
};

const mapHtml = (
  shop: Coordinate,
  customer: Coordinate,
  status: OrderStatus,
) => {
  const progress =
    status === 'Delivered' ? 1 : status === 'Out for Delivery' ? 0.55 : 0;
  const current = {
    latitude: shop.latitude + (customer.latitude - shop.latitude) * progress,
    longitude:
      shop.longitude + (customer.longitude - shop.longitude) * progress,
  };
  const points = JSON.stringify([
    [shop.latitude, shop.longitude],
    [customer.latitude, customer.longitude],
  ]);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#f4f7f8}.leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const shop=[${shop.latitude},${shop.longitude}], customer=[${customer.latitude},${customer.longitude}], current=[${current.latitude},${current.longitude}];const map=L.map('map',{zoomControl:true,scrollWheelZoom:false}).setView(shop,13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);const route=L.polyline(${points},{color:'#21BFA6',weight:5,opacity:.9,dashArray:'8 8'}).addTo(map);L.marker(shop).addTo(map).bindPopup('Shop / pickup location');L.marker(customer).addTo(map).bindPopup('Your delivery address');L.circleMarker(current,{radius:9,color:'#ffffff',weight:3,fillColor:'#f59e0b',fillOpacity:1}).addTo(map).bindPopup('Dummy delivery location');map.fitBounds(route.getBounds().pad(0.18));</script></body></html>`;
};

const DummyLiveOrderTracking = ({
  shopName,
  shopAddress,
  deliveryAddress,
  deliveryCoordinates,
  status,
}: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [coordinates, setCoordinates] = useState<{
    shop: Coordinate;
    customer: Coordinate;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const resolve = async (): Promise<void> => {
      setLoading(true);

      try {
        const customer =
          deliveryCoordinates ?? (await geocode(deliveryAddress));

        const shop = await geocode(shopAddress);

        if (active) {
          setCoordinates(shop && customer ? { shop, customer } : null);
        }
      } catch (error) {
        console.error('Failed to resolve tracking coordinates:', error);

        if (active) {
          setCoordinates(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    resolve().catch((error: unknown) => {
      console.error('Order tracking initialization failed:', error);
    });

    return () => {
      active = false;
    };
  }, [shopAddress, deliveryAddress, deliveryCoordinates]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live order tracking</Text>
      <Text style={styles.subtitle}>Demo tracking · location is simulated</Text>
      <View style={styles.routeLabels}>
        <View style={styles.routeDotShop} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.label}>FROM · {shopName || 'Shop'}</Text>
          <Text style={styles.address} numberOfLines={2}>
            {shopAddress || 'Shop address unavailable'}
          </Text>
        </View>
      </View>
      <View style={styles.routeLabels}>
        <View style={styles.routeDotHome} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.label}>TO · YOUR ADDRESS</Text>
          <Text style={styles.address} numberOfLines={2}>
            {deliveryAddress}
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color={theme.colors.cyan} />
          <Text style={styles.mapMessage}>
            Finding locations on OpenStreetMap…
          </Text>
        </View>
      ) : coordinates ? (
        <WebView
          originWhitelist={['*']}
          source={{
            html: mapHtml(coordinates.shop, coordinates.customer, status),
          }}
          style={styles.map}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator
              style={styles.mapLoader}
              color={theme.colors.cyan}
            />
          )}
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapMessage}>
            We couldn’t locate one of the addresses on the map. Please check the
            shop and delivery address.
          </Text>
        </View>
      )}
      <Text style={styles.disclaimer}>
        This is a visual demo only. The marker does not represent a real
        delivery partner’s GPS location.
      </Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginTop: spacing.md,
      overflow: 'hidden',
    },
    title: { ...typography.body2Medium, color: colors.text },
    subtitle: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    routeLabels: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    routeDotShop: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.cyan,
      marginTop: 4,
      marginRight: spacing.sm,
    },
    routeDotHome: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#F59E0B',
      marginTop: 4,
      marginRight: spacing.sm,
    },
    routeTextWrap: { flex: 1 },
    label: { ...typography.overlineSemiBold, color: colors.secondaryText },
    address: { ...typography.captionRegular, color: colors.text, marginTop: 2 },
    map: {
      height: 250,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.grey50,
    },
    mapPlaceholder: {
      height: 180,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    mapMessage: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      textAlign: 'center',
    },
    mapLoader: { flex: 1 },
    disclaimer: {
      ...typography.overlineRegular,
      color: colors.secondaryText,
      marginTop: spacing.sm,
      lineHeight: 16,
    },
  });

export default DummyLiveOrderTracking;
