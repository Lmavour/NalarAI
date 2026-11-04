import { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleAlert,
  Heart,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import type { CourseData } from '../types';
import { generateCourse, getCorrectOptionIndex } from '../utils/course';
import { playSound } from '../utils/audio';

type Phase = 'start' | 'loading' | 'lesson' | 'quiz' | 'complete' | 'out-of-hearts';
type AnswerState = 'correct' | 'wrong' | null;

const TOPIC_IDEAS = ['How the brain learns', 'Basic astronomy', 'JavaScript closures'];
const LOADING_MESSAGES = [
  'Finding the clearest ideas...',
  'Building your flashcards...',
  'Writing a clever quiz...',
];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const MAX_HEARTS = 3;

function CourseHeader({
  progress,
  hearts,
  onExit,
}: {
  progress: number;
  hearts: number;
  onExit: () => void;
}) {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-5 sm:px-6 sm:pt-6">
      <button
        type="button"
        onClick={onExit}
        className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        aria-label="Exit lesson"
      >
        <X className="size-6" strokeWidth={3} />
      </button>

      <div
        className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200 shadow-inner"
        role="progressbar"
        aria-label="Lesson progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <motion.div
          className="h-full rounded-full bg-brand-primary shadow-[inset_0_-3px_0_rgba(22,163,74,0.25)]"
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 18 }}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1" aria-label={`${hearts} of ${MAX_HEARTS} hearts remaining`}>
        {Array.from({ length: MAX_HEARTS }, (_, index) => (
          <Heart
            key={index}
            className={`size-5 transition-all sm:size-6 ${
              index < hearts ? 'fill-brand-error text-brand-error' : 'fill-slate-200 text-slate-200'
            }`}
            strokeWidth={2.5}
            aria-hidden="true"
          />
        ))}
      </div>
    </header>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn-tactile flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-green-700 bg-brand-primary px-6 py-3 text-base font-black uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:shadow-none sm:text-lg"
    >
      {children}
    </button>
  );
}

