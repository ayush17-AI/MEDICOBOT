'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export function MedicobotParticleTransition({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [animationStage, setAnimationStage] = useState<'assemble' | 'explode' | 'done'>('assemble');

  useEffect(() => {
    // Stage 1: Display structured logo briefly (1.2s)
    const timer = setTimeout(() => {
      setAnimationStage('explode');
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (animationStage !== 'explode') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Color palette matching MEDICOBOT letters
    const colors = [
      '#059669', // M (Teal)
      '#f59e0b', // E (Amber)
      '#d97706', // D (Yellow-Brown)
      '#e11d48', // i (Pill Red)
      '#dc2626', // C (Red)
      '#9333ea', // O (Purple)
      '#0284c7', // B (Sky)
      '#ea580c', // O (Orange)
      '#059669', // T (Emerald)
    ];

    const particles: Particle[] = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Generate 250 tiny beads/particles around center logo area
    for (let i = 0; i < 250; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 2;
      particles.push({
        x: centerX + (Math.random() - 0.5) * 280,
        y: centerY + (Math.random() - 0.5) * 60,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 1.5, // Tiny beads
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
      });
    }

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let activeParticles = 0;

      particles.forEach((p) => {
        if (p.alpha > 0) {
          activeParticles++;
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          ctx.save();
          ctx.globalAlpha = Math.max(p.alpha, 0);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.restore();
        }
      });

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setAnimationStage('done');
        if (onComplete) onComplete();
      }
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [animationStage, onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white">
      {animationStage === 'assemble' && (
        <div className="animate-bounce transition-transform duration-500 transform scale-110">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-amber-500 via-rose-500 to-emerald-500 drop-shadow-xl">
            MEDICOBOT
          </h1>
        </div>
      )}

      {animationStage === 'explode' && (
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
      )}
    </div>
  );
}
