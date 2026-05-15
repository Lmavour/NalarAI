import React from 'react';
import Quiz from './interactions/Quiz';
import GapFill from './interactions/GapFill';
import Paraphrase from './interactions/Paraphrase';

interface InteractionDispatcherProps {
  content: string;
  onComplete: (data: { feedback: string; success: boolean }) => void;
}

export default function InteractionDispatcher({ content, onComplete }: InteractionDispatcherProps) {
  // Regex to match [[TYPE:JSON_DATA]]
  const quizRegex = /\[\[QUIZ:(.*?)\]\]/s;
  const gapFillRegex = /\[\[GAP_FILL:(.*?)\]\]/s;
  const paraphraseRegex = /\[\[PARAPHRASE:(.*?)\]\]/s;

  const quizMatch = content.match(quizRegex);
  if (quizMatch) {
    try {
      const data = JSON.parse(quizMatch[1]);
      return <Quiz data={data} onComplete={onComplete} />;
    } catch (e) {
      console.error('Quiz JSON Parse error', e);
    }
  }

  const gapFillMatch = content.match(gapFillRegex);
  if (gapFillMatch) {
    try {
      const data = JSON.parse(gapFillMatch[1]);
      return <GapFill data={data} onComplete={onComplete} />;
    } catch (e) {
      console.error('GapFill JSON Parse error', e);
    }
  }

  const paraphraseMatch = content.match(paraphraseRegex);
  if (paraphraseMatch) {
    try {
      const data = JSON.parse(paraphraseMatch[1]);
      return <Paraphrase data={data} onComplete={onComplete} />;
    } catch (e) {
      console.error('Paraphrase JSON Parse error', e);
    }
  }

  return null;
}
