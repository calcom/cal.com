import dateformat from "date-fns/format"
import { parseISO } from 'date-fns'

export const EntryDate = ({ date, isoDateString, format = "PP" }) => {
  let _date
  if (isoDateString) {
    try {
      _date = parseISO(isoDateString)
    } catch {} 
  } else {
    _date = date
  }

  if (!_date) {
    return <></>
  }

  return <p className="text-base text-neutral-700">
      {dateformat(_date, format)}
    </p>
}

<EntryDate isoDateString="2022-01-04" />