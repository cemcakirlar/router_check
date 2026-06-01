import { useMemo } from 'react';

interface SparklineProps {
  points: number[];
  maxPoints?: number;
  isUpload?: boolean;
}

export default function Sparkline({
  points,
  maxPoints = 50,
  isUpload = false,
}: SparklineProps) {
  const pathData = useMemo(() => {
    if (points.length < 2) return '';
    
    const width = 150;
    const height = 40;
    
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    
    // Calculate SVG path coordinate string
    return points
      .map((p, i) => {
        const x = (i / (maxPoints - 1)) * width;
        const y = height - ((p - min) / range) * (height - 8) - 4;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [points, maxPoints]);

  return (
    <svg className="sparkline" viewBox="0 0 150 40" preserveAspectRatio="none">
      <path
        className={`sparkline-path ${isUpload ? 'sparkline-path-ul' : ''}`}
        d={pathData}
      />
    </svg>
  );
}
