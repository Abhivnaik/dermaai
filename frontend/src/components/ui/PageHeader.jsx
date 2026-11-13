// Consistent title block used at the top of each page.
function PageHeader({ eyebrow, title, description }) {
  return (
    <div className="border-b border-navy-100 bg-navy-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">{eyebrow}</p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-navy-600">{description}</p>}
      </div>
    </div>
  )
}

export default PageHeader
