// Colour key for the Grad-CAM heatmap. Matches the backend rendering in
// ml/explainability/gradcam.py: the 'inferno' colour map, with opacity
// rising with the value, so low-influence areas are see-through.
const INFERNO_RAMP =
  'linear-gradient(to right, rgba(0,0,4,0) 0%, rgba(87,16,110,0.25) 25%, rgba(188,55,84,0.5) 50%, rgba(249,142,9,0.75) 75%, rgba(252,255,164,1) 100%)'

function HeatmapLegend({ className = '' }) {
  return (
    <figure className={className}>
      <div
        className="h-3 w-full rounded-full ring-1 ring-navy-200"
        style={{ backgroundImage: `${INFERNO_RAMP}, linear-gradient(#d9c4c0, #d9c4c0)` }}
        role="img"
        aria-label="Colour scale from transparent (low influence) through purple and orange to pale yellow (highest influence)"
      />
      <figcaption className="mt-1.5 flex justify-between text-xs text-navy-500">
        <span>Low influence</span>
        <span>Highest influence</span>
      </figcaption>
    </figure>
  )
}

export default HeatmapLegend
