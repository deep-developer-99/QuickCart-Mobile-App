/** Return the scroll adjustment needed to keep the voucher input inside its viewport. */
export const getVoucherInputScrollDelta = (
  inputTop: number,
  inputHeight: number,
  viewportTop: number,
  viewportHeight: number,
  edgePadding: number,
): number => {
  const visibleTop = viewportTop + edgePadding;
  const visibleBottom = viewportTop + viewportHeight - edgePadding;
  const inputBottom = inputTop + inputHeight;

  if (inputTop < visibleTop) return inputTop - visibleTop;
  if (inputBottom > visibleBottom) return inputBottom - visibleBottom;
  return 0;
};
