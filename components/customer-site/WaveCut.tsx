export function WaveCut({ from, to }: { from: string; to: string }) {
  return (
    <svg
      className="wavecut"
      viewBox="0 0 1440 64"
      preserveAspectRatio="none"
      style={{ background: from }}
    >
      <path
        d="M0 64 L0 40 C120 40 180 12 320 20 C460 28 520 8 700 18 C880 28 960 4 1120 14 C1280 24 1360 36 1440 30 L1440 64 Z"
        fill={to}
      />
    </svg>
  );
}
