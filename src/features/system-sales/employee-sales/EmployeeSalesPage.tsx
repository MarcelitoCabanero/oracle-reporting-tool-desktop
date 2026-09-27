import {
  UsersRound,
} from 'lucide-react'

export default function EmployeeSalesPage() {
  return (
    <div className="system-sales-child-page">
      <div className="system-sales-child-header">
        <div className="system-sales-child-header-icon">
          <UsersRound size={20} />
        </div>

        <div>
          <h4>Employee Sales</h4>

          <p>
            Employee transaction and sales
            reporting.
          </p>
        </div>
      </div>

      <div className="system-sales-placeholder">
        <UsersRound
          size={40}
          strokeWidth={1.4}
        />

        <h5>
          Employee Sales
        </h5>

        <p>
          This function will be migrated
          after the System Sales structure
          is completed.
        </p>
      </div>
    </div>
  )
}