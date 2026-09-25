import {
  useMemo,
  useState,
} from 'react'

import {
  CalendarDays,
  Download,
  Layers3,
  RefreshCw,
  Search,
  ShoppingBag,
} from 'lucide-react'

type MenuItemTab =
  | 'sales-type'
  | 'summary'

interface SalesTypeRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  salesType: string
}

interface SummaryRow {
  itemNumber: string
  itemName: string
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
  majorGroup: string
  familyGroup: string
}

interface Totals {
  qty: number
  grossAmount: number
  itemDiscount: number
  netSales: number
}

const emptyTotals: Totals = {
  qty: 0,
  grossAmount: 0,
  itemDiscount: 0,
  netSales: 0,
}

function todayString() {
  const now = new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  const day =
    String(
      now.getDate(),
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-${day}`
}

function firstDayOfMonthString() {
  const now =
    new Date()

  const year =
    now.getFullYear()

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(
      2,
      '0',
    )

  return `${year}-${month}-01`
}

function formatMoney(
  value: number,
) {
  return value.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  )
}

function formatQty(
  value: number,
) {
  return value.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        2,
    },
  )
}

function MenuItemPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<MenuItemTab>(
      'sales-type',
    )

  const [
    dateFrom,
    setDateFrom,
  ] =
    useState(
      firstDayOfMonthString(),
    )

  const [
    dateTo,
    setDateTo,
  ] =
    useState(
      todayString(),
    )

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    exporting,
    setExporting,
  ] =
    useState(false)

  const [
    message,
    setMessage,
  ] =
    useState(
      'Select a date range, then click Generate Report.',
    )

  const [
    lastSuccess,
    setLastSuccess,
  ] =
    useState(true)

  const [
    salesRows,
    setSalesRows,
  ] =
    useState<
      SalesTypeRow[]
    >([])

  const [
    summaryRows,
    setSummaryRows,
  ] =
    useState<
      SummaryRow[]
    >([])

  const [
    salesTotals,
    setSalesTotals,
  ] =
    useState<Totals>(
      emptyTotals,
    )

  const [
    summaryTotals,
    setSummaryTotals,
  ] =
    useState<Totals>(
      emptyTotals,
    )

  const [
    majorGroups,
    setMajorGroups,
  ] =
    useState<
      string[]
    >([])

  const [
    selectedMajorGroup,
    setSelectedMajorGroup,
  ] =
    useState('')

  const [
    selectedSalesType,
    setSelectedSalesType,
  ] =
    useState('')

  const [
    keyword,
    setKeyword,
  ] =
    useState('')

  const salesTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            salesRows
              .map(
                (row) =>
                  row.salesType
                    .trim(),
              )
              .filter(
                Boolean,
              ),
          ),
        ).sort(
          (
            left,
            right,
          ) =>
            left.localeCompare(
              right,
            ),
        ),
      [salesRows],
    )

  const filteredSalesRows =
    useMemo(
      () => {
        const query =
          keyword
            .trim()
            .toLowerCase()

        return salesRows.filter(
          (row) => {
            const matchesType =
              !selectedSalesType ||
              row.salesType ===
                selectedSalesType

            const matchesKeyword =
              !query ||
              row.itemNumber
                .toLowerCase()
                .includes(
                  query,
                ) ||
              row.itemName
                .toLowerCase()
                .includes(
                  query,
                )

            return (
              matchesType &&
              matchesKeyword
            )
          },
        )
      },
      [
        keyword,
        salesRows,
        selectedSalesType,
      ],
    )

  const filteredSummaryRows =
    useMemo(
      () => {
        const query =
          keyword
            .trim()
            .toLowerCase()

        return summaryRows.filter(
          (row) => {
            const matchesMajorGroup =
              !selectedMajorGroup ||
              row.majorGroup ===
                selectedMajorGroup

            const matchesKeyword =
              !query ||
              row.itemNumber
                .toLowerCase()
                .includes(
                  query,
                ) ||
              row.itemName
                .toLowerCase()
                .includes(
                  query,
                ) ||
              row.familyGroup
                .toLowerCase()
                .includes(
                  query,
                )

            return (
              matchesMajorGroup &&
              matchesKeyword
            )
          },
        )
      },
      [
        keyword,
        selectedMajorGroup,
        summaryRows,
      ],
    )

  const visibleTotals =
    useMemo(
      () => {
        const rows =
          activeTab ===
          'sales-type'
            ? filteredSalesRows
            : filteredSummaryRows

        return rows.reduce<Totals>(
          (
            total,
            row,
          ) => ({
            qty:
              total.qty +
              row.qty,

            grossAmount:
              total.grossAmount +
              row.grossAmount,

            itemDiscount:
              total.itemDiscount +
              row.itemDiscount,

            netSales:
              total.netSales +
              row.netSales,
          }),
          {
            qty: 0,
            grossAmount: 0,
            itemDiscount: 0,
            netSales: 0,
          },
        )
      },
      [
        activeTab,
        filteredSalesRows,
        filteredSummaryRows,
      ],
    )

  async function generateReport() {
    if (
      !dateFrom ||
      !dateTo
    ) {
      setLastSuccess(
        false,
      )

      setMessage(
        'From Date and To Date are required.',
      )

      return
    }

    if (
      dateTo <
      dateFrom
    ) {
      setLastSuccess(
        false,
      )

      setMessage(
        'To Date cannot be earlier than From Date.',
      )

      return
    }

    try {
      setLoading(
        true,
      )

      setLastSuccess(
        true,
      )

      setMessage(
        activeTab ===
        'sales-type'
          ? 'Generating Menu Item by Sales Type...'
          : 'Generating Menu Item Summary...',
      )

      if (
        activeTab ===
        'sales-type'
      ) {
        const result =
          await window.api.menuItem
            .getBySalesType({
              dateFrom,
              dateTo,
            })

        setLastSuccess(
          result.success,
        )

        setMessage(
          result.message,
        )

        if (
          result.success
        ) {
          setSalesRows(
            result.rows,
          )

          setSalesTotals(
            result.totals,
          )

          setSelectedSalesType(
            '',
          )

          setKeyword(
            '',
          )
        }

        return
      }

      const result =
        await window.api.menuItem
          .getSummary({
            dateFrom,
            dateTo,
          })

      setLastSuccess(
        result.success,
      )

      setMessage(
        result.message,
      )

      if (
        result.success
      ) {
        setSummaryRows(
          result.rows,
        )

        setSummaryTotals(
          result.totals,
        )

        setMajorGroups(
          result.majorGroups,
        )

        setSelectedMajorGroup(
          '',
        )

        setKeyword(
          '',
        )
      }
    } catch (error) {
      console.error(
        'Generate Menu Item report failed:',
        error,
      )

      setLastSuccess(
        false,
      )

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate Menu Item report.',
      )
    } finally {
      setLoading(
        false,
      )
    }
  }

  async function exportExcel() {
    if (visibleCount === 0) {
      setLastSuccess(false)
      setMessage('There are no records to export.')
      return
    }

    try {
      setExporting(true)

      if (activeTab === 'sales-type') {
        const result =
          await window.api.menuItem.exportBySalesType({
            dateFrom,
            dateTo,
            rows: filteredSalesRows,
            salesTypeFilter: selectedSalesType,
          })

        if (!result.canceled) {
          setLastSuccess(result.success)
          setMessage(result.message)
        }

        return
      }

      const result =
        await window.api.menuItem.exportSummary({
          dateFrom,
          dateTo,
          rows: filteredSummaryRows,
          majorGroupFilter: selectedMajorGroup,
        })

      if (!result.canceled) {
        setLastSuccess(result.success)
        setMessage(result.message)
      }
    } catch (error) {
      console.error(
        'Export Menu Item report failed:',
        error,
      )

      setLastSuccess(false)
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to export Menu Item report.',
      )
    } finally {
      setExporting(false)
    }
  }

  function changeTab(
    tab: MenuItemTab,
  ) {
    if (
      loading ||
      tab ===
        activeTab
    ) {
      return
    }

    setActiveTab(
      tab,
    )

    setKeyword(
      '',
    )

    setSelectedMajorGroup(
      '',
    )

    setSelectedSalesType(
      '',
    )

    setLastSuccess(
      true,
    )

    setMessage(
      tab ===
      'sales-type'
        ? salesRows.length >
          0
          ? `${salesRows.length} Menu Item by Sales Type record(s) loaded.`
          : 'Select a date range, then click Generate Report.'
        : summaryRows.length >
          0
          ? `${summaryRows.length} Menu Item Summary record(s) loaded.`
          : 'Select a date range, then click Generate Report.',
    )
  }

  const currentSourceTotals =
    activeTab ===
    'sales-type'
      ? salesTotals
      : summaryTotals

  const sourceCount =
    activeTab ===
    'sales-type'
      ? salesRows.length
      : summaryRows.length

  const visibleCount =
    activeTab ===
    'sales-type'
      ? filteredSalesRows.length
      : filteredSummaryRows.length

  const hasFilter =
    keyword.trim() !==
      '' ||
    (activeTab ===
      'sales-type'
      ? selectedSalesType !==
        ''
      : selectedMajorGroup !==
        '')

  return (
    <div>
      

      <div className="rof-view-tabs menu-item-view-tabs mb-3">
        <button
          type="button"
          className={`rof-view-tab ${
            activeTab ===
            'sales-type'
              ? 'active'
              : ''
          }`}
          disabled={
            loading
          }
          onClick={() =>
            changeTab(
              'sales-type',
            )
          }
        >
          <ShoppingBag
            size={17}
          />

          Menu Item by Sales Type
        </button>

        <button
          type="button"
          className={`rof-view-tab ${
            activeTab ===
            'summary'
              ? 'active'
              : ''
          }`}
          disabled={
            loading
          }
          onClick={() =>
            changeTab(
              'summary',
            )
          }
        >
          <Layers3
            size={17}
          />

          Menu Item Summary
        </button>
      </div>

      <div className="card border rounded-3 mb-2">
        <div className="card-body p-1">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-4 col-lg-2">
              <label
                htmlFor="menuitem-date-from"
                className="
                  form-label
                  small
                  fw-semibold
                  mb-1
                  d-flex
                  align-items-center
                  gap-1
                "
              >
                <CalendarDays
                  size={15}
                />

                From
              </label>

              <input
                id="menuitem-date-from"
                type="date"
                className="form-control"
style={{
  height: '38px',
}}
                value={
                  dateFrom
                }
                max={
                  dateTo ||
                  todayString()
                }
                disabled={
                  loading
                }
                onChange={(
                  event,
                ) =>
                  setDateFrom(
                    event.target
                      .value,
                  )
                }
              />
            </div>

            <div className="col-12 col-sm-4 col-lg-2">
              <label
                htmlFor="menuitem-date-to"
                className="
                  form-label
                  small
                  fw-semibold
                  mb-1
                  d-flex
                  align-items-center
                  gap-1
                "
              >
                <CalendarDays
                  size={15}
                />

                To
              </label>

              <input
                id="menuitem-date-to"
                type="date"
                className="form-control"
style={{
  height: '38px',
}}
                value={
                  dateTo
                }
                min={
                  dateFrom
                }
                max={
                  todayString()
                }
                disabled={
                  loading
                }
                onChange={(
                  event,
                ) =>
                  setDateTo(
                    event.target
                      .value,
                  )
                }
              />
            </div>

            <div className="col-12 col-sm-auto">
              <button
                type="button"
                className="
                  btn
    btn-primary
    d-flex
    align-items-center
    justify-content-center
    gap-2
    px-3
                "
                style={{
    height: '38px',
  }}
                disabled={
                  loading
                }
                onClick={() =>
                  void generateReport()
                }
              >
                <RefreshCw
                  size={15}
                  className={
                    loading
                      ? 'spin'
                      : ''
                  }
                />
                Generate
              </button>
            </div>
              {!lastSuccess && message && (
  <div
    className="alert alert-danger py-2 px-3 small mb-2"
    role="alert"
  >
    {message}
  </div>
)}      


          </div>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <CompactMetric
          label="Qty"
          value={formatQty(
            hasFilter
              ? visibleTotals.qty
              : currentSourceTotals.qty,
          )}
        />

        <CompactMetric
          label="Gross"
          value={`₱${formatMoney(
            hasFilter
              ? visibleTotals.grossAmount
              : currentSourceTotals.grossAmount,
          )}`}
        />

        <CompactMetric
          label="Discount"
          value={`₱${formatMoney(
            hasFilter
              ? visibleTotals.itemDiscount
              : currentSourceTotals.itemDiscount,
          )}`}
        />

        <CompactMetric
          label="Net Sales"
          value={`₱${formatMoney(
            hasFilter
              ? visibleTotals.netSales
              : currentSourceTotals.netSales,
          )}`}
        />
      </div>

      <section
        className="
          card
          border
          rounded-3
          overflow-hidden
        "
      >
        <div
  className="
    card-header
    bg-white
    border-bottom
    py-2
    px-3
  "
>
  <div
    className="
      d-flex
      flex-column
      flex-lg-row
      justify-content-between
      align-items-lg-center
      gap-2
    "
  >
    {/* Report title */}
    <div className="flex-shrink-0">
      <h2 className="h6 fw-bold mb-0">
        {activeTab === 'sales-type'
          ? 'Menu Item by Sales Type'
          : 'Menu Item Summary'}
      </h2>

      <div className="small text-secondary">
        {hasFilter
          ? `Showing ${visibleCount} of ${sourceCount} record(s)`
          : `${sourceCount} record(s) loaded`}
      </div>
    </div>

    {/* Search / Filter / Export */}
    <div
      className="
        d-flex
        flex-column
        flex-md-row
        align-items-md-center
        gap-2
      "
    >
      {/* Search */}
      <div
        className="input-group input-group-sm"
        style={{
          width: '260px',
        }}
      >
        <span className="input-group-text">
          <Search size={14} />
        </span>

        <input
          type="text"
          className="form-control"
          placeholder={
            activeTab === 'sales-type'
              ? 'Search item...'
              : 'Search item / family...'
          }
          value={keyword}
          disabled={
            loading ||
            sourceCount === 0
          }
          onChange={(event) =>
            setKeyword(
              event.target.value,
            )
          }
        />
      </div>

      {/* Filter */}
      {activeTab === 'sales-type' ? (
        <select
          className="form-select form-select-sm"
          value={selectedSalesType}
          disabled={
            loading ||
            salesRows.length === 0
          }
          onChange={(event) =>
            setSelectedSalesType(
              event.target.value,
            )
          }
          style={{
            width: '170px',
          }}
        >
          <option value="">
            All Sales Types
          </option>

          {salesTypes.map(
            (salesType) => (
              <option
                key={salesType}
                value={salesType}
              >
                {salesType}
              </option>
            ),
          )}
        </select>
      ) : (
        <select
          className="form-select form-select-sm"
          value={selectedMajorGroup}
          disabled={
            loading ||
            summaryRows.length === 0
          }
          onChange={(event) =>
            setSelectedMajorGroup(
              event.target.value,
            )
          }
          style={{
            width: '170px',
          }}
        >
          <option value="">
            All Major Groups
          </option>

          {majorGroups.map(
            (majorGroup) => (
              <option
                key={majorGroup}
                value={majorGroup}
              >
                {majorGroup}
              </option>
            ),
          )}
        </select>
      )}

      {/* Export */}
      <button
        type="button"
        className="
          btn
          btn-outline-success
          btn-sm
          d-flex
          align-items-center
          justify-content-center
          gap-1
          text-nowrap
        "
        style={{
          height: '31px',
          minWidth: '115px',
        }}
        disabled={
          loading ||
          exporting ||
          visibleCount === 0
        }
        onClick={() =>
          void exportExcel()
        }
      >
        <Download size={14} />

        {exporting
          ? 'Exporting...'
          : 'Export Excel'}
      </button>
    </div>
  </div>
</div>

        <div
  className="table-responsive"
  style={{
    maxHeight: '52vh',
    overflowY: 'auto',
  }}
>
  {activeTab ===
  'sales-type' ? (
    <SalesTypeTable
      rows={filteredSalesRows}
      totals={visibleTotals}
    />
  ) : (
    <SummaryTable
      rows={filteredSummaryRows}
      totals={visibleTotals}
    />
  )}
</div>
      </section>

      {loading && (
        <BusyOverlay
          message={
            activeTab ===
            'sales-type'
              ? 'Generating Menu Item by Sales Type...'
              : 'Generating Menu Item Summary...'
          }
        />
      )}

      {exporting && (
        <BusyOverlay
          message="Exporting Menu Item report to Excel..."
        />
      )}
    </div>
  )
}

function CompactMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="col-6 col-lg-3">
      <div
        className="
          border
          rounded-3
          bg-white
          px-3
          py-2
        "
      >
        <div className="small text-secondary lh-1 mb-1">
          {label}
        </div>

        <div className="fw-bold small">
          {value}
        </div>
      </div>
    </div>
  )
}

function SalesTypeTable({
  rows,
  totals,
}: {
  rows: SalesTypeRow[]
  totals: Totals
}) {
  return (
    <table
      className="
        table
        table-hover
        align-middle
        mb-0
        small
      "
      style={{
        minWidth:
          980,
      }}
    >
      <thead className="table-light">
        <tr>
          <th>
            Item Number
          </th>

          <th>
            Item Name
          </th>

          <th>
            Sales Type
          </th>

          <th className="text-end">
            Qty
          </th>

          <th className="text-end">
            Gross
          </th>

          <th className="text-end">
            Discount
          </th>

          <th className="text-end">
            Net Sales
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.length ===
        0 ? (
          <tr>
            <td
              colSpan={7}
              className="
                text-center
                text-secondary
                py-4
              "
            >
              No records to display.
            </td>
          </tr>
        ) : (
          rows.map(
            (
              row,
              index,
            ) => (
              <tr
                key={`${row.itemNumber}-${row.salesType}-${index}`}
              >
                <td className="fw-semibold">
                  {row.itemNumber}
                </td>

                <td>
                  {row.itemName}
                </td>

                <td>
                  <span
                    className="
                      badge
                      text-bg-light
                      border
                    "
                  >
                    {row.salesType ||
                      '—'}
                  </span>
                </td>

                <td className="text-end">
                  {formatQty(
                    row.qty,
                  )}
                </td>

                <MoneyCell
                  value={
                    row.grossAmount
                  }
                />

                <MoneyCell
                  value={
                    row.itemDiscount
                  }
                />

                <MoneyCell
                  value={
                    row.netSales
                  }
                />
              </tr>
            ),
          )
        )}
      </tbody>

      {rows.length >
        0 && (
        <tfoot className="table-light fw-bold">
          <tr>
            <td colSpan={3}>
              Total
            </td>

            <td className="text-end">
              {formatQty(
                totals.qty,
              )}
            </td>

            <MoneyCell
              value={
                totals.grossAmount
              }
            />

            <MoneyCell
              value={
                totals.itemDiscount
              }
            />

            <MoneyCell
              value={
                totals.netSales
              }
            />
          </tr>
        </tfoot>
      )}
    </table>
  )
}

function SummaryTable({
  rows,
  totals,
}: {
  rows: SummaryRow[]
  totals: Totals
}) {
  return (
    <table
      className="
        table
        table-hover
        align-middle
        mb-0
        small
      "
      style={{
        minWidth:
          1080,
      }}
    >
      <thead className="table-light">
        <tr>
          <th>
            Item Number
          </th>

          <th>
            Item Name
          </th>

          <th>
            Major Group
          </th>

          <th>
            Family Group
          </th>

          <th className="text-end">
            Qty
          </th>

          <th className="text-end">
            Gross
          </th>

          <th className="text-end">
            Discount
          </th>

          <th className="text-end">
            Net Sales
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.length ===
        0 ? (
          <tr>
            <td
              colSpan={8}
              className="
                text-center
                text-secondary
                py-4
              "
            >
              No records to display.
            </td>
          </tr>
        ) : (
          rows.map(
            (
              row,
              index,
            ) => (
              <tr
                key={`${row.itemNumber}-${row.majorGroup}-${row.familyGroup}-${index}`}
              >
                <td className="fw-semibold">
                  {row.itemNumber}
                </td>

                <td>
                  {row.itemName}
                </td>

                <td>
                  {row.majorGroup ||
                    '—'}
                </td>

                <td>
                  {row.familyGroup ||
                    '—'}
                </td>

                <td className="text-end">
                  {formatQty(
                    row.qty,
                  )}
                </td>

                <MoneyCell
                  value={
                    row.grossAmount
                  }
                />

                <MoneyCell
                  value={
                    row.itemDiscount
                  }
                />

                <MoneyCell
                  value={
                    row.netSales
                  }
                />
              </tr>
            ),
          )
        )}
      </tbody>

      {rows.length >
        0 && (
        <tfoot className="table-light fw-bold">
          <tr>
            <td colSpan={4}>
              Total
            </td>

            <td className="text-end">
              {formatQty(
                totals.qty,
              )}
            </td>

            <MoneyCell
              value={
                totals.grossAmount
              }
            />

            <MoneyCell
              value={
                totals.itemDiscount
              }
            />

            <MoneyCell
              value={
                totals.netSales
              }
            />
          </tr>
        </tfoot>
      )}
    </table>
  )
}

function MoneyCell({
  value,
}: {
  value: number
}) {
  return (
    <td className="text-end">
      ₱
      {formatMoney(
        value,
      )}
    </td>
  )
}

function BusyOverlay({
  message,
}: {
  message: string
}) {
  return (
    <div
      className="
        position-fixed
        top-0
        start-0
        w-100
        h-100
        d-flex
        align-items-center
        justify-content-center
      "
      style={{
        background:
          'rgba(255, 255, 255, 0.80)',

        backdropFilter:
          'blur(2px)',

        zIndex:
          1100,
      }}
      aria-live="assertive"
      aria-busy="true"
    >
      <div
        className="
          bg-white
          border
          rounded-4
          shadow
          px-5
          py-4
          text-center
        "
        style={{
          minWidth:
            300,
        }}
      >
        <div
          className="
            spinner-border
            text-primary
            mb-3
          "
          style={{
            width:
              '2.75rem',

            height:
              '2.75rem',
          }}
          role="status"
        >
          <span className="visually-hidden">
            Loading...
          </span>
        </div>

        <div className="fw-semibold">
          {message}
        </div>

        <div className="small text-secondary mt-1">
          Please wait while the report is generated.
        </div>
      </div>
    </div>
  )
}

export default MenuItemPage
