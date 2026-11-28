import {normalizeVoiceQuery, VoiceSearchSessionGuard} from '../voiceSearchLifecycle';

describe('voice search lifecycle', () => {
  it('normalizes a final transcript before submitting it', () => {
    expect(normalizeVoiceQuery('  Amul   Milk\n')).toBe('Amul Milk');
    expect(normalizeVoiceQuery('  ')).toBe('');
  });

  it('accepts a final result once and ignores duplicate results', () => {
    const session = new VoiceSearchSessionGuard();
    const id = session.begin();
    expect(session.finish(id)).toBe(true);
    expect(session.finish(id)).toBe(false);
    expect(session.isActive(id)).toBe(false);
  });

  it('invalidates callbacks after cancel and after a replacement session starts', () => {
    const session = new VoiceSearchSessionGuard();
    const first = session.begin();
    session.cancel();
    expect(session.isActive(first)).toBe(false);
    const second = session.begin();
    expect(session.isActive(first)).toBe(false);
    expect(session.isActive(second)).toBe(true);
  });
});
