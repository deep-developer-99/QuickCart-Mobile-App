import { AppText as Text } from './AppText';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { radius, spacing, typography, useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import type { OrderStatus } from '../api/orderApi';
import {
  forwardGeocodeAddress,
  ForwardGeocodeError,
  isValidLocationCoordinates,
} from '../services/locationService';

type Coordinate = { latitude: number; longitude: number };
type Props = {
  shopName: string;
  shopAddress: string;
  shopCoordinates?: Coordinate;
  deliveryAddress: string;
  deliveryCoordinates?: Coordinate;
  status: OrderStatus;
};

const mapHtml = (
  shop: Coordinate,
  customer: Coordinate,
  status: OrderStatus,
  labels: { shopPickup: string; delivery: string; simulatedDelivery: string },
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
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#f4f7f8}.leaflet-control-attribution{font-size:9px}</style></head><body><div id="map"></div><script>
function report(type){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:type}))}catch(e){}}
window.addEventListener('error',function(event){if(event.target&&(event.target.tagName==='SCRIPT'||event.target.tagName==='LINK'))report('asset-error');else report('javascript-error')},true);
window.onerror=function(){report('javascript-error');return true};
function initializeMap(){try{if(!window.L){report('leaflet-error');return}const shop=[${shop.latitude},${shop.longitude}],customer=[${customer.latitude},${customer.longitude}],current=[${current.latitude},${current.longitude}];const map=L.map('map',{zoomControl:true,scrollWheelZoom:false}).setView(shop,13);const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);let tileErrors=0;let tileLoaded=false;tiles.on('tileload',function(){tileLoaded=true});tiles.on('tileerror',function(){tileErrors+=1;if(!tileLoaded&&tileErrors>=3)report('tile-error')});const route=L.polyline(${points},{color:'#21BFA6',weight:5,opacity:.9,dashArray:'8 8'}).addTo(map);L.marker(shop).addTo(map).bindPopup(${JSON.stringify(labels.shopPickup)});L.marker(customer).addTo(map).bindPopup(${JSON.stringify(labels.delivery)});L.circleMarker(current,{radius:9,color:'#ffffff',weight:3,fillColor:'#f59e0b',fillOpacity:1}).addTo(map).bindPopup(${JSON.stringify(labels.simulatedDelivery)});if(shop[0]===customer[0]&&shop[1]===customer[1])map.setView(shop,15);else map.fitBounds(route.getBounds().pad(0.18));report('map-ready');setTimeout(function(){if(!tileLoaded&&tileErrors>0)report('tile-error')},12000)}catch(e){report('map-error')}}
</script><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" onerror="report('asset-error')"></script><script>initializeMap()</script></body></html>`;
};

const coordinateErrorMessage = (
  _code: string,
  _location: 'shop' | 'delivery',
): string => 'ui.common.mapError';

const mapErrorMessage = (_type: string): string => 'ui.common.mapError';

