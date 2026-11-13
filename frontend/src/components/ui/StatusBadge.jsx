// Shows whether a feature is available or still in development.
function StatusBadge({ available }) {
  return available ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
      <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
      Available
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-500">
      <span className="h-1.5 w-1.5 rounded-full bg-navy-300" />
      In development
    </span>
  )
}

export default StatusBadge
