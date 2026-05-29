export default function Logo({ size = 80 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      {/* Green - top */}
      <circle cx="100" cy="30" r="14" fill="#1A6B52"/>
      <rect x="62" y="50" width="22" height="42" rx="10" fill="#1d7743" transform="rotate(-40 73 71)"/>
      <rect x="116" y="50" width="22" height="42" rx="10" fill="#1A6B52" transform="rotate(40 127 71)"/>
      {/* Red - left */}
      <circle cx="30" cy="100" r="14" fill="#C0202A"/>
      <rect x="48" y="62" width="22" height="42" rx="10" fill="#C0202A" transform="rotate(50 59 83)"/>
      <rect x="48" y="96" width="22" height="42" rx="10" fill="#C0202A" transform="rotate(-50 59 117)"/>
      {/* Orange - right */}
      <circle cx="170" cy="100" r="14" fill="#E8601A"/>
      <rect x="130" y="62" width="22" height="42" rx="10" fill="#E8601A" transform="rotate(-50 141 83)"/>
      <rect x="130" y="96" width="22" height="42" rx="10" fill="#E8601A" transform="rotate(50 141 117)"/>
      {/* Black - bottom */}
      <circle cx="100" cy="170" r="14" fill="#1A1A1A"/>
      <rect x="62" y="108" width="22" height="42" rx="10" fill="#1A1A1A" transform="rotate(40 73 129)"/>
      <rect x="116" y="108" width="22" height="42" rx="10" fill="#1A1A1A" transform="rotate(-40 127 129)"/>
    </svg>
  );
}