import {Platform} from 'react-native';
import {getNativeVoiceSearch} from '../native/NativeVoiceSearch';

export type VoiceSearchEvent =
  | {type: 'partial'; text: string}
  | {type: 'final'; text: string}
  | {type: 'speechStart'}
  | {type: 'speechEnd'}
  | {type: 'level'; value: number}
  | {type: 'error'; code: string};

const diagnostic = (message: string, detail?: unknown) => {
  if (__DEV__) console.info(`[VoiceSearch] ${message}`, detail ?? '');
};

export const isVoiceSearchAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    diagnostic(`unsupported platform: ${Platform.OS}`);
    return false;
  }
  const nativeVoiceSearch = getNativeVoiceSearch();
  if (!nativeVoiceSearch) {
    diagnostic('TurboModuleRegistry.get returned null for NativeVoiceSearch at call time');
    return false;
  }
  try {
    const available = await nativeVoiceSearch.isAvailable();
    diagnostic(`native module responded; recognition service available=${available}`);
    return available;
  } catch (error) {
    diagnostic('native isAvailable call failed', error);
    return false;
  }
};

export const subscribeToVoiceSearch = (
  listener: (event: VoiceSearchEvent) => void,
) => {
  const nativeVoiceSearch = Platform.OS === 'android' ? getNativeVoiceSearch() : null;
  if (!nativeVoiceSearch) return () => undefined;
  const subscriptions = [
    nativeVoiceSearch.onPartialResult(text => listener({type: 'partial', text})),
    nativeVoiceSearch.onFinalResult(text => listener({type: 'final', text})),
    nativeVoiceSearch.onSpeechStart(() => listener({type: 'speechStart'})),
    nativeVoiceSearch.onSpeechEnd(() => listener({type: 'speechEnd'})),
    nativeVoiceSearch.onAudioLevel(value => listener({type: 'level', value})),
    nativeVoiceSearch.onRecognitionError(code => listener({type: 'error', code})),
  ];
  return () => subscriptions.forEach(subscription => subscription.remove());
};

export const startVoiceSearch = async (language = 'en-IN') => {
  const nativeVoiceSearch = Platform.OS === 'android' ? getNativeVoiceSearch() : null;
  if (!nativeVoiceSearch) {
    diagnostic(`cannot start: platform=${Platform.OS}, modulePresent=${Boolean(nativeVoiceSearch)}`);
    return false;
  }
  try {
    const started = await nativeVoiceSearch.startListening(language);
    diagnostic(`startListening(${language}) returned ${started}`);
    return started;
  } catch (error) {
    diagnostic('native startListening call failed', error);
    throw error;
  }
};

export const stopVoiceSearch = () => getNativeVoiceSearch()?.stopListening();
export const cancelVoiceSearch = () => getNativeVoiceSearch()?.cancelListening();
