export const GerisabetLoader = () => (
    <li className="message ai-msg loading-indicator" style={{ listStyle: 'none' }}>
        <strong>GerisabetAI:</strong>
        <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" width="120" height="60">
            <defs>
                <style>{`
          .cube-face { stroke-width: 1.2; fill: none; }
          .pulse-ring { fill: none; stroke-width: 0.8; }
          .f1 { stroke: var(--accent-light); animation: faceFlicker 2.4s ease-in-out infinite; }
          .f2 { stroke: var(--teal); animation: faceFlicker 2.4s ease-in-out infinite 0.3s; }
          .f3 { stroke: var(--accent-dark); animation: faceFlicker 2.4s ease-in-out infinite 0.6s; }
          .edge { stroke: var(--accent); stroke-width: 0.6; opacity: 0.4; animation: edgePulse 2.4s ease-in-out infinite; }
          .ring1 { stroke: var(--teal); animation: ringExpand 2.4s ease-out infinite; }
          .ring2 { stroke: var(--accent); animation: ringExpand 2.4s ease-out infinite 0.8s; }
          .ring3 { stroke: var(--accent-light); animation: ringExpand 2.4s ease-out infinite 1.6s; }
          .dot  { fill: var(--teal); animation: dotBlink 2.4s ease-in-out infinite; }
          .dot2 { fill: var(--accent-light); animation: dotBlink 2.4s ease-in-out infinite 0.4s; }
          .dot3 { fill: var(--accent); animation: dotBlink 2.4s ease-in-out infinite 0.8s; }
          .scan { stroke: var(--teal); stroke-width: 0.5; opacity: 0; animation: scanLine 2.4s linear infinite; }
          @keyframes faceFlicker {
            0%,100%{opacity:.9} 40%{opacity:.2} 60%{opacity:1}
          }
          @keyframes edgePulse {
            0%,100%{opacity:.4} 50%{opacity:1}
          }
          @keyframes ringExpand {
            0%{r:0;opacity:.9} 100%{r:28;opacity:0}
          }
          @keyframes dotBlink {
            0%,100%{opacity:1} 50%{opacity:.2}
          }
          @keyframes scanLine {
            0%{opacity:0;transform:translateY(-14px)}
            10%{opacity:.7} 90%{opacity:.7}
            100%{opacity:0;transform:translateY(14px)}
          }
        `}</style>
            </defs>
            <g transform="translate(35,30)">
                <circle className="pulse-ring ring1" cx="0" cy="0" r="0" />
                <circle className="pulse-ring ring2" cx="0" cy="0" r="0" />
                <circle className="pulse-ring ring3" cx="0" cy="0" r="0" />
            </g>
            <g transform="translate(35,30)">
                <line className="scan" x1="-14" y1="0" x2="14" y2="0" />
                <line className="edge" x1="0" y1="-14" x2="14" y2="-7" />
                <line className="edge" x1="0" y1="-14" x2="-14" y2="-7" />
                <line className="edge" x1="14" y1="-7" x2="14" y2="7" />
                <polygon className="cube-face f1" points="0,-14 14,-7 0,0 -14,-7" />
                <polygon className="cube-face f2" points="-14,-7 0,0 0,14 -14,7" />
                <polygon className="cube-face f3" points="14,-7 0,0 0,14 14,7" />
                <circle className="dot"  cx="0"   cy="-14" r="1.5" />
                <circle className="dot2" cx="14"  cy="-7"  r="1.5" />
                <circle className="dot2" cx="-14" cy="-7"  r="1.5" />
                <circle className="dot3" cx="0"   cy="0"   r="1.5" />
                <circle className="dot"  cx="0"   cy="14"  r="1.5" />
                <circle className="dot2" cx="14"  cy="7"   r="1.5" />
                <circle className="dot2" cx="-14" cy="7"   r="1.5" />
            </g>
            <g transform="translate(35,30)">
                <circle r="2" fill="var(--teal)" opacity="0.9">
                    <animateMotion dur="2s" repeatCount="indefinite"
                                   path="M 18,0 A 18,18 0 1,1 17.99,0.1 Z" />
                </circle>
                <circle r="1.2" fill="var(--accent-light)" opacity="0.7">
                    <animateMotion dur="2s" repeatCount="indefinite" begin="-1s"
                                   path="M 18,0 A 18,18 0 1,1 17.99,0.1 Z" />
                </circle>
            </g>
            <text x="72" y="24" fontFamily="monospace" fontSize="7.5"
                  fill="var(--accent-light)" letterSpacing="1.5" opacity="0.9">THINKING</text>
            <text x="72" y="35" fontFamily="monospace" fontSize="6"
                  fill="var(--teal)" letterSpacing="1" opacity="0.7">
                processing
                <tspan>
                    <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
                    _
                </tspan>
            </text>
            <line x1="62" y1="44" x2="110" y2="44" stroke="var(--accent-dark)" strokeWidth="0.5" opacity="0.5">
                <animate attributeName="x2" values="62;110;62" dur="2.4s" repeatCount="indefinite" />
            </line>
        </svg>
    </li>

);
