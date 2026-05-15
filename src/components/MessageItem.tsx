import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { User, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Message } from '../types';

import InteractionDispatcher from './InteractionDispatcher';

interface MessageItemProps {
  message: Message;
  onInteractionComplete?: (data: { feedback: string; success: boolean }) => void;
}

export default function MessageItem({ message, onInteractionComplete }: MessageItemProps) {
  const isAssistant = message.role === 'assistant';

  // Clean the markdown text by removing the interaction tags
  const cleanContent = message.content
    .replace(/\[\[QUIZ:.*?\]\]/gs, '')
    .replace(/\[\[GAP_FILL:.*?\]\]/gs, '')
    .replace(/\[\[PARAPHRASE:.*?\]\]/gs, '')
    .trim();

  return (
    <motion.div 
      initial={{ opacity: 0, x: isAssistant ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex items-end max-w-[95%] md:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        {isAssistant && (
          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center mb-1 mr-2 shadow-[0_3px_0_0_rgb(22,163,74)] border-2 border-white">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
        
        <div className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'} w-full`}>
          <div className={`px-5 py-4 border-2 w-full
            ${isAssistant 
              ? 'ai-bubble text-slate-700' 
              : 'user-bubble text-white'
            }`}
          >
            <div className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {cleanContent}
              </ReactMarkdown>
            </div>

            {isAssistant && onInteractionComplete && (
              <InteractionDispatcher 
                content={message.content} 
                onComplete={onInteractionComplete} 
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
