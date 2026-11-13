import { CLASS_ORDER, LESION_CLASSES } from '../../data/lesionClasses'

/*
  Horizontal bar list of the seven class probabilities, sorted high → low.
  - Predicted class: teal-600 bar + "Top prediction" text label (never colour alone)
  - Other classes:   navy-300 bar (validated: ΔE 20 vs teal-600, CVD-safe)
  - Every value is printed as text, so the chart doubles as its own table.
*/
function ProbabilityBars({ probabilities, predictedClass }) {
  const rows = CLASS_ORDER.map((code) => ({
    code,
    name: LESION_CLASSES[code].name,
    value: probabilities[code],
  })).sort((a, b) => b.value - a.value)

  return (
    <div>
      <ul className="space-y-4" aria-label="Probability for each lesion category">
        {rows.map((row) => {
          const isTop = row.code === predictedClass
          return (
            <li key={row.code}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-sm">
                  <span className={`font-medium ${isTop ? 'text-navy-900' : 'text-navy-700'}`}>{row.name}</span>{' '}
                  <span className="font-mono text-xs uppercase text-navy-400">{row.code}</span>
                  {isTop && (
                    <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                      Top prediction
                    </span>
                  )}
                </p>
                <p className={`shrink-0 text-sm tabular-nums ${isTop ? 'font-semibold text-navy-900' : 'text-navy-600'}`}>
                  {row.value.toFixed(2)}%
                </p>
              </div>
              {/* Track + bar. Bar is anchored left with a rounded data-end. */}
              <div className="mt-1.5 h-2.5 w-full rounded-r bg-navy-50" aria-hidden="true">
                <div
                  className={`h-full rounded-r ${isTop ? 'bg-teal-600' : 'bg-navy-300'}`}
                  style={{ width: `${Math.max(row.value, 0.5)}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>

      {/* Scale reference */}
      <div className="mt-3 flex justify-between text-xs tabular-nums text-navy-400" aria-hidden="true">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

export default ProbabilityBars
