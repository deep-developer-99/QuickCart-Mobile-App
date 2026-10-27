import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from 'react-native-webview/lib/WebViewTypes';
import type { LocationCoordinates } from '../services/locationService';

type Props = {
  coordinates: LocationCoordinates;
  onCoordinatesChange: (coordinates: LocationCoordinates) => void;
  onRequestCurrentLocation?: () => void;
  currentLocationLabel?: string;
  currentLocationLoading?: boolean;
};

type MapMessage = {
  type?: string;
  latitude?: number;
  longitude?: number;
  message?: string;
};

const LEAFLET_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
html,body,#map{height:100%;width:100%;margin:0;padding:0;overflow:hidden;background:#e9eef2}
*{box-sizing:border-box}
.center-pin{position:absolute;left:50%;top:50%;z-index:1000;transform:translate(-50%,-100%);width:44px;height:54px;pointer-events:none;font-size:42px;line-height:48px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));text-align:center}
.pin-shadow{position:absolute;left:50%;top:calc(50% - 2px);z-index:999;width:9px;height:5px;border-radius:50%;transform:translateX(-50%);background:rgba(0,0,0,.24);pointer-events:none}
#mapMessage{display:none;position:absolute;z-index:1200;left:10px;right:10px;top:10px;padding:9px;border-radius:8px;background:#fff;color:#7f1d1d;font:13px sans-serif;text-align:center}
.leaflet-control-attribution{font-size:9px!important}
</style></head><body>
<div id="map"></div><div class="center-pin">📍</div><div class="pin-shadow"></div><div id="mapMessage"></div>
<script>
(function(){
 let map=null,lastSent='',tileLoaded=false,tileReadyNotified=false,tileErrors=0,pendingLocation=null;
 const send=p=>{try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(p))}catch(e){}};
 const showMessage=m=>{const n=document.getElementById('mapMessage');if(n){n.textContent=m;n.style.display='block'}};
 const sendCoordinate=(lat,lng)=>{lat=Number(lat);lng=Number(lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return;const key=lat.toFixed(6)+','+lng.toFixed(6);if(key===lastSent)return;lastSent=key;send({type:'coordinate',latitude:lat,longitude:lng})};
 function initialize(lat,lng){
  if(!window.L){showMessage('Map library failed to load. Check internet and tap Retry.');send({type:'error',message:'Leaflet JavaScript did not load.'});return}
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){send({type:'error',message:'Invalid location coordinates.'});return}
  if(!map){
   map=L.map('map',{center:[lat,lng],zoom:16,minZoom:2,maxZoom:19,dragging:true,touchZoom:true,scrollWheelZoom:true,doubleClickZoom:true,zoomControl:true,attributionControl:true,tap:false});
   const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:2,maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
   tiles.on('tileload',()=>{tileLoaded=true;tileErrors=0;const n=document.getElementById('mapMessage');if(n)n.style.display='none';if(!tileReadyNotified){tileReadyNotified=true;send({type:'tile-loaded'})}});
   tiles.on('tileerror',e=>{tileErrors++;if(!tileLoaded&&tileErrors===3){send({type:'tile-error',message:'OpenStreetMap tile requests are failing.',url:e&&e.tile?e.tile.src:''});showMessage('Map tiles are not loading. Check internet access and tap Retry.')}});
   tiles.addTo(map);
   map.on('moveend',()=>{const c=map.getCenter();sendCoordinate(c.lat,c.lng)});
   map.whenReady(()=>{map.invalidateSize({animate:false});send({type:'ready'});sendCoordinate(lat,lng)});
  }else{
   map.invalidateSize({animate:false});const c=map.getCenter();
   if(Math.abs(c.lat-lat)>0.00001||Math.abs(c.lng-lng)>0.00001)map.setView([lat,lng],map.getZoom(),{animate:false});
  }
 }
 window.setLocation=(lat,lng)=>{lat=Number(lat);lng=Number(lng);pendingLocation={lat:lat,lng:lng};if(window.L)initialize(lat,lng)};
 window.invalidateMapSize=()=>{if(map)setTimeout(()=>map.invalidateSize({animate:false}),100)};
 function loadCss(url){const n=document.createElement('link');n.rel='stylesheet';n.href=url;document.head.appendChild(n)}
 loadCss('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css');
 function loadScript(urls,i){if(i>=urls.length){showMessage('Map library could not load. Check internet and tap Retry.');send({type:'error',message:'Leaflet could not load from available CDNs.'});return}const s=document.createElement('script');s.src=urls[i];s.onload=()=>window.L?(pendingLocation?initialize(pendingLocation.lat,pendingLocation.lng):null):loadScript(urls,i+1);s.onerror=()=>loadScript(urls,i+1);document.head.appendChild(s)}
 loadScript(['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'],0);
 setTimeout(()=>{if(!tileLoaded)send({type:'tiles-timeout',message:'No map tiles loaded. Check network access to tile.openstreetmap.org.'})},12000);
})();
</script></body></html>`;

// Keep these object identities stable. Passing a newly-created source object
// on every render can cause Android WebView to reload the HTML document.
const WEBVIEW_SOURCE = {
  html: LEAFLET_HTML,
  baseUrl: 'https://quickcart.local',
};
const ORIGIN_WHITELIST = ['*'];
const COORDINATE_TOLERANCE = 0.00001;

export default function OpenStreetMapPicker({
  coordinates,
  onCoordinatesChange,
  onRequestCurrentLocation,
  currentLocationLabel = '📍 Use Current Location',
  currentLocationLoading = false,
}: Props) {
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);
  const lastInjected = useRef('');
  const lastReported = useRef<LocationCoordinates | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const inject = useCallback((script: string) => {
    webViewRef.current?.injectJavaScript(`${script}; true;`);
  }, []);
  const invalidateSize = useCallback(() => {
    inject('window.invalidateMapSize && window.invalidateMapSize()');
  }, [inject]);

  useEffect(() => {
    if (!mapReady) return;
    const key = `${coordinates.latitude.toFixed(
      6,
    )},${coordinates.longitude.toFixed(6)}`;
    if (lastInjected.current === key) return;
    lastInjected.current = key;
    inject(
      `window.setLocation && window.setLocation(${coordinates.latitude},${coordinates.longitude})`,
    );
  }, [coordinates.latitude, coordinates.longitude, inject, mapReady]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: MapMessage;
      try {
        msg = JSON.parse(event.nativeEvent.data) as MapMessage;
      } catch {
        return;
      }
      if (msg.type === 'ready') {
        setMapReady(true);
        setErrorMessage('');
        requestAnimationFrame(invalidateSize);
      } else if (msg.type === 'tile-loaded') {
        setTilesLoaded(true);
      } else if (msg.type === 'tile-error') {
        // Individual tile failures are recoverable and must not cover or
        // remount the map while the rest of the tile layer is usable.
        console.warn('[OpenStreetMapPicker]', msg.message, msg);
      } else if (msg.type === 'tiles-timeout') {
        console.warn('[OpenStreetMapPicker]', msg.message, msg);
        if (!tilesLoaded) setErrorMessage(msg.message || 'Map tiles could not load.');
      } else if (msg.type === 'error') {
        console.warn('[OpenStreetMapPicker]', msg.message);
        setErrorMessage(msg.message || 'Map could not load.');
      } else if (
        msg.type === 'coordinate' &&
        Number.isFinite(msg.latitude) &&
        Number.isFinite(msg.longitude)
      ) {
        const next = {
          latitude: msg.latitude as number,
          longitude: msg.longitude as number,
        };
        const previous = lastReported.current;
        if (
          previous &&
          Math.abs(previous.latitude - next.latitude) < COORDINATE_TOLERANCE &&
          Math.abs(previous.longitude - next.longitude) < COORDINATE_TOLERANCE
        ) return;
        lastReported.current = next;
        const key = `${next.latitude.toFixed(6)},${next.longitude.toFixed(6)}`;
        // This coordinate already came from Leaflet; do not inject it back
        // into the same document on the following React render.
        lastInjected.current = key;
        onCoordinatesChange(next);
      }
    },
    [invalidateSize, onCoordinatesChange, tilesLoaded],
  );

  const retry = useCallback(() => {
    setMapReady(false);
    setTilesLoaded(false);
    setErrorMessage('');
    lastInjected.current = '';
    lastReported.current = null;
    webViewRef.current?.reload();
  }, []);

  return (
    <View style={styles.container} onLayout={invalidateSize}>
      {/* The installed WebView typings expose an incompatible generic JSX type with React 19. */}
      {/* @ts-expect-error WebView runtime props are valid for the installed native component. */}
      <WebView
        ref={webViewRef}
        source={WEBVIEW_SOURCE}
        originWhitelist={ORIGIN_WHITELIST}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled
        nestedScrollEnabled
        scrollEnabled={false}
        bounces={false}
        onMessage={handleMessage}
        onLoadEnd={() =>
          setTimeout(() => {
            invalidateSize();
            inject(
              `window.setLocation && window.setLocation(${coordinates.latitude},${coordinates.longitude})`,
            );
          }, 250)
        }
        onError={(event: WebViewErrorEvent) => {
          console.warn('[OpenStreetMapPicker/WebView]', event.nativeEvent);
          setErrorMessage('Map WebView failed. Check internet access.');
        }}
        onHttpError={(event: WebViewHttpErrorEvent) => {
          console.warn(
            '[OpenStreetMapPicker/HTTP]',
            event.nativeEvent.statusCode,
            event.nativeEvent.url,
          );
        }}
        startInLoadingState={false}
        setSupportMultipleWindows={false}
        style={styles.webView}
        accessibilityLabel={t('ui.common.openMapPicker')}
      />
      {!mapReady ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color="#087F8C" />
          <Text style={styles.message}>{t('ui.common.loadingMap')}</Text>
        </View>
      ) : null}
      {errorMessage && !tilesLoaded ? (
        <View pointerEvents="box-none" style={styles.statusOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.message}>{t('ui.common.mapError')}</Text>
            <Pressable style={styles.retry} onPress={retry}>
              <Text style={styles.retryText}>{t('ui.common.retryMap')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {onRequestCurrentLocation ? (
        <Pressable
          style={styles.locationButton}
          onPress={onRequestCurrentLocation}
          disabled={currentLocationLoading}
        >
          <Text style={styles.locationText}>
            {currentLocationLoading ? t('ui.common.locating') : currentLocationLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: '100%',
    minHeight: 260,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#e9eef2',
  },
  webView: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(233,238,242,0.94)',
  },
  statusOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 10,
    alignItems: 'center',
  },
  errorCard: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  message: { color: '#425466', fontSize: 12, textAlign: 'center' },
  retry: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#087F8C',
  },
  retryText: { color: '#fff', fontWeight: '600' },
  locationButton: {
    position: 'absolute',
    right: 10,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  locationText: { color: '#087F8C', fontSize: 12, fontWeight: '600' },
});
