import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, AppState, BackHandler,
  Linking, Modal, PermissionsAndroid, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {useIsFocused} from '@react-navigation/native';
import {radius, spacing, typography, useTheme} from '../theme';
import {cancelVoiceSearch, isVoiceSearchAvailable, startVoiceSearch, stopVoiceSearch, subscribeToVoiceSearch, type VoiceSearchEvent} from '../services/voiceSearchService';
import {AppText as Text} from './AppText';
import {normalizeVoiceQuery, VoiceSearchSessionGuard} from '../services/voiceSearchLifecycle';

type VoiceState = 'ready' | 'requesting' | 'listening' | 'detected' | 'processing' | 'recognized' | 'noSpeech' | 'error' | 'denied' | 'unavailable';

export default function VoiceSearchModal({visible, onDismiss, onResult}: {
  visible: boolean;
  onDismiss: () => void;
  onResult: (query: string) => void;
}) {
  const {t} = useTranslation();
  const isFocused = useIsFocused();
  const {theme} = useTheme();
  const [state, setState] = useState<VoiceState>('ready');
  const [transcript, setTranscript] = useState('');
  const [level, setLevel] = useState(0.12);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const levelRef = useRef(0.12);
  const sessionGuard = useRef(new VoiceSearchSessionGuard());
  const activeSession = useRef(0);
  const transcriptRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  const onResultRef = useRef(onResult);
  onDismissRef.current = onDismiss;
  onResultRef.current = onResult;

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
    finalTimerRef.current = null;
  }, []);
  const dismiss = useCallback(() => {
    clearTimer();
    sessionGuard.current.cancel();
    cancelVoiceSearch();
    onDismissRef.current();
  }, [clearTimer]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {if (mounted) setReducedMotion(value);}).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {mounted = false; subscription.remove();};
  }, []);

  const start = useCallback(async () => {
    clearTimer();
    const sessionId = sessionGuard.current.begin();
    activeSession.current = sessionId;
    transcriptRef.current = '';
    setTranscript('');
    setState('requesting');
    if (Platform.OS !== 'android') {setState('unavailable'); return;}
    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (!sessionGuard.current.isActive(sessionId)) return;
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        if (__DEV__) console.warn(`[VoiceSearch] RECORD_AUDIO permission denied: ${permission}`);
        sessionGuard.current.finish(sessionId);
        setState(permission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'denied' : 'denied');
        return;
      }
      if (__DEV__) console.info('[VoiceSearch] RECORD_AUDIO permission granted');
      if (!await isVoiceSearchAvailable()) {sessionGuard.current.finish(sessionId); setState('unavailable'); return;}
      if (!sessionGuard.current.isActive(sessionId)) return;
      const started = await startVoiceSearch('en-IN');
      if (!sessionGuard.current.isActive(sessionId)) {if (started) cancelVoiceSearch(); return;}
      if (!started) {sessionGuard.current.finish(sessionId); setState('error'); return;}
      setState('listening');
      timerRef.current = setTimeout(() => {
        if (!sessionGuard.current.finish(sessionId)) return;
        cancelVoiceSearch();
        setState(transcriptRef.current ? 'processing' : 'noSpeech');
      }, 12_000);
    } catch {
      if (sessionGuard.current.isActive(sessionId)) {
        sessionGuard.current.finish(sessionId);
        setState('error');
      }
    }
  }, [clearTimer]);

  useEffect(() => {
    if (!visible) return;
    const guard = sessionGuard.current;
    setState('ready');
    const unsubscribe = subscribeToVoiceSearch((event: VoiceSearchEvent) => {
      const sessionId = activeSession.current;
      if (!guard.isActive(sessionId)) return;
      if (event.type === 'partial') {transcriptRef.current = event.text; setTranscript(event.text); setState(event.text ? 'detected' : 'listening');}
      else if (event.type === 'speechStart') setState('detected');
      else if (event.type === 'speechEnd') setState('processing');
      else if (event.type === 'level') {
        levelRef.current = Math.max(0, Math.min(1, (event.value + 2) / 14));
      } else if (event.type === 'final') {
        if (!guard.finish(sessionId)) return;
        clearTimer();
        const query = normalizeVoiceQuery(event.text);
        transcriptRef.current = query;
        setTranscript(query);
        if (query) {
          setState('recognized');
          finalTimerRef.current = setTimeout(() => onResultRef.current(query), 220);
        } else setState('noSpeech');
      } else if (event.type === 'error') {
        if (!guard.finish(sessionId)) return;
        clearTimer();
        setState(event.code === 'ERROR_NO_MATCH' || event.code === 'ERROR_SPEECH_TIMEOUT' ? 'noSpeech' : 'error');
      }
    });
    const app = AppState.addEventListener('change', next => {if (next !== 'active') dismiss();});
    const back = BackHandler.addEventListener('hardwareBackPress', () => {dismiss(); return true;});
    if (visible) start();
    return () => {unsubscribe(); app.remove(); back.remove(); clearTimer(); guard.cancel(); cancelVoiceSearch(); pulse.stopAnimation();};
  }, [visible, dismiss, pulse, start, clearTimer]);

  useEffect(() => {
    if (visible && !isFocused) dismiss();
  }, [visible, isFocused, dismiss]);

  useEffect(() => {
    if (visible && (state === 'listening' || state === 'detected') && !reducedMotion) {
      const animation = Animated.loop(Animated.sequence([
        Animated.timing(pulse, {toValue: 1.18, duration: 650, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1, duration: 650, useNativeDriver: true}),
      ]));
      animation.start();
      const levels = setInterval(() => setLevel(levelRef.current), 120);
      return () => {animation.stop(); clearInterval(levels); pulse.setValue(1);};
    }
    pulse.setValue(1);
    return undefined;
  }, [visible, state, reducedMotion, pulse]);

  const stateText: Record<VoiceState, string> = {
    ready: t('ui.search.voice.ready'), requesting: t('ui.search.voice.requesting'), listening: t('ui.search.voice.listening'), detected: t('ui.search.voice.listening'),
    processing: t('ui.search.voice.processing'), recognized: t('ui.search.voice.recognized'), noSpeech: t('ui.search.voice.noSpeech'),
    error: t('ui.search.voice.error'), denied: t('ui.search.voice.denied'), unavailable: t('ui.search.voice.unavailable'),
  };
  const canRetry = ['noSpeech', 'error', 'unavailable', 'denied'].includes(state);
  const waveHeights = [0.24, 0.42, 0.72, 0.5, 1, 0.6, 0.38, 0.76, 0.46, 0.25, 0.58, 0.34];

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel={t('ui.search.voice.close')} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, {backgroundColor: theme.colors.surface}]}>
          <View style={[styles.handle, {backgroundColor: theme.colors.grey100}]} />
          <View style={styles.topRow}>
            <View style={{width: 42}} />
            <Text style={[styles.title, {color: theme.colors.text}]}>{stateText[state]}</Text>
            <Pressable onPress={dismiss} style={styles.close} accessibilityRole="button" accessibilityLabel={t('ui.search.voice.close')}><Text style={[styles.closeText, {color: theme.colors.secondaryText}]}>×</Text></Pressable>
          </View>
          <Text style={[styles.helper, {color: theme.colors.secondaryText}]}>{t('ui.search.voice.helper')}</Text>
          <View style={styles.wave} accessibilityLabel={t('ui.search.voice.waveform')}>
            {waveHeights.map((height, index) => <View key={index} style={[styles.waveBar, {height: 8 + height * (state === 'listening' || state === 'detected' ? 25 + level * 12 : 20), backgroundColor: theme.colors.cyan, opacity: state === 'listening' || state === 'detected' ? 0.65 + height * 0.35 : 0.45}]} />)}
          </View>
          <View style={styles.transcriptBox}>
            <Text style={[styles.transcript, {color: transcript ? theme.colors.text : theme.colors.grey150}]}>{transcript || t('ui.search.voice.prompt')}</Text>
          </View>
          <View style={styles.micArea}>
            <Animated.View style={[styles.pulse, {borderColor: theme.colors.cyan, transform: [{scale: pulse}], opacity: state === 'listening' || state === 'detected' ? 0.28 : 0.12}]} />
            <Pressable disabled={state === 'requesting' || state === 'processing'} onPress={() => state === 'listening' || state === 'detected' ? (stopVoiceSearch(), setState('processing')) : start()} style={[styles.micButton, {backgroundColor: theme.colors.cyan}]} accessibilityRole="button" accessibilityLabel={t('ui.search.voice.mic')}>
              {state === 'requesting' || state === 'processing' ? <ActivityIndicator color={theme.colors.white} /> : <Svg width={32} height={32} viewBox="0 0 24 24" fill="none"><Path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm7-3.5a7 7 0 0 1-14 0M12 18.5V22m-4 0h8" stroke={theme.colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
            </Pressable>
          </View>
          <Text style={[styles.privacy, {color: theme.colors.secondaryText}]}>{t('ui.search.voice.privacy')}</Text>
          <View style={styles.actions}>
            {canRetry ? <Pressable onPress={start} style={[styles.actionButton, {borderColor: theme.colors.border}]}><Text style={[styles.actionText, {color: theme.colors.text}]}>{t('ui.search.voice.retry')}</Text></Pressable> : <Pressable onPress={dismiss} style={[styles.actionButton, {borderColor: theme.colors.border}]}><Text style={[styles.actionText, {color: theme.colors.text}]}>{t('ui.search.voice.cancel')}</Text></Pressable>}
            {state === 'denied' ? <Pressable onPress={() => Linking.openSettings()} style={[styles.actionButton, {backgroundColor: theme.colors.cyan, borderColor: theme.colors.cyan}]}><Text style={[styles.actionText, {color: theme.colors.white}]}>{t('ui.search.voice.settings')}</Text></Pressable> : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end'},
  sheet: {borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingTop: spacing.md, minHeight: 490, alignItems: 'center'},
  handle: {width: 40, height: 4, borderRadius: 4, marginBottom: spacing.lg},
  topRow: {width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {...typography.heading3SemiBold, textAlign: 'center'},
  close: {width: 42, height: 42, alignItems: 'center', justifyContent: 'center'},
  closeText: {fontSize: 30, lineHeight: 34},
  helper: {...typography.body2Regular, marginTop: spacing.xs},
  wave: {height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.xl},
  waveBar: {width: 4, borderRadius: 4},
  transcriptBox: {height: 52, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm},
  transcript: {...typography.body1Medium, textAlign: 'center', fontSize: 18},
  micArea: {width: 150, height: 150, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md},
  pulse: {position: 'absolute', width: 136, height: 136, borderRadius: 68, borderWidth: 2},
  micButton: {width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', elevation: 4},
  privacy: {...typography.captionRegular, textAlign: 'center', marginTop: spacing.sm, maxWidth: 300},
  actions: {flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg},
  actionButton: {minWidth: 126, height: 48, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center'},
  actionText: {...typography.button2},
});

