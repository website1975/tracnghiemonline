
import React, { useEffect, useRef } from 'react';

// Declaration for KaTeX strictly for TS compiler, 
// as we are loading it from CDN in index.html
declare global {
  interface Window {
    renderMathInElement: (element: HTMLElement, options: any) => void;
  }
}

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '', inline = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && window.renderMathInElement) {
      try {
        // Configure KaTeX auto-render
        window.renderMathInElement(containerRef.current, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false },
            { left: "\\(", right: "\\)", display: false },
            { left: "\\[", right: "\\]", display: true }
          ],
          throwOnError: false,
          errorColor: '#cc0000',
        });
      } catch (e) {
        console.warn("KaTeX rendering failed (likely due to quirks mode):", e);
        // Fallback: Do nothing, just show raw text
      }
    }
  }, [text]);

  // If text is empty/undefined
  if (!text) return null;

  // Use span by default for inline text to prevent layout breaks
  const Tag = inline ? 'span' : 'div';

  return (
    <Tag 
      ref={containerRef} 
      className={`math-content ${className}`}
      // Enable HTML rendering to support <img> tags for questions
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};
