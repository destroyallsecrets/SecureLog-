import { motion } from 'motion/react';

interface AudioWaveProps {
  isListening: boolean;
}

export default function AudioWave({ isListening }: AudioWaveProps) {
  if (!isListening) {
    return (
      <div className="flex items-center justify-center space-x-1 h-8 opacity-40">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-2 bg-gray-400 rounded-full transition-all duration-300"
          />
        ))}
      </div>
    );
  }

  // Generate 7 bounce heights with different animation offsets
  const barVariants = {
    animate: (i: number) => ({
      height: [8, 36, 8],
      transition: {
        duration: 0.6 + i * 0.1,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut",
      },
    }),
  };

  return (
    <div className="flex items-center justify-center space-x-1.5 h-12">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          custom={i}
          variants={barVariants}
          animate="animate"
          className="w-1.5 bg-emerald-500 rounded-full"
          style={{
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
          }}
        />
      ))}
    </div>
  );
}
