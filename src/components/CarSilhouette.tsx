interface CarSilhouetteProps {
  color: string
  size?: number
}

export function CarSilhouette({ color, size = 90 }: CarSilhouetteProps) {
  const w = Math.round(size * 0.58)
  const h = size

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 58 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Silhueta de carro"
    >
      {/* Main body */}
      <path
        d="M11,16 Q11,5 29,5 Q47,5 47,16 L47,84 Q47,95 29,95 Q11,95 11,84 Z"
        fill={color}
        opacity="0.85"
      />

      {/* Front windshield */}
      <rect x="16" y="20" width="26" height="14" rx="3" fill="rgba(0,0,0,0.52)" />

      {/* Cabin roof */}
      <rect x="14" y="38" width="30" height="22" rx="3" fill={color} opacity="0.55" />

      {/* Rear windshield */}
      <rect x="16" y="64" width="26" height="13" rx="3" fill="rgba(0,0,0,0.52)" />

      {/* Front-left wheel */}
      <rect x="1" y="15" width="10" height="18" rx="4" fill={color} opacity="0.58" />
      {/* Front-right wheel */}
      <rect x="47" y="15" width="10" height="18" rx="4" fill={color} opacity="0.58" />

      {/* Rear-left wheel */}
      <rect x="1" y="67" width="10" height="18" rx="4" fill={color} opacity="0.58" />
      {/* Rear-right wheel */}
      <rect x="47" y="67" width="10" height="18" rx="4" fill={color} opacity="0.58" />

      {/* Headlights (front) */}
      <rect x="16" y="6" width="9" height="5" rx="2" fill="rgba(255,255,160,0.88)" />
      <rect x="33" y="6" width="9" height="5" rx="2" fill="rgba(255,255,160,0.88)" />

      {/* Taillights (rear) */}
      <rect x="16" y="89" width="9" height="5" rx="2" fill="rgba(255,50,50,0.88)" />
      <rect x="33" y="89" width="9" height="5" rx="2" fill="rgba(255,50,50,0.88)" />

      {/* Side mirrors */}
      <rect x="5" y="23" width="7" height="8" rx="2" fill={color} opacity="0.5" />
      <rect x="46" y="23" width="7" height="8" rx="2" fill={color} opacity="0.5" />
    </svg>
  )
}
