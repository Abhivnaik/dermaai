// An image with a Grad-CAM heatmap (transparent PNG) stacked on top.
// The heatmap's own transparency already fades low-influence areas;
// `opacity` scales the whole layer (0-1).
function HeatmapOverlay({ baseSrc, heatmapSrc, width, height, opacity = 0.7, alt, pixelated = false }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-navy-950" style={{ aspectRatio: `${width} / ${height}` }}>
      <img
        src={baseSrc}
        alt={alt}
        className="absolute inset-0 h-full w-full object-fill"
        style={pixelated ? { imageRendering: 'pixelated' } : undefined}
      />
      {heatmapSrc && (
        <img
          src={heatmapSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-fill transition-opacity"
          style={{ opacity }}
        />
      )}
    </div>
  )
}

export default HeatmapOverlay
