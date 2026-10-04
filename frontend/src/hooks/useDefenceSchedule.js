import { useEffect, useState } from "react";
import { defenceApi } from "../services/api";

// The defence day is one shared event, so every portal that shows it reads it the
// same way. Separate from usePortalData because the schedule changes when the
// coordinator publishes, not when the portal payload does.
export function useDefenceSchedule() {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        defenceApi
            .getSchedule()
            .then((response) => {
                if (active) setSchedule(response.schedule ?? null);
            })
            .catch((loadError) => {
                if (active) setError(loadError.message || "The defence day could not be loaded.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    return { schedule, loading, error };
}
