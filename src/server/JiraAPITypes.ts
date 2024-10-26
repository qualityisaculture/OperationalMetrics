export type historyItem = {
  field: string;
  fromString: string;
  toString: string;
};

export type omHistoryItem = historyItem & {
  created: Date;
}

export type history = {
  created: string;
  items: historyItem[];
};