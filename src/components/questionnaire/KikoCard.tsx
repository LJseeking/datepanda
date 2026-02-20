"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Image from 'next/image';
import { KikoQuestion } from "@/lib/questionnaire/kikoQuestions";

interface KikoCardProps {
    question: KikoQuestion | null;
    onAnswer: (value: number) => void;
    kikoMessage?: string; // Optional interruption/chat message instead of a question
}

// 5-point scale options
const OPTIONS = [
    { value: 1, label: "完全不是", emoji: "🙅‍♂️", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
    { value: 2, label: "偶尔吧", emoji: "😐", color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700" },
    { value: 3, label: "说不好", emoji: "🤔", color: "bg-gray-100 hover:bg-gray-200 text-gray-700" },
    { value: 4, label: "挺像的", emoji: "🙋‍♂️", color: "bg-pink-50 hover:bg-pink-100 text-pink-700" },
    { value: 5, label: "就是我", emoji: "💯", color: "bg-rose-100 hover:bg-rose-200 text-rose-700" },
];

export default function KikoCard({ question, onAnswer, kikoMessage }: KikoCardProps) {
    const [isAnimating, setIsAnimating] = useState(false);

    const handleSelect = (value: number) => {
        if (isAnimating) return;
        setIsAnimating(true);

        // Slight delay to show button press before firing callback to swap question
        setTimeout(() => {
            onAnswer(value);
            setIsAnimating(false);
        }, 400); // 400ms delay for animation
    };

    return (
        <div className="flex flex-col h-full w-full max-w-md mx-auto justify-between px-4 pb-8">

            {/* Top Section: Kiko Avatar & Chat Bubble */}
            <div className="flex-1 flex flex-col items-center justify-center mt-8">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="relative"
                >
                    {/* Kiko Avatar */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 animate-bounce-slow">
                        <div className="w-20 h-20 rounded-full bg-white shadow-lg overflow-hidden border-4 border-white flex items-center justify-center">
                            <Image src="/kiko-avatar.svg" alt="Kiko" width={80} height={80} className="object-cover" />
                        </div>
                    </div>

                    {/* Chat Bubble */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={question ? question.id : kikoMessage}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            transition={{ duration: 0.3, type: "spring" }}
                            className="absolute top-28 left-1/2 -translate-x-1/2 w-[280px] bg-white p-5 rounded-3xl rounded-tl-none shadow-xl border border-gray-100 z-20"
                        >
                            {/* Little tail pointing to Panda */}
                            <div className="absolute -top-3 left-6 w-6 h-6 bg-white rotate-45 border-l border-t border-gray-100 z-[-1]" />

                            <p className="text-gray-800 text-lg font-medium leading-relaxed">
                                {kikoMessage || question?.kikoText}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Bottom Section: 5 Jelly Buttons */}
            <div className="w-full mt-auto pt-48 space-y-3">
                {question && !kikoMessage ? (
                    <div className="grid grid-cols-1 gap-3">
                        {OPTIONS.map((opt) => (
                            <motion.button
                                key={opt.value}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(opt.value)}
                                disabled={isAnimating}
                                className={`w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-between transition-colors shadow-sm ${opt.color}`}
                            >
                                <span>{opt.label}</span>
                                <span className="text-2xl">{opt.emoji}</span>
                            </motion.button>
                        ))}
                    </div>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSelect(0)} // 0 means continue from a message
                        className="w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center bg-black text-white shadow-lg"
                    >
                        继续 / Continue
                    </motion.button>
                )}
            </div>
        </div>
    );
}
