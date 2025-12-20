import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronLeft, ChevronRight, RotateCw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const Flashcard = ({
  flashcard,
  cardNumber,
  totalCards,
  onNext,
  onPrevious,
  onExplain,
  isExplaining
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState(flashcard.explanation || '');

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    setShowExplanation(false);
  };

  const handleExplain = async () => {
    if (!isFlipped) {
      setIsFlipped(true);
    }

    setShowExplanation(true);

    // If we don't have an explanation yet, request one
    if (!explanation && onExplain) {
      const newExplanation = await onExplain(flashcard.question, flashcard.answer);
      if (newExplanation) {
        setExplanation(newExplanation);
      }
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setShowExplanation(false);
    onNext();
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setShowExplanation(false);
    onPrevious();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card counter */}
      <div className="text-center mb-4 text-gray-600">
        Card {cardNumber} of {totalCards}
      </div>

      {/* Flashcard container */}
      <div className="perspective-1000 mb-6">
        <motion.div
          className="relative w-full h-80 cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        >
          {/* Front of card - Question */}
          <motion.div
            className="absolute w-full h-full bg-gray-600 rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="text-white text-center">
              <div className="mb-4 text-sm font-medium opacity-80">QUESTION</div>
              <div className="text-2xl font-semibold leading-relaxed">
                {flashcard.question}
              </div>
            </div>
            <div className="absolute bottom-6 text-white text-sm opacity-60 flex items-center gap-2">
              <RotateCw size={16} />
              Click to flip
            </div>
          </motion.div>

          {/* Back of card - Answer */}
          <motion.div
            className="absolute w-full h-full bg-black rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-white text-center">
              <div className="mb-4 text-sm font-medium opacity-80">ANSWER</div>
              <div className="text-xl font-medium leading-relaxed">
                {flashcard.answer}
              </div>
            </div>
            <div className="absolute bottom-6 text-white text-sm opacity-60 flex items-center gap-2">
              <RotateCw size={16} />
              Click to flip back
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Explanation section */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-3 text-amber-800 font-semibold">
              <Sparkles size={20} />
              <span>AI Explanation</span>
            </div>
            {isExplaining ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
              </div>
            ) : (
              <div className="text-gray-700 prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {explanation}
                </ReactMarkdown>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Previous button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrevious}
          disabled={cardNumber === 1}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${cardNumber === 1
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 shadow-sm'
            }`}
        >
          <ChevronLeft size={20} />
          Previous
        </motion.button>

        {/* Explain button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExplain}
          disabled={isExplaining}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HelpCircle size={20} />
          {showExplanation ? 'Hide Explanation' : 'Explain'}
        </motion.button>

        {/* Next button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleNext}
          disabled={cardNumber === totalCards}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${cardNumber === totalCards
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 shadow-sm'
            }`}
        >
          Next
          <ChevronRight size={20} />
        </motion.button>
      </div>

      {/* Progress indicator */}
      <div className="mt-6">
        <div className="flex gap-1 justify-center">
          {Array.from({ length: totalCards }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${index + 1 === cardNumber
                  ? 'w-8 bg-blue-500'
                  : 'w-1.5 bg-gray-300'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
