import { getVoucherInputScrollDelta } from '../voucherKeyboard';

describe('voucher input keyboard visibility', () => {
  it('returns the upward scroll needed when the input is below the viewport', () => {
    expect(getVoucherInputScrollDelta(430, 58, 100, 360, 12)).toBe(40);
  });

  it('returns a negative scroll when the input is clipped above the viewport', () => {
    expect(getVoucherInputScrollDelta(90, 58, 100, 360, 12)).toBe(-22);
  });

  it('leaves the scroll position unchanged when the full input is visible', () => {
    expect(getVoucherInputScrollDelta(250, 58, 100, 360, 12)).toBe(0);
  });
});
