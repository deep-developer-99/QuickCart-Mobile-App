import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import type { LocationCoordinates } from '../services/locationService';

// The public OSM tile server is suitable for development and low-volume use
// with attribution. Production deployments should replace this URL with a
// policy-compliant/self-hosted tile service if their traffic exceeds OSM's
// published tile usage policy; no private key is embedded here.
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

const LEAFLET_HTML = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQ3M3jGQZ7jQ8M9p4M7q4V7k5dKpJ4E=" crossorigin="" />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
      body { overflow: hidden; background: #e9eef2; }
      .leaflet-control-attribution { font-size: 9px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      let map;
      let marker;
      let selected = null;
      const send = (payload) => window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      const setMarker = (latitude, longitude) => {
        selected = [latitude, longitude];
        if (!marker) {
          marker = L.marker(selected, { draggable: true }).addTo(map);
          marker.on('dragend', () => {
            const point = marker.getLatLng();
            selected = [point.lat, point.lng];
            send({ type: 'coordinate', latitude: point.lat, longitude: point.lng });
          });
        } else {
          marker.setLatLng(selected);
        }
      };
      const initialize = (latitude, longitude) => {
        if (!map) {
          map = L.map('map', { zoomControl: true, attributionControl: true }).setView([latitude, longitude], 17);
          L.tileLayer('${OSM_TILE_URL}', {
            maxZoom: 19,
            attribution: '${OSM_TILE_ATTRIBUTION}'
          }).addTo(map);
          map.on('moveend', () => {
            const center = map.getCenter();
            setMarker(center.lat, center.lng);
            send({ type: 'coordinate', latitude: center.lat, longitude: center.lng });
          });
          send({ type: 'ready' });
        }
        setMarker(latitude, longitude);
        map.setView([latitude, longitude], map.getZoom() < 10 ? 17 : map.getZoom(), { animate: true });
      };
      window.setLocation = (latitude, longitude) => initialize(latitude, longitude);
    </script>
  </body>
</html>`;

type Props = {
  coordinates: LocationCoordinates | null;
  onCoordinatesChange: (coordinates: LocationCoordinates) => void;
};

export default function OpenStreetMapPicker({
  coordinates,
  onCoordinatesChange,
}: Props) {
  const webViewRef = useRef<WebView>(null);

  const sendCoordinatesToMap = useCallback(() => {
    if (!coordinates) return;
    webViewRef.current?.injectJavaScript(
      `window.setLocation(${coordinates.latitude},${coordinates.longitude}); true;`,
    );
  }, [coordinates]);

  useEffect(() => {
    sendCoordinatesToMap();
  }, [sendCoordinatesToMap]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        latitude?: number;
        longitude?: number;
      };

      if (
        payload.type === 'coordinate' &&
        Number.isFinite(payload.latitude) &&
        Number.isFinite(payload.longitude)
      ) {
        onCoordinatesChange({
          latitude: payload.latitude as number,
          longitude: payload.longitude as number,
        });
      }
    } catch {
      // Ignore malformed messages from the map document.
    }
  };

  return (
    <View style={styles.container}>
      {/* The installed WebView release exposes a generic default type that
          conflicts with React 19's JSX inference, while the runtime API is
          the standard WebView component. */}
      {/* @ts-expect-error react-native-webview generic JSX typing issue */}
      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_HTML, baseUrl: 'https://quickcart.local' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onLoadEnd={sendCoordinatesToMap}
        startInLoadingState
        setSupportMultipleWindows={false}
        accessibilityLabel="OpenStreetMap location picker"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 230,
    overflow: 'hidden',
    borderRadius: 14,
  },
});
