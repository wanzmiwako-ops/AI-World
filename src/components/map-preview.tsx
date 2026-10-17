"use client";

/** Peta kecil (tanpa kunci API): ubin peta OpenStreetMap/CARTO dengan penanda di tengah. */
export function MapPreview({ lat, lng, zoom = 16, height = 130, className = "" }: { lat: number; lng: number; zoom?: number; height?: number; className?: string }) {
  const n = 2 ** zoom;
  const px = ((lng + 180) / 360) * n * 256;
  const rad = (lat * Math.PI) / 180;
  const py = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n * 256;
  const tx = Math.floor(px / 256);
  const ty = Math.floor(py / 256);
  const ox = px - tx * 256;
  const oy = py - ty * 256;
  const tiles: { x: number; y: number; dx: number; dy: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) tiles.push({ x: (((tx + dx) % n) + n) % n, y: ty + dy, dx, dy });
  const sub = "abcd"[(tx + ty) % 4];

  return (
    <div className={`relative overflow-hidden bg-tint ${className}`} style={{ height }} aria-hidden="true">
      {tiles.map((t) =>
        t.y < 0 || t.y >= n ? null : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${t.dx}:${t.dy}`}
            src={`https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${t.x}/${t.y}@2x.png`}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            draggable={false}
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: `calc(50% + ${t.dx * 256 - ox}px)`, top: `calc(50% + ${t.dy * 256 - oy}px)`, width: 256, height: 256 }}
          />
        ),
      )}
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-[30px] leading-none drop-shadow" style={{ animation: "bob 1.8s ease-in-out infinite" }}>
        📍
      </span>
      <span className="absolute right-1 bottom-0.5 rounded bg-white/75 px-1 text-[8px] text-ink-soft">© OpenStreetMap © CARTO</span>
    </div>
  );
}
