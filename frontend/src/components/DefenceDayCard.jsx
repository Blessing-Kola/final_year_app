import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Feedback } from "./StatusBadge";
import { formatDefenceDate, formatDefenceTime } from "../utils/defenceDay";

// Read-only view of the shared defence day, used on the student and supervisor
// dashboards and on the defence page. The coordinator's Calendar page has its own
// editable version of this, because it is also where the day is published.
export default function DefenceDayCard({
  schedule,
  loading = false,
  error = "",
  emptyHint = "The coordinator has not scheduled the defence day yet. You will be notified when it is published.",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Defence day</h2>

      {error ? (
        <div className="mt-2">
          <Feedback tone="error">{error}</Feedback>
        </div>
      ) : null}

      {loading ? (
        <p className="mt-2 text-sm text-slate-500">Loading the defence day…</p>
      ) : schedule ? (
        <>
          <p className="mt-2 font-medium text-slate-900">{schedule.title}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <span className="flex items-center gap-2">
              <CalendarDays size={15} /> {formatDefenceDate(schedule.scheduledDate)}
            </span>
            <span className="flex items-center gap-2">
              <Clock size={15} /> {formatDefenceTime(schedule.startTime)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={15} /> {schedule.venue}
            </span>
          </div>
          {schedule.instructions ? (
            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
              {schedule.instructions}
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyHint}</p>
      )}
    </div>
  );
}
