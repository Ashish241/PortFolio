/** Percentage point after object-fit: cover, including the responsive crop. */
export function shoulderPosition(
  width: number,
  height: number,
  naturalWidth: number,
  naturalHeight: number,
  position: [number, number],
) {
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  return {
    x:
      ((naturalWidth * scale * 0.67 +
        (width - naturalWidth * scale) * position[0]) /
        width) *
      100,
    y:
      ((naturalHeight * scale * 0.47 +
        (height - naturalHeight * scale) * position[1]) /
        height) *
      100,
  };
}