const DummyLiveOrderTracking = ({
  shopName,
  shopAddress,
  shopCoordinates,
  deliveryAddress,
  deliveryCoordinates,
  status,
}: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [coordinates, setCoordinates] = useState<{
    shop: Coordinate;
    customer: Coordinate;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [mapAttempt, setMapAttempt] = useState(0);

  const shopLatitude = shopCoordinates?.latitude;
  const shopLongitude = shopCoordinates?.longitude;
  const customerLatitude = deliveryCoordinates?.latitude;
  const customerLongitude = deliveryCoordinates?.longitude;

  useEffect(() => {
    let active = true;
    const resolve = async (): Promise<void> => {
      setLoading(true);
      setLookupError(null);
      setCoordinates(null);
      let resolving: 'shop' | 'delivery' = 'shop';
      try {
        const savedShop = { latitude: shopLatitude, longitude: shopLongitude };
        const shop = isValidLocationCoordinates(savedShop)
          ? savedShop
          : await forwardGeocodeAddress(shopAddress);
        resolving = 'delivery';
        const savedCustomer = {
          latitude: customerLatitude,
          longitude: customerLongitude,
        };
        const customer = isValidLocationCoordinates(savedCustomer)
          ? savedCustomer
          : await forwardGeocodeAddress(deliveryAddress);
        if (active) setCoordinates({ shop, customer });
      } catch (error) {
        if (active) {
          const code =
            error instanceof ForwardGeocodeError ? error.code : 'PROVIDER_ERROR';
          setLookupError(coordinateErrorMessage(code, resolving));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    resolve().catch(() => {
      if (active) {
        setLookupError(
          'We could not look up one of these addresses. Check your connection and try again.',
        );
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [
    shopAddress,
    shopLatitude,
    shopLongitude,
    deliveryAddress,
    customerLatitude,
    customerLongitude,
    lookupAttempt,
  ]);

  const handleMapMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (!message.type || message.type === 'map-ready') {
        setMapError(null);
        return;
      }
      setMapError(mapErrorMessage(message.type));
      console.warn('[OrderTrackingMap]', message.type);
    } catch {
      setMapError(mapErrorMessage('map-error'));
    }
  };

  const retryLookup = () => {
    setLookupError(null);
    setLookupAttempt(value => value + 1);
  };

  const retryMap = () => {
    setMapError(null);
    setMapAttempt(value => value + 1);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('ui.tracking.title')}</Text>
      <Text style={styles.subtitle}>{t('ui.tracking.demoSubtitle')}</Text>
      <View style={styles.routeLabels}>
        <View style={styles.routeDotShop} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.label}>{t('ui.tracking.from')} · {shopName || t('ui.tracking.shop')}</Text>
          <Text style={styles.address} numberOfLines={2}>
            {shopAddress || t('ui.tracking.shopAddressUnavailable')}
          </Text>
        </View>
      </View>
      <View style={styles.routeLabels}>
        <View style={styles.routeDotHome} />
        <View style={styles.routeTextWrap}>
          <Text style={styles.label}>{t('ui.tracking.to')}</Text>
          <Text style={styles.address} numberOfLines={2}>
            {deliveryAddress}
          </Text>
        </View>
      </View>
      {loading ? (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator color={theme.colors.cyan} />
          <Text style={styles.mapMessage}>
            {t('ui.tracking.loading')}
          </Text>
        </View>
      ) : lookupError ? (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapMessage}>{t(lookupError)}</Text>
          <Pressable style={styles.retryButton} onPress={retryLookup}>
            <Text style={styles.retryText}>{t('ui.tracking.retry')}</Text>
          </Pressable>
        </View>
      ) : coordinates ? (
        <View style={styles.mapWrap}>
          <WebView
            key={mapAttempt}
            originWhitelist={['*']}
            source={{
              html: mapHtml(coordinates.shop, coordinates.customer, status, {
                shopPickup: t('ui.tracking.shopPickup'),
                delivery: t('ui.tracking.deliveryMapLabel'),
                simulatedDelivery: t('ui.tracking.demoMapLabel'),
              }),
              baseUrl: 'https://quickcart-bxod.onrender.com/',
            }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            onMessage={handleMapMessage}
            onError={() => setMapError(mapErrorMessage('map-error'))}
            onHttpError={() => setMapError(mapErrorMessage('asset-error'))}
            renderLoading={() => (
              <ActivityIndicator
                style={styles.mapLoader}
                color={theme.colors.cyan}
              />
            )}
          />
          {mapError ? (
            <View style={styles.mapErrorOverlay}>
              <Text style={styles.mapMessage}>{t(mapError)}</Text>
              <Pressable style={styles.retryButton} onPress={retryMap}>
                <Text style={styles.retryText}>{t('ui.common.retryMap')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      <Text style={styles.disclaimer}>
        {t('ui.tracking.notice')}
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
    mapWrap: {
      height: 250,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.grey50,
    },
    map: { flex: 1, backgroundColor: colors.grey50 },
    mapPlaceholder: {
      height: 180,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    mapErrorOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: colors.background,
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
    retryButton: {
      borderRadius: radius.md,
      backgroundColor: colors.cyan,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    retryText: { ...typography.captionSemiBold, color: colors.white },
    mapLoader: { flex: 1 },
    disclaimer: {
      ...typography.overlineRegular,
      color: colors.secondaryText,
      marginTop: spacing.sm,
      lineHeight: 16,
    },
  });

export default DummyLiveOrderTracking;