function StartScreen({
  topic,
  error,
  onTopicChange,
  onSubmit,
}: {
  topic: string;
  error: string | null;
  onTopicChange: (topic: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fbfcf7] px-4 py-10 sm:px-6">
      <div className="course-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="absolute -left-28 top-1/4 size-72 rounded-full bg-green-100/60 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-28 bottom-0 size-80 rounded-full bg-blue-100/60 blur-3xl" aria-hidden="true" />

      <motion.div
        initial={{ y: 22, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="mb-8 text-center sm:mb-10">
          <motion.div
            initial={{ rotate: -8, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className="relative mx-auto mb-5 size-24 sm:size-28"
          >
            <div className="absolute -inset-3 rotate-6 rounded-[2rem] bg-brand-accent/25" aria-hidden="true" />
            <img
              src="/nalarailogo.jpg"
              alt="Nalar.ai"
              className="relative size-full rounded-[1.75rem] border-4 border-white object-cover shadow-[0_8px_0_0_rgb(22,163,74)]"
            />
            <span className="absolute -right-3 -top-3 grid size-10 place-items-center rounded-2xl border-2 border-amber-300 bg-amber-100 shadow-md">
              <Sparkles className="size-5 text-amber-600" aria-hidden="true" />
            </span>
          </motion.div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em] text-green-700">
            <Zap className="size-3.5 fill-green-600" aria-hidden="true" />
            Learn it. Test it. Own it.
          </div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-800 sm:text-5xl">
            What will you <span className="text-brand-primary">master</span> today?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-500 sm:text-base">
            Turn any topic into a bite-sized lesson and an interactive challenge in seconds.
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-[1.75rem] border-2 border-slate-200 bg-white p-4 shadow-[0_7px_0_0_rgb(226,232,240)] sm:p-5">
          <label htmlFor="learning-topic" className="mb-2 block text-sm font-extrabold text-slate-700">
            What do you want to learn today?
          </label>
          <div className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 transition focus-within:border-brand-primary focus-within:bg-white focus-within:ring-4 focus-within:ring-green-100">
            <BrainCircuit className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              id="learning-topic"
              value={topic}
              onChange={event => onTopicChange(event.target.value)}
              maxLength={120}
              autoComplete="off"
              placeholder="e.g. Why do we dream?"
              className="min-h-14 w-full bg-transparent py-3 text-base font-bold text-slate-800 placeholder:font-semibold placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <PrimaryButton type="submit" disabled={!topic.trim()}>
            Start Learning
            <ArrowRight className="size-5" strokeWidth={3} aria-hidden="true" />
          </PrimaryButton>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-relaxed text-red-700" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold text-slate-400">Try:</span>
          {TOPIC_IDEAS.map(idea => (
            <button
              key={idea}
              type="button"
              onClick={() => onTopicChange(idea)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:text-green-700"
            >
              {idea}
            </button>
          ))}
        </div>
      </motion.div>
    </main>
  );
}

function LoadingScreen({ topic }: { topic: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex(index => (index + 1) % LOADING_MESSAGES.length),
      1800,
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fbfcf7] px-6 text-center">
      <div className="course-grid absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative z-10 max-w-sm" role="status" aria-live="polite">
        <div className="relative mx-auto mb-8 h-40 w-52" aria-hidden="true">
          <motion.div
            animate={{ rotate: [0, 4, -4, 0], y: [0, -8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-1/2 top-2 z-10 -translate-x-1/2"
          >
            <img
              src="/nalarailogo.jpg"
              alt=""
              className="size-24 rounded-[1.75rem] border-4 border-white object-cover shadow-[0_7px_0_0_rgb(22,163,74)]"
            />
          </motion.div>
          {[0, 1, 2].map(index => (
            <motion.span
              key={index}
              className={`absolute bottom-2 size-11 rounded-2xl border-2 border-white shadow-md ${
                index === 0 ? 'left-3 bg-blue-400' : index === 1 ? 'left-[5.25rem] bg-amber-400' : 'right-3 bg-purple-400'
              }`}
              animate={{ y: [0, -14, 0], rotate: [0, index % 2 ? 8 : -8, 0] }}
              transition={{ duration: 1, repeat: Infinity, delay: index * 0.16 }}
            />
          ))}
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl">Crafting your lesson</h1>
        <p className="mt-2 line-clamp-2 text-base font-extrabold text-brand-primary">{topic}</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-4 text-sm font-semibold text-slate-500"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
        <div className="mx-auto mt-6 flex w-fit gap-2" aria-hidden="true">
          {[0, 1, 2].map(index => (
            <motion.span
              key={index}
              className="size-2.5 rounded-full bg-brand-primary"
              animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.18 }}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function MicroCourse() {
  const shouldReduceMotion = useReducedMotion();
  const requestController = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>('start');
  const [topic, setTopic] = useState('');
  const [courseTopic, setCourseTopic] = useState('');
  const [course, setCourse] = useState<CourseData | null>(null);
  const [materialIndex, setMaterialIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>(null);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => requestController.current?.abort(), []);

  const totalSteps = course ? course.material.length + course.quiz.length : 1;
  let completedSteps = 0;
  if (course && phase === 'lesson') completedSteps = materialIndex;
  if (course && phase === 'quiz') {
    completedSteps = course.material.length + questionIndex + (answerState ? 1 : 0);
  }
  if (course && phase === 'out-of-hearts') {
    completedSteps = course.material.length + questionIndex + 1;
  }
  if (phase === 'complete') completedSteps = totalSteps;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  const resetSession = () => {
    setMaterialIndex(0);
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswerState(null);
    setHearts(MAX_HEARTS);
    setScore(0);
  };

  const goHome = () => {
    requestController.current?.abort();
    resetSession();
    setTopic('');
    setCourse(null);
    setCourseTopic('');
    setError(null);
    setPhase('start');
  };

  const startCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) return;

    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    resetSession();
    setError(null);
    setCourseTopic(trimmedTopic);
    setPhase('loading');

    try {
      const generatedCourse = await generateCourse(trimmedTopic, controller.signal);
      if (controller.signal.aborted) return;
      setCourse(generatedCourse);
      setPhase('lesson');
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong while creating your course. Please try again.',
      );
      setPhase('start');
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  };

  const continueLesson = () => {
    if (!course) return;
    playSound('pop');
    if (materialIndex < course.material.length - 1) {
      setMaterialIndex(index => index + 1);
      return;
    }
    setPhase('quiz');
  };

  const answerQuestion = (optionIndex: number) => {
    if (!course || answerState) return;
    const question = course.quiz[questionIndex];
    const correctOptionIndex = getCorrectOptionIndex(question);
    const isCorrect = optionIndex === correctOptionIndex;

    setSelectedOption(optionIndex);
    if (isCorrect) {
      setAnswerState('correct');
      setScore(currentScore => currentScore + 1);
      playSound('success');
      navigator.vibrate?.(35);
    } else {
      setAnswerState('wrong');
      setHearts(currentHearts => Math.max(0, currentHearts - 1));
      playSound('error');
      navigator.vibrate?.([70, 40, 70]);
    }
  };

  const continueQuiz = () => {
    if (!course || !answerState) return;

    if (questionIndex === course.quiz.length - 1) {
      setPhase('complete');
      playSound('success');
      return;
    }
    if (hearts === 0) {
      setPhase('out-of-hearts');
      return;
    }

    setQuestionIndex(index => index + 1);
    setSelectedOption(null);
    setAnswerState(null);
  };

  const retryCourse = () => {
    resetSession();
    setPhase('lesson');
  };

  if (phase === 'start') {
    return (
      <StartScreen
        topic={topic}
        error={error}
        onTopicChange={value => {
          setTopic(value);
          if (error) setError(null);
        }}
        onSubmit={startCourse}
      />
    );
  }

  if (phase === 'loading') return <LoadingScreen topic={courseTopic} />;
  if (!course) return null;

  const currentQuestion = course.quiz[questionIndex];
  const correctOptionIndex = currentQuestion ? getCorrectOptionIndex(currentQuestion) : -1;
  const transitionDistance = shouldReduceMotion ? 0 : 24;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#fbfcf7] text-slate-800">
      <div className="course-grid fixed inset-0 opacity-50" aria-hidden="true" />
      <div className="fixed -left-24 bottom-0 size-72 rounded-full bg-green-100/50 blur-3xl" aria-hidden="true" />
      <div className="fixed -right-24 top-20 size-72 rounded-full bg-blue-100/50 blur-3xl" aria-hidden="true" />

      <CourseHeader progress={progress} hearts={hearts} onExit={goHome} />

      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'lesson' && (
            <motion.section
              key={`material-${materialIndex}`}
              initial={{ x: transitionDistance, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -transitionDistance, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex min-h-[calc(100dvh-6.5rem)] flex-col"
            >
              <div className="mb-4 flex items-center justify-between gap-4 pt-3 sm:mb-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-primary">Lesson phase</p>
                  <h1 className="mt-1 line-clamp-2 text-xl font-black tracking-tight text-slate-800 sm:text-2xl">{courseTopic}</h1>
                </div>
                <div className="shrink-0 rounded-2xl border-2 border-blue-200 bg-blue-50 px-3 py-2 text-center text-blue-700">
                  <span className="block text-[10px] font-black uppercase tracking-wider">Card</span>
                  <span className="text-sm font-black">{materialIndex + 1}/{course.material.length}</span>
                </div>
              </div>

              <div className="flex flex-1 items-center py-4">
                <div className="relative w-full rounded-[2rem] border-2 border-slate-200 bg-white p-6 shadow-[0_8px_0_0_rgb(226,232,240)] sm:p-10">
                  <div className="absolute -top-5 left-6 grid size-11 place-items-center rounded-2xl border-2 border-green-200 bg-green-100 text-green-700 shadow-sm sm:left-10">
                    <BookOpen className="size-5" strokeWidth={2.5} aria-hidden="true" />
                  </div>
                  <div className="mb-5 mt-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
                    <span className="h-px flex-1 bg-slate-100" />
                    Key idea
                    <span className="h-px flex-1 bg-slate-100" />
                  </div>
                  <p className="text-balance text-xl font-extrabold leading-[1.65] tracking-[-0.02em] text-slate-700 sm:text-2xl sm:leading-[1.6]">
                    {course.material[materialIndex]}
                  </p>
                  <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-800">
                    <Lightbulb className="mt-0.5 size-5 shrink-0 fill-amber-300 text-amber-600" aria-hidden="true" />
                    Take a moment to explain this idea in your own words before moving on.
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t-2 border-slate-200/80 pt-4 sm:mt-7 sm:pt-5">
                <PrimaryButton onClick={continueLesson}>
                  {materialIndex === course.material.length - 1 ? 'Start Quiz' : 'Continue'}
                  <ChevronRight className="size-5" strokeWidth={3} aria-hidden="true" />
                </PrimaryButton>
              </div>
            </motion.section>
          )}

          {phase === 'quiz' && currentQuestion && (
            <motion.section
              key={`question-${questionIndex}`}
              initial={{ x: transitionDistance, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -transitionDistance, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="flex min-h-[calc(100dvh-6.5rem)] flex-col"
            >
              <div className="mb-5 flex items-center justify-between gap-3 pt-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Challenge phase</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">Question {questionIndex + 1} of {course.quiz.length}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl border-2 border-amber-200 bg-amber-50 px-3 py-2 font-black text-amber-700">
                  <Zap className="size-4 fill-amber-500" aria-hidden="true" />
                  {score * 10} XP
                </div>
              </div>

              <div className="flex-1">
                <h1 className="mb-6 text-balance text-2xl font-black leading-snug tracking-[-0.03em] text-slate-800 sm:text-3xl">
                  {currentQuestion.question}
                </h1>

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4" role="group" aria-label="Answer choices">
                  {currentQuestion.options.map((option, optionIndex) => {
                    const isSelected = selectedOption === optionIndex;
                    const isCorrectOption = answerState && optionIndex === correctOptionIndex;
                    const isWrongSelection = answerState === 'wrong' && isSelected;
                    let optionStyle = 'border-slate-200 bg-white text-slate-700 shadow-[0_4px_0_0_rgb(226,232,240)] hover:border-blue-300 hover:bg-blue-50';
                    let labelStyle = 'border-slate-200 bg-slate-50 text-slate-500';

                    if (isCorrectOption) {
                      optionStyle = 'border-green-500 bg-green-50 text-green-800 shadow-[0_4px_0_0_rgb(34,197,94)]';
                      labelStyle = 'border-green-500 bg-green-500 text-white';
                    } else if (isWrongSelection) {
                      optionStyle = 'border-brand-error bg-red-50 text-red-800 shadow-[0_4px_0_0_rgb(239,68,68)]';
                      labelStyle = 'border-brand-error bg-brand-error text-white';
                    } else if (isSelected) {
                      optionStyle = 'border-blue-500 bg-blue-50 text-blue-800 shadow-[0_4px_0_0_rgb(59,130,246)]';
                      labelStyle = 'border-blue-500 bg-blue-500 text-white';
                    } else if (answerState) {
                      optionStyle = 'border-slate-200 bg-slate-50 text-slate-400 shadow-none';
                    }

                    return (
                      <motion.button
                        key={`${optionIndex}-${option}`}
                        type="button"
                        onClick={() => answerQuestion(optionIndex)}
                        disabled={Boolean(answerState)}
                        whileTap={answerState ? undefined : { scale: 0.98 }}
                        className={`relative flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left text-sm font-extrabold leading-relaxed transition sm:text-base ${optionStyle}`}
                        aria-pressed={isSelected}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl border-2 text-sm font-black transition ${labelStyle}`}>
                          {isCorrectOption ? <Check className="size-5" strokeWidth={3} /> : OPTION_LABELS[optionIndex]}
                        </span>
                        <span>{option}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence>
                {answerState && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`-mx-4 mt-7 border-t-2 px-4 pb-2 pt-5 sm:-mx-6 sm:px-6 ${
                      answerState === 'correct' ? 'border-green-200 bg-green-50/80' : 'border-red-200 bg-red-50/80'
                    }`}
                    aria-live="polite"
                  >
                    <div className="mx-auto max-w-3xl">
                      <div className="mb-4 flex items-start gap-3">
                        <motion.div
                          initial={{ scale: 0.4, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${
                            answerState === 'correct' ? 'bg-brand-primary' : 'bg-brand-error'
                          }`}
                        >
                          {answerState === 'correct' ? <Check className="size-6" strokeWidth={3.5} /> : <X className="size-6" strokeWidth={3.5} />}
                        </motion.div>
                        <div>
                          <h2 className={`text-xl font-black ${answerState === 'correct' ? 'text-green-700' : 'text-red-700'}`}>
                            {answerState === 'correct' ? 'Excellent!' : 'Not quite yet'}
                          </h2>
                          <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-600">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      </div>
                      <PrimaryButton onClick={continueQuiz}>
                        {questionIndex === course.quiz.length - 1 ? 'See Results' : hearts === 0 ? 'Review Lesson' : 'Continue'}
                        <ChevronRight className="size-5" strokeWidth={3} aria-hidden="true" />
                      </PrimaryButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {phase === 'complete' && (
            <motion.section
              key="complete"
              initial={{ scale: shouldReduceMotion ? 1 : 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex min-h-[calc(100dvh-6.5rem)] items-center justify-center py-8 text-center"
            >
              <div className="w-full max-w-lg rounded-[2rem] border-2 border-amber-200 bg-white p-6 shadow-[0_9px_0_0_rgb(253,224,71)] sm:p-10">
                <div className="relative mx-auto mb-6 size-28">
                  <motion.div
                    animate={shouldReduceMotion ? undefined : { rotate: [0, -8, 8, 0], y: [0, -5, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                    className="grid size-full place-items-center rounded-full border-4 border-amber-300 bg-amber-100 shadow-[0_7px_0_0_rgb(245,158,11)]"
                  >
                    <Trophy className="size-14 fill-amber-400 text-amber-600" strokeWidth={2.2} aria-hidden="true" />
                  </motion.div>
                  <Sparkles className="absolute -right-4 -top-2 size-8 fill-brand-accent text-brand-accent" aria-hidden="true" />
                  <Sparkles className="absolute -bottom-1 -left-5 size-6 fill-brand-primary text-brand-primary" aria-hidden="true" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Course cleared</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-800 sm:text-4xl">Lesson Complete!</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                  You finished <strong className="text-slate-700">{courseTopic}</strong>. Every big skill starts with one focused lesson.
                </p>

                <div className="my-7 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
                    <p className="text-2xl font-black text-green-700">{score}/{course.quiz.length}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-green-600">Correct</p>
                  </div>
                  <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                    <p className="text-2xl font-black text-amber-700">+{score * 10}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-wider text-amber-600">XP earned</p>
                  </div>
                </div>

                <PrimaryButton onClick={goHome}>
                  Learn Something New
                  <ArrowRight className="size-5" strokeWidth={3} aria-hidden="true" />
                </PrimaryButton>
              </div>
            </motion.section>
          )}

          {phase === 'out-of-hearts' && (
            <motion.section
              key="out-of-hearts"
              initial={{ y: transitionDistance, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex min-h-[calc(100dvh-6.5rem)] items-center justify-center py-8 text-center"
            >
              <div className="w-full max-w-lg rounded-[2rem] border-2 border-red-200 bg-white p-6 shadow-[0_9px_0_0_rgb(254,202,202)] sm:p-10">
                <div className="mx-auto mb-6 grid size-24 place-items-center rounded-full border-4 border-red-200 bg-red-50">
                  <Heart className="size-12 fill-slate-200 text-slate-300" strokeWidth={2.5} aria-hidden="true" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-500">Pause and recharge</p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-800">Out of hearts</h1>
                <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                  Review the flashcards, then take another run at the challenge with three fresh hearts.
                </p>
                <div className="mt-7 space-y-3">
                  <PrimaryButton onClick={retryCourse}>
                    <RotateCcw className="size-5" strokeWidth={3} aria-hidden="true" />
                    Review & Retry
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={goHome}
                    className="min-h-12 w-full rounded-2xl font-extrabold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    Choose another topic
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
