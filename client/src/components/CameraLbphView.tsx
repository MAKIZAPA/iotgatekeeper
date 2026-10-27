import React, { useRef, useEffect } from 'react';
import { Aperture, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';

interface CameraLbphViewProps {
  chi2Value: number;
  blinkVerified: boolean;
  isProcessing: boolean;
  fsmState: string;
}

// 48-Point Anatomical Biometric Wireframe Model (relative to face center)
const FACE_NODES: { x: number; y: number }[] = [
  // Forehead & hairline (0..7)
  { x: 0, y: -76 },     // 0: top forehead
  { x: -32, y: -70 },   // 1: upper forehead left
  { x: 32, y: -70 },    // 2: upper forehead right
  { x: -54, y: -50 },   // 3: temple left
  { x: 54, y: -50 },    // 4: temple right
  { x: -22, y: -48 },   // 5: mid forehead left
  { x: 22, y: -48 },    // 6: mid forehead right
  { x: 0, y: -46 },     // 7: mid forehead center

  // Eyebrows (8..14)
  { x: 0, y: -26 },     // 8: glabella
  { x: -16, y: -27 },   // 9: brow inner left
  { x: -34, y: -30 },   // 10: brow arch left
  { x: -48, y: -26 },   // 11: brow outer left
  { x: 16, y: -27 },    // 12: brow inner right
  { x: 34, y: -30 },    // 13: brow arch right
  { x: 48, y: -26 },    // 14: brow outer right

  // Eyes (15..22)
  { x: -16, y: -14 },   // 15: eye inner left
  { x: -28, y: -19 },   // 16: eye top left
  { x: -40, y: -14 },   // 17: eye outer left
  { x: -28, y: -9 },    // 18: eye bottom left
  { x: 16, y: -14 },    // 19: eye inner right
  { x: 28, y: -19 },    // 20: eye top right
  { x: 40, y: -14 },    // 21: eye outer right
  { x: 28, y: -9 },     // 22: eye bottom right

  // Nose (23..27)
  { x: 0, y: -14 },     // 23: nose bridge top
  { x: 0, y: 2 },       // 24: nose bridge mid
  { x: 0, y: 16 },      // 25: nose tip
  { x: -12, y: 14 },    // 26: left nostril
  { x: 12, y: 14 },     // 27: right nostril

  // Cheeks (28..31)
  { x: -48, y: -4 },    // 28: cheek upper left
  { x: 48, y: -4 },     // 29: cheek upper right
  { x: -36, y: 18 },    // 30: cheek mid left
  { x: 36, y: 18 },     // 31: cheek mid right

  // Mouth & Philtrum (32..38)
  { x: 0, y: 24 },      // 32: philtrum
  { x: -18, y: 34 },    // 33: mouth corner left
  { x: 18, y: 34 },     // 34: mouth corner right
  { x: 0, y: 31 },      // 35: upper lip center
  { x: 0, y: 39 },      // 36: mouth center
  { x: 0, y: 45 },      // 37: lower lip bottom
  { x: 0, y: 56 },      // 38: chin groove

  // Jaw & Chin Contour (39..47)
  { x: -58, y: 16 },    // 39: jaw high left
  { x: 58, y: 16 },     // 40: jaw high right
  { x: -46, y: 44 },    // 41: jaw mid left
  { x: 46, y: 44 },     // 42: jaw mid right
  { x: -28, y: 64 },    // 43: jaw low left
  { x: 28, y: 64 },     // 44: jaw low right
  { x: -14, y: 74 },    // 45: chin left
  { x: 14, y: 74 },     // 46: chin right
  { x: 0, y: 77 },      // 47: chin center bottom
];

const FACE_EDGES: [number, number][] = [
  // Forehead triangulation
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [2, 6], [0, 7], [5, 7], [6, 7],
  [5, 9], [6, 12], [7, 8], [3, 11], [4, 14],

  // Eyebrows
  [8, 9], [9, 10], [10, 11],
  [8, 12], [12, 13], [13, 14],

  // Left Eye loop & connection to brow
  [15, 16], [16, 17], [17, 18], [18, 15],
  [10, 16], [9, 15], [11, 17],

  // Right Eye loop & connection to brow
  [19, 20], [20, 21], [21, 22], [22, 19],
  [13, 20], [12, 19], [14, 21],

  // Nose Bridge & Tip
  [8, 23], [23, 24], [24, 25],
  [23, 15], [23, 19],
  [24, 26], [24, 27], [25, 26], [25, 27], [26, 27],

  // Cheeks & Zygomatic
  [11, 28], [14, 29], [17, 28], [21, 29],
  [28, 30], [29, 31], [26, 30], [27, 31],
  [18, 30], [22, 31],

  // Philtrum & Mouth
  [25, 32], [32, 35], [26, 33], [27, 34],
  [33, 35], [35, 34], [33, 37], [37, 34], [33, 36], [36, 34], [35, 36], [36, 37],
  [30, 33], [31, 34],

  // Chin & Jawline
  [37, 38], [38, 47], [38, 45], [38, 46],
  [33, 41], [34, 42],
  [3, 39], [4, 40], [39, 41], [40, 42], [41, 43], [42, 44], [43, 45], [44, 46], [45, 47], [46, 47],
  [28, 39], [29, 40], [30, 41], [31, 42]
];

export const CameraLbphView: React.FC<CameraLbphViewProps> = ({
  chi2Value,
  isProcessing,
  fsmState
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isScanning = isProcessing || fsmState === 'BIOMETRIC_VER';
  const isCompleted = fsmState === 'VAULT_AUTH' || fsmState === 'GRANT';
  const isFailed = fsmState === 'DENY';
  const isChi2Valid = chi2Value <= 45.0;

  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;

    const render = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // 1. Clean Deep Dark Background
      ctx.fillStyle = '#090B0E';
      ctx.fillRect(0, 0, width, height);

      // Subtle radial ambient glow
      const ambientGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 180);
      ambientGrad.addColorStop(0, isScanning ? '#0F1A2C' : isCompleted ? (isChi2Valid ? '#0B1C14' : '#1C0D0F') : '#0F131A');
      ambientGrad.addColorStop(1, '#090B0E');
      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Optical Reticle Box Dimensions
      const boxSize = 200;
      const boxLeft = cx - boxSize / 2;
      const boxTop = cy - boxSize / 2;

      // Subtle 8x8 graticule inside box
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = boxSize / 8;
      for (let i = 1; i < 8; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(boxLeft + i * gridSize, boxTop);
        ctx.lineTo(boxLeft + i * gridSize, boxTop + boxSize);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(boxLeft, boxTop + i * gridSize);
        ctx.lineTo(boxLeft + boxSize, boxTop + i * gridSize);
        ctx.stroke();
      }

      // 3. Laser Beam Physics (Only when scanning)
      // Smooth sinusoidal oscillation: period = 2000ms
      let scanY = 0;
      if (isScanning) {
        const scanCycle = 2000;
        const normCycle = (Math.sin((elapsed / scanCycle) * Math.PI * 2) + 1) / 2; // 0 to 1 smooth ease
        const scanTop = boxTop + 10;
        const scanBottom = boxTop + boxSize - 10;
        scanY = scanTop + normCycle * (scanBottom - scanTop);
      }

      // Base color palette according to state
      let baseLineColor = 'rgba(100, 116, 139, 0.35)';
      let baseNodeColor = 'rgba(148, 163, 184, 0.55)';
      let activeColor = '#38BDF8'; // High-tech cyan

      if (isCompleted) {
        if (isChi2Valid) {
          baseLineColor = 'rgba(34, 197, 94, 0.55)';
          baseNodeColor = '#22C55E';
          activeColor = '#4ADE80';
        } else {
          baseLineColor = 'rgba(239, 68, 68, 0.55)';
          baseNodeColor = '#EF4444';
          activeColor = '#F87171';
        }
      } else if (isFailed) {
        baseLineColor = 'rgba(239, 68, 68, 0.55)';
        baseNodeColor = '#EF4444';
        activeColor = '#F87171';
      }

      // 4. Draw Mesh Edges
      FACE_EDGES.forEach(([i, j]) => {
        const p1 = FACE_NODES[i];
        const p2 = FACE_NODES[j];
        if (!p1 || !p2) return;

        const x1 = cx + p1.x;
        const y1 = cy + p1.y;
        const x2 = cx + p2.x;
        const y2 = cy + p2.y;

        let edgeColor = baseLineColor;
        let edgeWidth = 1;

        if (isScanning) {
          const midY = (y1 + y2) / 2;
          const distToLaser = Math.abs(midY - scanY);
          if (distToLaser < 22) {
            const glowRatio = 1 - distToLaser / 22;
            edgeColor = `rgba(56, 189, 248, ${0.35 + glowRatio * 0.55})`;
            edgeWidth = 1 + glowRatio * 0.8;
          }
        }

        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = edgeWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // 5. Draw Biometric Landmark Nodes
      FACE_NODES.forEach((node) => {
        const nx = cx + node.x;
        const ny = cy + node.y;

        let nodeRadius = 1.8;
        let nodeFill = baseNodeColor;

        if (isScanning) {
          const distToLaser = Math.abs(ny - scanY);
          if (distToLaser < 24) {
            const glowRatio = 1 - distToLaser / 24;
            nodeRadius = 1.8 + glowRatio * 2.0;
            nodeFill = glowRatio > 0.65 ? '#FFFFFF' : '#38BDF8';

            // Subtle luminous halo
            ctx.fillStyle = `rgba(56, 189, 248, ${glowRatio * 0.4})`;
            ctx.beginPath();
            ctx.arc(nx, ny, nodeRadius * 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = nodeFill;
        ctx.beginPath();
        ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 6. Active Laser Beam Render (Silky smooth, canvas synchronized)
      if (isScanning) {
        // Laser glow curtain (above & below)
        const curtainHeight = 24;
        const curtainGrad = ctx.createLinearGradient(0, scanY - curtainHeight, 0, scanY + curtainHeight);
        curtainGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        curtainGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.22)');
        curtainGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.fillStyle = curtainGrad;
        ctx.fillRect(boxLeft, scanY - curtainHeight, boxSize, curtainHeight * 2);

        // Core bright laser line
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(boxLeft, scanY);
        ctx.lineTo(boxLeft + boxSize, scanY);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
      }

      // 7. Corner Crosshairs & Frame Border
      let cornerColor = isScanning ? activeColor : isCompleted ? (isChi2Valid ? '#22C55E' : '#EF4444') : 'rgba(255, 255, 255, 0.25)';
      ctx.strokeStyle = cornerColor;
      ctx.lineWidth = 1.5;

      const crossLen = 14;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(boxLeft, boxTop + crossLen);
      ctx.lineTo(boxLeft, boxTop);
      ctx.lineTo(boxLeft + crossLen, boxTop);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(boxLeft + boxSize - crossLen, boxTop);
      ctx.lineTo(boxLeft + boxSize, boxTop);
      ctx.lineTo(boxLeft + boxSize, boxTop + crossLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(boxLeft, boxTop + boxSize - crossLen);
      ctx.lineTo(boxLeft, boxTop + boxSize);
      ctx.lineTo(boxLeft + crossLen, boxTop + boxSize);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(boxLeft + boxSize - crossLen, boxTop + boxSize);
      ctx.lineTo(boxLeft + boxSize, boxTop + boxSize);
      ctx.lineTo(boxLeft + boxSize, boxTop + boxSize - crossLen);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isScanning, isCompleted, isFailed, isChi2Valid]);

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-subtle flex flex-col">
      {/* Clean Header */}
      <div className="flex items-center gap-2 pb-3.5 border-b border-border mb-4">
        <Aperture className="w-4 h-4 text-accent" />
        <h3 className="text-[15px] font-semibold text-text font-sans">
          Subnodo de visión (ESP32-CAM · OV2640)
        </h3>
      </div>

      {/* Viewport with Centered Facial Scan */}
      <div className="relative mx-auto w-full max-w-[560px] aspect-[16/10] bg-[#090B0E] rounded-md overflow-hidden border border-[#1E232E] flex items-center justify-center shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={320}
          className="w-full h-full object-contain"
        />

        {/* Floating Real-Time Status HUD (Only top-left status) */}
        <div className="absolute top-3.5 left-3.5 pointer-events-none">
          {isScanning ? (
            <div className="bg-accent/20 backdrop-blur-md text-accent border border-accent/40 px-3 py-1.5 rounded-sm flex items-center gap-2 font-mono text-[11px] shadow-[0_0_15px_rgba(56,189,248,0.3)] animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>ESCANEANDO ROSTRO... (LBPH 8x8)</span>
            </div>
          ) : isCompleted ? (
            isChi2Valid ? (
              <div className="bg-grant/20 backdrop-blur-md text-grant border border-grant/40 px-3 py-1.5 rounded-sm flex items-center gap-1.5 font-mono text-[11px] shadow-[0_0_15px_rgba(34,197,94,0.25)]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ROSTRO IDENTIFICADO ✓</span>
              </div>
            ) : (
              <div className="bg-deny/20 backdrop-blur-md text-deny border border-deny/40 px-3 py-1.5 rounded-sm flex items-center gap-1.5 font-mono text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>ROSTRO NO RECONOCIDO ✕</span>
              </div>
            )
          ) : isFailed ? (
            <div className="bg-deny/20 backdrop-blur-md text-deny border border-deny/40 px-3 py-1.5 rounded-sm flex items-center gap-1.5 font-mono text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.25)]">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>ACCESO DENEGADO ✕</span>
            </div>
          ) : (
            <div className="bg-surface/85 backdrop-blur-sm text-text-3 border border-border px-3 py-1.5 rounded-sm font-mono text-[11px]">
              STANDBY · ESPERANDO RFID
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
