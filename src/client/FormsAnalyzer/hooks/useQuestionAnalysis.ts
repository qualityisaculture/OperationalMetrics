import { useMemo, useState } from "react";
import { FormsData, QuestionAnalysis, FilterCriteria } from "../types";

export const useQuestionAnalysis = (formsData: FormsData[]) => {
  const [activeFilters, setActiveFilters] = useState<FilterCriteria[]>([]);

  // Get filtered data based on active filters
  const filteredData = useMemo(() => {
    if (formsData.length === 0 || activeFilters.length === 0) {
      return formsData;
    }

    const firstSheet = formsData[0];
    const filteredRows = firstSheet.data.filter((row) => {
      return activeFilters.every((filter) => {
        const questionIndex = firstSheet.questionColumns.indexOf(
          filter.question
        );
        if (questionIndex === -1) return true; // Question not found, skip filter

        const answer = row[(questionIndex + 5).toString()];
        return filter.selectedAnswers.includes(String(answer));
      });
    });

    // Create new filtered sheet data
    const filteredSheet: FormsData = {
      ...firstSheet,
      data: filteredRows,
    };

    return [filteredSheet];
  }, [formsData, activeFilters]);

  // Analyze questions based on the currently filtered data
  const questionAnalysis = useMemo((): QuestionAnalysis[] => {
    if (formsData.length === 0) return [];

    // Use filtered data if filters are active, otherwise use original data
    const dataToAnalyze = activeFilters.length > 0 ? filteredData : formsData;
    const firstSheet = dataToAnalyze[0];

    const analysis: QuestionAnalysis[] = [];

    firstSheet.questionColumns.forEach((question, questionIndex) => {
      const answerCounts: { [key: string]: number } = {};
      let totalResponses = 0;

      // Count answers for this question based on filtered data
      firstSheet.data.forEach((row) => {
        const answer = row[(questionIndex + 5).toString()]; // +5 because first 5 are metadata
        if (answer !== null && answer !== undefined && answer !== "") {
          const answerStr = String(answer);
          answerCounts[answerStr] = (answerCounts[answerStr] || 0) + 1;
          totalResponses++;
        }
      });

      // Convert to array format and sort by count (descending)
      const answers = Object.entries(answerCounts)
        .map(([answer, count]) => ({
          answer,
          count,
          percentage: totalResponses > 0 ? (count / totalResponses) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      analysis.push({
        question,
        answers,
        totalResponses,
      });
    });

    return analysis;
  }, [formsData, activeFilters, filteredData]);

  // Add a filter
  const addFilter = (filter: FilterCriteria) => {
    setActiveFilters((prev) => [...prev, filter]);
  };

  // Update a filter
  const updateFilter = (question: string, selectedAnswers: string[]) => {
    setActiveFilters((prev) =>
      prev.map((filter) =>
        filter.question === question ? { ...filter, selectedAnswers } : filter
      )
    );
  };

  // Remove a filter
  const removeFilter = (question: string) => {
    setActiveFilters((prev) =>
      prev.filter((filter) => filter.question !== question)
    );
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  return {
    questionAnalysis,
    activeFilters,
    filteredData,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
  };
};
