import { useState } from "react";
import { BugsAnalysisData } from "../types";

export const useBugsAnalysisData = () => {
  const [data, setData] = useState<BugsAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (query: string) => {
    if (!query.trim()) {
      setError("Please enter a query");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/bugsAnalysis?query=${encodeURIComponent(query)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Bugs Analysis API Response:", result);
      const bugsAnalysisData: BugsAnalysisData = JSON.parse(result.data);
      console.log("Parsed Bugs Analysis Data:", bugsAnalysisData);
      setData(bugsAnalysisData);
    } catch (err) {
      console.error("Bugs Analysis API Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchData };
};

