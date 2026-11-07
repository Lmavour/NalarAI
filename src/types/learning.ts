export type LeagueTier = "Bronze" | "Silver" | "Sapphire" | "Diamond";

export type DashboardStats = {
  xp: number;
  hearts: number;
  streak: number;
  longestStreak: number;
  lessonsCompleted: number;
  league: LeagueTier;
};

export type DashboardProgress = {
  topic: string;
  completedStageIds: string[];
  activityDates: string[];
};

export type DashboardData = {
  user: {
    email: string;
    displayName: string;
    joinedAt: string;
  };
  stats: DashboardStats;
  progress: DashboardProgress;
};

export type LessonMaterial = {
  id: string;
  title: string;
  content: string;
  keyTakeaway: string;
};

export type LessonOption = {
  id: string;
  text: string;
};

export type LessonQuestion = {
  id: string;
  prompt: string;
  options: LessonOption[];
};

export type LessonSessionDto = {
  sessionId: string;
  stageId: string;
  title: string;
  overview: string;
  estimatedMinutes: number;
  material: LessonMaterial[];
  questions: LessonQuestion[];
  expiresAt: string;
};

export type LessonAward = {
  xpEarned: number;
  score: number;
  stats: DashboardStats;
  completedStageIds: string[];
};

export type AnswerResult = {
  questionId: string;
  correct: boolean;
  correctOptionId: string;
  explanation: string;
  completed: boolean;
  award?: LessonAward;
  progress?: DashboardProgress;
};
