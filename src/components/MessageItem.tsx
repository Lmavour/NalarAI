import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'motion/react';
import { Message } from '../types';

import InteractionDispatcher from './InteractionDispatcher';

interface MessageItemProps {
  message: Message;
  onInteractionComplete?: (data: { feedback: string; success: boolean }) => void;
}

const MessageItem = memo(function MessageItem({ message, onInteractionComplete }: MessageItemProps) {
  const isAssistant = message.role === 'assistant';

  // Clean the markdown text by removing the interaction tags (resilient to missing closing bracket)
  const cleanContent = message.content
    .replace(/\[\[QUIZ:.*?(\]\]|\]$)/gs, '')
    .replace(/\[\[GAP_FILL:.*?(\]\]|\]$)/gs, '')
    .replace(/\[\[PARAPHRASE:.*?(\]\]|\]$)/gs, '')
    .trim();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex items-end max-w-[92%] md:max-w-[85%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
          <div className={`px-4 sm:px-5 py-2.5 sm:py-3 border-2
            ${isAssistant
              ? 'ai-bubble text-slate-700'
              : 'user-bubble text-white font-bold'
            }`}
          >
            <div className="markdown-body overflow-wrap-anywhere break-words text-[14px] sm:text-[15px] md:text-base">
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
});

export default MessageItem;
