export const GerisabetLoader = () => (
    <li className="message ai-msg loading-indicator" style={{ listStyle: 'none' }}>
        <strong>GerisabetAI:</strong>
        <svg viewBox="0 0 240 80" xmlns="http://www.w3.org/2000/svg" width="240" height="80" style={{ overflow: 'visible' }}>
            <defs>
                <filter id="neon-cyan" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
                    <feMerge>
                        <feMergeNode in="blur2" />
                        <feMergeNode in="blur1" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <filter id="neon-pink" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                <style>{`
          .hex-core { stroke: var(--neon-cyan, #00f3ff); fill: none; stroke-width: 1.5; filter: url(#neon-cyan); animation: pulseHex 2s ease-in-out infinite; }
          .hud-ring-1 { stroke: var(--neon-cyan, #00f3ff); fill: none; stroke-width: 0.75; stroke-dasharray: 4 4 12 4; opacity: 0.6; }
          .hud-ring-2 { stroke: var(--neon-pink, #ff00ea); fill: none; stroke-width: 0.5; stroke-dasharray: 20 10 5 10; opacity: 0.8; }
          .data-stream { fill: var(--neon-yellow, #fcee0a); font-family: monospace; font-size: 5px; opacity: 0.8; }
          .text-main { fill: var(--neon-cyan, #00f3ff); font-family: 'Courier New', monospace; font-size: 8px; font-weight: bold; letter-spacing: 2px; filter: url(#neon-cyan); }
          .text-sub { fill: var(--neon-pink, #ff00ea); font-family: monospace; font-size: 6px; letter-spacing: 1px; }
          .glitch-box { fill: var(--neon-cyan, #00f3ff); opacity: 0.5; animation: glitchBox 3s infinite; }
          
          @keyframes pulseHex {
            0%, 100% { transform: scale(0.95); stroke-width: 1; opacity: 0.7; }
            50% { transform: scale(1.05); stroke-width: 2; opacity: 1; }
          }
          @keyframes glitchText {
            0%, 96%, 100% { transform: translate(0, 0); opacity: 1; }
            97% { transform: translate(-2px, 1px); opacity: 0.8; }
            98% { transform: translate(2px, -1px); opacity: 0.9; }
            99% { transform: translate(-1px, -2px); opacity: 0.7; }
          }
          @keyframes glitchBox {
            0%, 90%, 100% { width: 0; opacity: 0; }
            92% { width: 100px; opacity: 0.5; }
            95% { width: 40px; opacity: 0.2; }
          }
          @keyframes typeProgress {
            0% { stroke-dasharray: 0 100; }
            100% { stroke-dasharray: 100 0; }
          }
        `}</style>
            </defs>

            <g transform="translate(40, 40)">
                <circle className="hud-ring-1" cx="0" cy="0" r="22">
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="8s" repeatCount="indefinite" />
                </circle>
                <circle className="hud-ring-2" cx="0" cy="0" r="18">
                    <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="5s" repeatCount="indefinite" />
                </circle>

                <polygon className="hex-core" points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" />

                <circle cx="0" cy="0" r="2" fill="var(--neon-pink, #ff00ea)" filter="url(#neon-pink)">
                    <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
                </circle>

                <path d="M -28,0 L -24,0 M 24,0 L 28,0 M 0,-28 L 0,-24 M 0,24 L 0,28" stroke="var(--neon-cyan, #00f3ff)" strokeWidth="1" opacity="0.5" />
            </g>

            <g transform="translate(80, 25)">
                <text className="text-main" x="0" y="0" style={{ animation: 'glitchText 4s infinite' }}>
                    NEURAL_LINK_ESTABLISHED
                </text>

                <text className="text-sub" x="0" y="12">
                    &gt; SYNCING_VECTOR_NODES...
                    <tspan>
                        <animate attributeName="opacity" values="0;1;0" dur="0.8s" repeatCount="indefinite" />
                        _
                    </tspan>
                </text>

                <line x1="0" y1="22" x2="120" y2="22" stroke="#222" strokeWidth="2" />
                <line x1="0" y1="22" x2="120" y2="22" stroke="var(--neon-cyan, #00f3ff)" strokeWidth="2" filter="url(#neon-cyan)">
                    <animate attributeName="stroke-dasharray" values="0, 120; 120, 0" dur="2s" repeatCount="indefinite" />
                </line>

                <rect className="glitch-box" x="0" y="-8" height="10" />

                <text className="data-stream" x="0" y="32">
                    0x0F2A <tspan opacity="0.5">0x1B89</tspan> 0x3C4F <tspan opacity="0.5">0x77E1</tspan>
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="0.5s" repeatCount="indefinite" />
                </text>
                <text className="data-stream" x="75" y="32" fill="var(--neon-pink, #ff00ea)">
                    [ALLOCATING]
                </text>
            </g>
        </svg>
    </li>
);