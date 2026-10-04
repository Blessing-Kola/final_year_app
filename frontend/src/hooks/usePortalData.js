import { useEffect, useState } from "react";
import { portalApi } from "../services/api";
import { sanitizePortalData } from "../utils/sanitizePortalData";

export function usePortalData() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        portalApi
            .data()
            .then((response) => {
                if (active) setData(sanitizePortalData(response.data ?? null));
            })
            .catch((requestError) => {
                if (active) setError(requestError.message || "Unable to load portal data.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    return { data, loading, error };
}