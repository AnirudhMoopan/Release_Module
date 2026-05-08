import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Signature({ isActive, onClose, redirectTo }: { isActive: boolean, onClose: () => void, redirectTo?: string }) {
  const [phase, setPhase] = useState<0|1|2|3|4|5>(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isActive) {
      setPhase(1);
      
      // Phase 1: Loading bar fills up
      const t1 = setTimeout(() => {
        setPhase(2);
        
        // Phase 2: Fade out global DOM elements cascading
        const elementsToFade = document.querySelectorAll(
          'aside, header, main, .glass-panel, table, .queue-item-card, .history-row, button, input'
        );
        
        elementsToFade.forEach((el, index) => {
           // Skip fading our own overlay if it somehow matches
           if ((el as HTMLElement).closest('.ank-signature-overlay')) return;

           setTimeout(() => {
              (el as HTMLElement).style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
              (el as HTMLElement).style.opacity = '0';
              (el as HTMLElement).style.transform = 'translateY(15px) scale(0.98)';
           }, Math.random() * 600 + index * 5); // Domino effect
        });

        // Phase 3: "Congrats"
        const t2 = setTimeout(() => {
          setPhase(3);
        }, 1200);
        
        // Phase 4: "for finding that feature"
        const t3 = setTimeout(() => {
          setPhase(4);
        }, 4000); // 1.2s + 2.8s
        
        // Phase 5: "Thank you for using release module" + signature
        const t4 = setTimeout(() => {
          setPhase(5);
        }, 7000); // 4.0s + 3.0s

        // Auto-close / reset after sequence
        const t5 = setTimeout(() => {
           setPhase(0);
           onClose();
           
           // Restore DOM elements instantly
           elementsToFade.forEach((el) => {
              (el as HTMLElement).style.transition = 'none';
              (el as HTMLElement).style.opacity = '';
              (el as HTMLElement).style.transform = '';
           });
           
           if (redirectTo) navigate(redirectTo);
        }, 12000); // 7.0s + 5.0s
        
        return () => { clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
      }, 1500); // Wait 1.5s for loading bar

      return () => clearTimeout(t1);
    }
  }, [isActive, onClose, navigate]);

  if (!isActive) return null;

  return (
    <AnimatePresence>
       {/* Fullscreen Overlay Canvas */}
       <div className={`ank-signature-overlay fixed inset-0 z-[999999] pointer-events-none transition-colors duration-1000 ${phase >= 3 ? 'bg-black' : 'bg-transparent'}`}>
         
         {/* Phase 1: Loading Bar */}
         {phase === 1 && (
           <motion.div 
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden shadow-[0_0_20px_rgba(0,132,255,0.3)]"
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 1.2 }}
             transition={{ duration: 0.3 }}
           >
             <motion.div 
               className="h-full bg-gradient-to-r from-[#0084FF] via-[#10B981] to-[#F59E0B]"
               initial={{ width: "0%" }}
               animate={{ width: "100%" }}
               transition={{ duration: 1.2, ease: "easeInOut" }}
             />
           </motion.div>
         )}

         {/* Phase 3: Congrats */}
         {phase === 3 && (
           <motion.div 
             key="congrats"
             className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black pointer-events-auto"
             initial={{ opacity: 0, filter: 'blur(20px)', scale: 0.8 }}
             animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
             exit={{ opacity: 0, filter: 'blur(15px)', scale: 1.2 }}
             transition={{ duration: 1.2, ease: "easeOut" }}
           >
             <motion.h1 
               className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)] tracking-tight"
             >
               Achievement Unlocked
             </motion.h1>
           </motion.div>
         )}

         {/* Phase 4: Finding the feature */}
         {phase === 4 && (
           <motion.div 
             key="finding"
             className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black pointer-events-auto"
             initial={{ opacity: 0, filter: 'blur(15px)', y: 20 }}
             animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
             exit={{ opacity: 0, filter: 'blur(10px)', y: -20 }}
             transition={{ duration: 1.2, ease: "easeOut" }}
           >
             <motion.h2 
               className="text-4xl md:text-6xl font-light text-white tracking-wide"
             >
               You've discovered the hidden developer override.
             </motion.h2>
             <motion.div
                className="mt-6 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "200px", opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
             />
           </motion.div>
         )}

         {/* Phase 5: Thank You & Signature */}
         {phase === 5 && (
           <motion.div 
             key="thankyou-signature"
             className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-black pointer-events-auto"
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, filter: 'blur(10px)' }}
             transition={{ duration: 1.5, ease: "easeOut" }}
           >
             <motion.h1 
               className="text-3xl md:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-emerald-400 to-purple-400 mb-12 drop-shadow-[0_0_40px_rgba(16,185,129,0.4)] tracking-tight"
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ duration: 1, delay: 0.3 }}
             >
               Thank you for using Release Module
             </motion.h1>

             <motion.div 
               className="flex items-center gap-4 text-xl md:text-3xl text-gray-400 font-mono tracking-widest"
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               transition={{ duration: 1, delay: 1.5 }}
             >
               Crafted with 
               <motion.span 
                 className="text-red-500 text-4xl inline-block drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
               >
                 ❤️
               </motion.span> 
               <span className="text-white font-bold tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">by ANK</span>
             </motion.div>
           </motion.div>
         )}
       </div>
    </AnimatePresence>
  );
}
