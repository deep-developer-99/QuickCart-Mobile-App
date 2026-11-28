import type {CodegenTypes, TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  startListening(language: string): Promise<boolean>;
  stopListening(): void;
  cancelListening(): void;
  readonly onPartialResult: CodegenTypes.EventEmitter<string>;
  readonly onFinalResult: CodegenTypes.EventEmitter<string>;
  readonly onSpeechStart: CodegenTypes.EventEmitter<boolean>;
  readonly onSpeechEnd: CodegenTypes.EventEmitter<boolean>;
  readonly onAudioLevel: CodegenTypes.EventEmitter<number>;
  readonly onRecognitionError: CodegenTypes.EventEmitter<string>;
}

export const getNativeVoiceSearch = () =>
  TurboModuleRegistry.get<Spec>('NativeVoiceSearch');

export default getNativeVoiceSearch;
