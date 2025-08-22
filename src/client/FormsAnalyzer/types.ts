export interface FormsData {
  name: string;
  data: any[];
  headers: string[];
  columns: any[];
  fileName: string;
  metadataColumns: string[]; // First 5 columns (timestamp, name, etc.)
  questionColumns: string[]; // Remaining columns (actual form questions)
}

export interface QuestionAnalysis {
  question: string;
  answers: {
    answer: string;
    count: number;
    percentage: number;
  }[];
  totalResponses: number;
}

export interface FilterCriteria {
  question: string;
  selectedAnswers: string[];
}

export interface Props {}
