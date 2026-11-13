// Placeholder card for features that are not built yet.
function ComingSoon({ title = 'Coming soon', children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-8 text-center">
        <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          In development
        </span>
        <h2 className="mt-4 text-xl font-semibold text-navy-900">{title}</h2>
        <div className="mx-auto mt-2 max-w-xl text-navy-600">{children}</div>
      </div>
    </div>
  )
}

export default ComingSoon
