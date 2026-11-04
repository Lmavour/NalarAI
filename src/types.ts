export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface CourseQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface CourseData {
  material: string[];
  quiz: CourseQuestion[];
}
