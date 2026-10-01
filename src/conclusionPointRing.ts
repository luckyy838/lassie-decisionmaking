// Only the conclusion important/ignored pages turn this on.
// The scatter chart itself keeps its original point style.
export const conclusionPointRing = {
  active: false,
  color: '#111111',
  keys: {} as { [key: string]: boolean },
};

export function conclusionPointKey(rowIndex: number, measurementIndex: number) {
  return rowIndex + ':' + measurementIndex;
}
