function Table({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-1.5 text-left">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className="rounded-xl border border-slate-200/80 bg-slate-50/75">
              {columns.map((column) => (
                <td key={column.key} className="px-3 py-3 text-sm text-slate-700 first:rounded-l-xl last:rounded-r-xl">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default Table
