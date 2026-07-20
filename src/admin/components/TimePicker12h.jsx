import { from12Hour, timePickerMinuteOptions, to12Hour } from '../utils/adminUtils.js'

const hourOptions = Array.from({ length: 12 }, (_, index) => index + 1)

function TimePicker12h({ value, onChange, ariaLabel }) {
  const { hour, minute, period } = to12Hour(value)

  return (
    <div className="adminTimePicker12h" role="group" aria-label={ariaLabel}>
      <select
        value={hour}
        aria-label="الساعة"
        onChange={(event) => onChange(from12Hour(event.target.value, minute, period))}
      >
        {hourOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <span className="adminTimePickerColon">:</span>

      <select
        value={minute}
        aria-label="الدقائق"
        onChange={(event) => onChange(from12Hour(hour, event.target.value, period))}
      >
        {timePickerMinuteOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <div className="adminTimePeriodToggle">
        <button
          type="button"
          className={period === 'AM' ? 'active' : ''}
          onClick={() => onChange(from12Hour(hour, minute, 'AM'))}
        >
          AM
        </button>
        <button
          type="button"
          className={period === 'PM' ? 'active' : ''}
          onClick={() => onChange(from12Hour(hour, minute, 'PM'))}
        >
          PM
        </button>
      </div>
    </div>
  )
}

export default TimePicker12h
