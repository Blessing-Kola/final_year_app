import { useEffect, useState } from "react";
import { portalApi } from "../services/api";

const hasValidId = (value) => value !== null && value !== undefined && value !== "";

const sanitizePortalData = (payload) => {
    if (!payload || typeof payload !== "object") return payload;

    const sanitizeArray = (items) =>
        Array.isArray(items)
            ? items.filter((item) => {
                if (!item || typeof item !== "object") return false;
                if ("studentId" in item) return hasValidId(item.studentId);
                if ("id" in item) return hasValidId(item.id);
                return true;
            })
            : [];

    return {
        ...payload,
        students: sanitizeArray(payload.students),
        supervisors: sanitizeArray(payload.supervisors),
        projects: sanitizeArray(payload.projects),
        reviews: sanitizeArray(payload.reviews),
        meetings: sanitizeArray(payload.meetings),
        defenses: sanitizeArray(payload.defenses),
        topics: sanitizeArray(payload.topics),
    };
};

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