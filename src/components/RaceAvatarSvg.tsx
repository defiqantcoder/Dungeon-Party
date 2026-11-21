import React, { useId } from 'react';
import { AvatarGender, AvatarRace } from '../types/ledger';

export interface RaceAvatarSvgProps {
  race: AvatarRace;
  gender: AvatarGender;
  hpCurrent: number;
  hpMax: number;
  concentrating?: boolean;
  poisoned?: boolean;
  frightened?: boolean;
  isClockworkMode?: boolean;
  isUnlockedStandard?: boolean;
  showSpectacles?: boolean;
  label?: string;
  className?: string;
}

export const RaceAvatarSvg: React.FC<RaceAvatarSvgProps> = ({
  race,
  gender,
  hpCurrent,
  hpMax,
  concentrating = false,
  poisoned = false,
  frightened = false,
  isClockworkMode = false,
  isUnlockedStandard = false,
  showSpectacles = false,
  label = 'Character portrait',
  className = 'w-full h-full block',
}) => {
  const uid = useId().replace(/:/g, '');
  const gridId = `clinical-grid-${uid}`;

  const isDown = hpCurrent <= 0;
  const hpRatio = hpMax > 0 ? hpCurrent / hpMax : 1;
  const isCritical = !isDown && hpRatio <= 0.25;
  const isStrained = !isDown && !isCritical && hpRatio <= 0.5;
  const isFocused = !isDown && !isCritical && !isStrained && hpRatio <= 0.75;
  const isFemale = gender === 'female';
  const isWarforged = race === 'warforged';
  const isDragonborn = race === 'dragonborn';
  const isTabaxi = race === 'tabaxi';

  const strokePrimary = isDown
    ? '#ff4d4d'
    : isCritical
    ? '#ff6b6b'
    : isClockworkMode || isUnlockedStandard || concentrating
    ? '#c084fc'
    : '#a855f7';

  const strokeSecondary = isDown || isCritical
    ? '#ff4d4d'
    : poisoned
    ? '#4af626'
    : isClockworkMode
    ? '#d4e0da'
    : isUnlockedStandard
    ? '#c084fc'
    : '#4af626';

  const strokeAccent = isDown ? '#ff4d4d' : '#c084fc';

  const eyeColor = isDown
    ? '#ff4d4d'
    : concentrating || isUnlockedStandard
    ? '#c084fc'
    : poisoned
    ? '#4af626'
    : isCritical
    ? '#ff8585'
    : race === 'tiefling' || race === 'aasimar' || race === 'warforged'
    ? '#c084fc'
    : '#d4e0da';

  /* --------------------------------------------------------------------------
   * Back Hair / Horns / Ears / Halos (Rendered Behind Head)
   * -------------------------------------------------------------------------- */
  const renderBackLayer = () => {
    switch (race) {
      case 'gnome':
        return (
          <g>
            {isFemale ? (
              /* Sleek curved asymmetrical chin-length bob (no boxy trapezoid) */
              <path
                d="M 73 74 C 65 86, 65 106, 73 119 C 78 122, 83 121, 86 118 L 114 118 C 117 121, 122 122, 127 119 C 135 106, 135 86, 127 74 C 122 61, 78 61, 73 74 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.2"
              />
            ) : (
              /* Subtle tousled back tufts behind ears */
              <path
                d="M 73 76 C 69 68, 74 60, 82 59 L 118 59 C 126 60, 131 68, 127 76 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.1"
              />
            )}
            {/* Pointed gnome ears */}
            <path
              d={isFemale ? 'M 75 88 L 60 84 L 74 95 Z' : 'M 73 87 L 58 82 L 72 96 Z'}
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <path
              d={isFemale ? 'M 125 88 L 140 84 L 126 95 Z' : 'M 127 87 L 142 82 L 128 96 Z'}
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
          </g>
        );

      case 'elf':
        return (
          <g>
            {isFemale ? (
              /* Graceful flowing tapered moonlit hair sweeping past the collar */
              <g>
                <path
                  d="M 74 72 C 63 92, 62 116, 68 139 C 73 135, 76 128, 79 120 L 121 120 C 124 128, 127 135, 132 139 C 138 116, 137 92, 126 72 C 121 58, 79 58, 74 72 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                {/* Delicate inner flow lines */}
                <path
                  d="M 70 98 C 68 112, 69 122, 72 131 M 130 98 C 132 112, 131 122, 128 131"
                  fill="none"
                  stroke={strokePrimary}
                  strokeWidth="0.8"
                  opacity="0.55"
                />
              </g>
            ) : (
              /* Sleek aristocrat swept half-up back locks */
              <path
                d="M 73 74 C 69 92, 70 110, 76 125 L 124 125 C 130 110, 131 92, 127 74 C 122 60, 78 60, 73 74 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.15"
              />
            )}
            {/* Long sweeping elven ears */}
            <path
              d="M 74 86 L 52 74 L 72 94 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <path
              d="M 126 86 L 148 74 L 128 94 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            {/* Delicate ear studs for female */}
            {isFemale && (
              <>
                <circle cx="67" cy="91" r="1.4" fill={strokeAccent} />
                <circle cx="133" cy="91" r="1.4" fill={strokeAccent} />
              </>
            )}
          </g>
        );

      case 'half-elf':
        return (
          <g>
            {isFemale ? (
              /* Asymmetric side-swept wavy lob flowing past one shoulder */
              <path
                d="M 73 74 C 66 94, 65 114, 70 134 C 75 131, 79 125, 82 118 L 118 118 C 122 126, 128 133, 134 137 C 138 116, 135 90, 126 73 C 120 60, 80 60, 73 74 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.2"
              />
            ) : (
              <path
                d="M 73 75 C 70 90, 72 104, 76 114 L 124 114 C 128 104, 130 90, 127 75 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.1"
              />
            )}
            {/* Mid-length angled ears */}
            <path
              d="M 74 87 L 59 79 L 73 95 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <path
              d="M 126 87 L 141 79 L 127 95 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            {isFemale && (
              <path d="M 65 86 L 67 90" stroke={strokeAccent} strokeWidth="1.3" strokeLinecap="round" />
            )}
          </g>
        );

      case 'dwarf':
        return (
          <g>
            <path
              d="M 71 80 C 68 95, 70 110, 75 120 L 125 120 C 130 110, 132 95, 129 80 C 125 63, 75 63, 71 80 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <ellipse
              cx="73"
              cy="90"
              rx={isFemale ? '3.4' : '4.2'}
              ry="5.5"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <ellipse
              cx="127"
              cy="90"
              rx={isFemale ? '3.4' : '4.2'}
              ry="5.5"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
          </g>
        );

      case 'halfling':
        return (
          <g>
            {isFemale ? (
              /* Soft scalloped wavy bob + twin low ribbon puffs (clean organic contour) */
              <g>
                <path
                  d="M 73 74 C 64 80, 62 94, 67 104 C 63 111, 66 121, 75 122 C 80 124, 86 121, 90 118 L 110 118 C 114 121, 120 124, 125 122 C 134 121, 137 111, 133 104 C 138 94, 136 80, 127 74 C 122 59, 78 59, 73 74 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <circle cx="71" cy="113" r="1.8" fill={strokeAccent} />
                <circle cx="129" cy="113" r="1.8" fill={strokeAccent} />
              </g>
            ) : (
              /* Playful wavy tousled crown silhouette */
              <path
                d="M 72 78 C 67 69, 72 58, 82 57 C 87 51, 97 51, 102 54 C 109 50, 118 52, 121 58 C 130 60, 133 70, 128 78 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.2"
              />
            )}
            <path d="M 74 88 L 65 85.5 L 73 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
            <path d="M 126 88 L 135 85.5 L 127 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
          </g>
        );

      case 'dragonborn':
        return (
          <g>
            {/* Swept draconic horns: broader rugged sweep for Male, sleek arched elegance for Female */}
            <path
              d={
                isFemale
                  ? 'M 79 68 C 67 59, 62 48, 67 39 C 72 48, 79 56, 87 62 Z'
                  : 'M 76 68 C 59 58, 53 45, 59 36 C 68 46, 77 54, 88 60 Z'
              }
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            <path
              d={
                isFemale
                  ? 'M 121 68 C 133 59, 138 48, 133 39 C 128 48, 121 56, 113 62 Z'
                  : 'M 124 68 C 141 58, 147 45, 141 36 C 132 46, 123 54, 112 60 Z'
              }
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            {/* Horn ridges */}
            <path
              d={
                isFemale
                  ? 'M 68 51 L 74 49 M 132 51 L 126 49'
                  : 'M 62 49 L 70 46 M 67 56 L 75 53 M 138 49 L 130 46 M 133 56 L 125 53'
              }
              stroke={strokeAccent}
              strokeWidth="0.9"
              opacity="0.7"
            />
            {/* Cheek frill crests */}
            {isFemale ? (
              <>
                <path d="M 75 82 L 62 84 L 73 91 L 64 96 L 76 101 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
                <path d="M 125 82 L 138 84 L 127 91 L 136 96 L 124 101 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
              </>
            ) : (
              <>
                <path d="M 73 83 L 60 88 L 73 96 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.25" />
                <path d="M 127 83 L 140 88 L 127 96 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.25" />
              </>
            )}
          </g>
        );

      case 'tiefling':
        return (
          <g>
            {isFemale && (
              /* Silky tapered flowing locks behind shoulders */
              <path
                d="M 73 74 C 64 94, 63 116, 69 138 C 74 134, 78 127, 80 120 L 120 120 C 122 127, 126 134, 131 138 C 137 116, 136 94, 127 74 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.2"
              />
            )}
            {/* Distinct Tiefling horns: tall graceful gazelle curves + ring for Female, heavy sweeping ram curves for Male */}
            <path
              d={
                isFemale
                  ? 'M 81 66 C 72 52, 71 39, 80 33 C 77 44, 80 54, 88 62 Z'
                  : 'M 79 68 C 63 56, 60 40, 74 34 C 69 45, 76 55, 87 63 Z'
              }
              fill="#171022"
              stroke={strokeAccent}
              strokeWidth="1.4"
            />
            <path
              d={
                isFemale
                  ? 'M 119 66 C 128 52, 129 39, 120 33 C 123 44, 120 54, 112 62 Z'
                  : 'M 121 68 C 137 56, 140 40, 126 34 C 131 45, 124 55, 113 63 Z'
              }
              fill="#171022"
              stroke={strokeAccent}
              strokeWidth="1.4"
            />
            {isFemale && (
              <line x1="120" y1="47" x2="127" y2="49" stroke="#d4e0da" strokeWidth="1.8" strokeLinecap="round" />
            )}
            {/* Pointed ears */}
            <path d="M 74 87 L 61 83 L 73 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
            <path d="M 126 87 L 139 83 L 127 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
          </g>
        );

      case 'half-orc':
        return (
          <g>
            {isFemale ? (
              /* Fierce swept high warrior ponytail cascading to one side */
              <g>
                <path
                  d="M 94 59 C 102 44, 125 48, 132 72 C 137 92, 138 114, 130 132 C 125 123, 125 104, 124 84 C 122 68, 110 62, 94 59 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.25"
                />
                <rect x="95" y="54" width="10" height="4" rx="1.5" fill="#171022" stroke={strokeAccent} strokeWidth="1.1" />
              </g>
            ) : (
              /* Compact warrior topknot */
              <g>
                <path
                  d="M 92 60 C 90 48, 100 43, 108 50 C 111 54, 110 59, 105 60 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <line x1="93" y1="57" x2="107" y2="57" stroke={strokeAccent} strokeWidth="1.3" />
              </g>
            )}
            <path d="M 73 86 L 62 82 L 73 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
            <path d="M 127 86 L 138 82 L 127 95 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
            {isFemale && (
              <circle cx="67" cy="94" r="2.6" fill="none" stroke={strokeAccent} strokeWidth="1.2" />
            )}
          </g>
        );

      case 'tabaxi':
        return (
          <g>
            {/* Pointed feline ears: tall sleek lynx ears for Female, broader sturdy ears for Male */}
            <path
              d={isFemale ? 'M 77 73 L 69 44 L 92 62 Z' : 'M 75 73 L 68 47 L 91 63 Z'}
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            <path
              d={isFemale ? 'M 79 68 L 74 52 L 87 63 Z' : 'M 78 68 L 74 55 L 87 64 Z'}
              fill="#581c87"
              opacity="0.55"
            />
            <path
              d={isFemale ? 'M 123 73 L 131 44 L 108 62 Z' : 'M 125 73 L 132 47 L 109 63 Z'}
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            <path
              d={isFemale ? 'M 121 68 L 126 52 L 113 63 Z' : 'M 122 68 L 126 55 L 113 64 Z'}
              fill="#581c87"
              opacity="0.55"
            />
            {/* Ear tufts for Female */}
            {isFemale && (
              <g stroke={strokeAccent} strokeWidth="1.1" strokeLinecap="round">
                <line x1="69" y1="44" x2="66" y2="39" />
                <line x1="131" y1="44" x2="134" y2="39" />
              </g>
            )}
            {/* Cheek fur ruffs: fuller mane for Male, soft tapered tufts for Female */}
            <path
              d={
                isFemale
                  ? 'M 76 92 L 66 95 L 74 99 L 69 103 L 79 105'
                  : 'M 74 90 L 62 95 L 72 100 L 64 106 L 77 108'
              }
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.15"
            />
            <path
              d={
                isFemale
                  ? 'M 124 92 L 134 95 L 126 99 L 131 103 L 121 105'
                  : 'M 126 90 L 138 95 L 128 100 L 136 106 L 123 108'
              }
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.15"
            />
          </g>
        );

      case 'warforged':
        return (
          <g>
            {/* Armored side ear-modules: contoured for Female, heavy riveted blocks for Male */}
            {isFemale ? (
              <>
                <path d="M 75 78 L 69 83 L 70 96 L 76 99 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
                <path d="M 125 78 L 131 83 L 130 96 L 124 99 Z" fill="#171022" stroke={strokePrimary} strokeWidth="1.2" />
              </>
            ) : (
              <>
                <rect x="68" y="77" width="7" height="20" rx="1.5" fill="#171022" stroke={strokePrimary} strokeWidth="1.25" />
                <rect x="125" y="77" width="7" height="20" rx="1.5" fill="#171022" stroke={strokePrimary} strokeWidth="1.25" />
                <circle cx="71.5" cy="87" r="1.2" fill={strokeAccent} />
                <circle cx="128.5" cy="87" r="1.2" fill={strokeAccent} />
              </>
            )}
          </g>
        );

      case 'aasimar':
        return (
          <g>
            {/* Celestial halo arc (double-ring crown accent for Female, clean cardinal arc for Male) */}
            <ellipse
              cx="100"
              cy="47"
              rx={isFemale ? '25' : '23'}
              ry="5.5"
              fill="none"
              stroke={strokeAccent}
              strokeWidth="1.45"
              strokeDasharray={isCritical ? '4 3' : undefined}
              opacity="0.92"
            />
            {isFemale && !isDown && (
              <polygon points="100,38 102,42 100,46 98,42" fill={strokeAccent} opacity="0.9" />
            )}
            {isFemale ? (
              /* Ethereal flowing tapered waves */
              <g>
                <path
                  d="M 73 72 C 63 92, 62 118, 69 140 C 74 135, 78 128, 80 120 L 120 120 C 122 128, 126 135, 131 140 C 138 118, 137 92, 127 72 C 121 58, 79 58, 73 72 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 69 96 C 67 110, 69 122, 72 132 M 131 96 C 133 110, 131 122, 128 132"
                  fill="none"
                  stroke={strokeAccent}
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </g>
            ) : (
              <path
                d="M 73 76 C 71 90, 72 104, 77 113 L 123 113 C 128 104, 129 90, 127 76 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.1"
              />
            )}
            <ellipse cx="74" cy="90" rx="3.2" ry="5" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
            <ellipse cx="126" cy="90" rx="3.2" ry="5" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
          </g>
        );

      case 'human':
      default:
        return (
          <g>
            {isFemale ? (
              /* Natural tapered wavy shoulder-length hair (curves inward cleanly instead of flat box) */
              <g>
                <path
                  d="M 72 74 C 63 92, 63 114, 70 135 C 75 132, 79 126, 81 119 L 119 119 C 121 126, 125 132, 130 135 C 137 114, 137 92, 128 74 C 122 59, 78 59, 72 74 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 69 98 C 67 110, 69 120, 72 128 M 131 98 C 133 110, 131 120, 128 128"
                  fill="none"
                  stroke={strokePrimary}
                  strokeWidth="0.8"
                  opacity="0.5"
                />
              </g>
            ) : (
              <path
                d="M 73 75 C 70 86, 71 98, 75 106 L 125 106 C 129 98, 130 86, 127 75 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.1"
              />
            )}
            <ellipse cx="74" cy="90" rx="3.3" ry="5.2" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
            <ellipse cx="126" cy="90" rx="3.3" ry="5.2" fill="#171022" stroke={strokePrimary} strokeWidth="1.15" />
          </g>
        );
    }
  };

  /* --------------------------------------------------------------------------
   * Sculpted Head Contours (Distinct Male vs. Female Proportions per Race)
   * -------------------------------------------------------------------------- */
  const renderHeadShape = () => {
    if (isWarforged) {
      return isFemale ? (
        /* Contoured envoy faceplate */
        <path
          d="M 76 76 C 76 62, 86 58, 100 58 C 114 58, 124 62, 124 76 L 121 99 L 108 115 L 92 115 L 79 99 Z"
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.55"
        />
      ) : (
        /* Broad angular sentinel faceplate */
        <path
          d="M 73 73 L 82 58 L 118 58 L 127 73 L 125 102 L 112 117 L 88 117 L 75 102 Z"
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.6"
        />
      );
    }

    if (isDragonborn) {
      return (
        <path
          d={
            isFemale
              ? 'M 76 83 C 76 66, 86 60, 100 60 C 114 60, 124 66, 124 83 L 119 103 L 107 115 L 93 115 L 81 103 Z'
              : 'M 72 83 C 72 64, 84 58, 100 58 C 116 58, 128 64, 128 83 L 124 105 L 111 117 L 89 117 L 76 105 Z'
          }
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.5"
        />
      );
    }

    if (isTabaxi) {
      return (
        <path
          d={
            isFemale
              ? 'M 76 84 C 76 66, 86 60, 100 60 C 114 60, 124 66, 124 84 C 123 100, 112 114, 100 115 C 88 114, 77 100, 76 84 Z'
              : 'M 74 84 C 74 65, 85 59, 100 59 C 115 59, 126 65, 126 84 C 126 102, 114 116, 100 116 C 86 116, 74 102, 74 84 Z'
          }
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.5"
        />
      );
    }

    if (isFemale) {
      /* Refined softly-tapered female jawline (graceful cheekbones & chin) */
      const rxSide = race === 'elf' || race === 'aasimar' ? 23.5 : 24.5;
      return (
        <path
          d={`M ${100 - rxSide} 83 C ${100 - rxSide} 65, 86 60, 100 60 C 114 60, ${100 + rxSide} 65, ${100 + rxSide} 83 C ${100 + rxSide - 1} 100, 112 115, 100 116 C 88 115, ${100 - rxSide + 1} 100, ${100 - rxSide} 83 Z`}
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.45"
        />
      );
    }

    if (race === 'half-orc' || race === 'dwarf') {
      /* Strong broader square jaw for Male Dwarf / Half-Orc */
      return (
        <path
          d="M 73 83 C 73 64, 84 59, 100 59 C 116 59, 127 64, 127 83 L 125 103 C 122 113, 112 117, 100 117 C 88 117, 78 113, 75 103 Z"
          fill="#0b100e"
          stroke={strokePrimary}
          strokeWidth="1.5"
        />
      );
    }

    /* Balanced sculpted male jawline */
    const rxM = race === 'elf' ? 24.5 : 26;
    return (
      <path
        d={`M ${100 - rxM} 84 C ${100 - rxM} 65, 85 59, 100 59 C 115 59, ${100 + rxM} 65, ${100 + rxM} 84 C ${100 + rxM} 102, 114 116, 100 117 C 86 116, ${100 - rxM} 102, ${100 - rxM} 84 Z`}
        fill="#0b100e"
        stroke={strokePrimary}
        strokeWidth="1.5"
      />
    );
  };

  /* --------------------------------------------------------------------------
   * Front Hair, Cheek-Framing Locks, Beards, Circlets & Facial Markings
   * -------------------------------------------------------------------------- */
  const renderFrontHairAndDetail = () => {
    if (isWarforged) {
      return (
        <g>
          {/* Ghulra forehead rune & armor seams */}
          {isFemale ? (
            <>
              <path d="M 100 62 L 105 69 L 100 76 L 95 69 Z" fill="none" stroke={strokeAccent} strokeWidth="1.2" />
              <path d="M 80 73 Q 100 77 120 73" fill="none" stroke={strokeAccent} strokeWidth="0.9" opacity="0.65" />
              <path d="M 80 96 L 88 102 M 120 96 L 112 102" stroke="#581c87" strokeWidth="1.1" />
            </>
          ) : (
            <>
              <path d="M 100 62 L 106 69 L 100 76 L 94 69 Z" fill="none" stroke={strokeAccent} strokeWidth="1.3" />
              <line x1="76" y1="75" x2="124" y2="75" stroke="#581c87" strokeWidth="1.1" />
              <line x1="77" y1="97" x2="87" y2="103" stroke="#2e243b" strokeWidth="1.2" />
              <line x1="123" y1="97" x2="113" y2="103" stroke="#2e243b" strokeWidth="1.2" />
            </>
          )}
        </g>
      );
    }

    if (isDragonborn) {
      return (
        <g>
          {/* Brow ridge & snout nostrils */}
          <path
            d={isFemale ? 'M 88 69 Q 100 64 112 69' : 'M 85 69 L 100 63 L 115 69'}
            fill="none"
            stroke={strokePrimary}
            strokeWidth={isFemale ? '1.1' : '1.35'}
            opacity="0.85"
          />
          {isFemale && (
            <path d="M 100 61 L 102.5 66 L 100 71 L 97.5 66 Z" fill="none" stroke={strokeAccent} strokeWidth="0.9" opacity="0.8" />
          )}
          <path d="M 94 94.5 L 97 96.5 M 106 94.5 L 103 96.5" stroke="#9eb0a7" strokeWidth="1.25" strokeLinecap="round" />
        </g>
      );
    }

    if (isTabaxi) {
      return (
        <g>
          {/* Forehead tabby markings / female crescent */}
          {isFemale ? (
            <>
              <path d="M 95 67 Q 100 71 105 67" fill="none" stroke={strokeAccent} strokeWidth="1.25" strokeLinecap="round" />
              <path d="M 92 63 L 94 67 M 108 63 L 106 67" stroke={strokePrimary} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
            </>
          ) : (
            <path d="M 100 61 V 70 M 94 63 L 96 70 M 106 63 L 104 70" stroke={strokePrimary} strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
          )}
          {/* Feline nose & whiskers */}
          <path d="M 97 94 L 103 94 L 100 97.5 Z" fill={strokeAccent} />
          <path d="M 79 95 L 67 93 M 80 99 L 68 100 M 121 95 L 133 93 M 120 99 L 132 100" stroke="#9eb0a7" strokeWidth="0.95" opacity="0.7" />
        </g>
      );
    }

    // Humanoid front hair, bangs, cheek-framing locks, circlets & beards
    return (
      <g>
        {isFemale ? (
          /* Distinct tailored female bangs + soft cheek-framing side-wisps per race */
          <g>
            {race === 'elf' || race === 'aasimar' ? (
              <>
                {/* Center-parted sweeping bangs + slender side-locks */}
                <path
                  d="M 75 86 C 75 65, 87 58, 100 58 C 113 58, 125 65, 125 86 C 120 74, 110 68, 100 66 C 90 68, 80 74, 75 86 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 75 83 C 73 96, 74 108, 78 117 M 125 83 C 127 96, 126 108, 122 117"
                  fill="none"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </>
            ) : race === 'gnome' ? (
              <>
                {/* Side-swept cute bob bangs + small hairpin */}
                <path
                  d="M 75 85 C 75 65, 86 58, 100 58 C 114 58, 125 65, 125 85 C 118 72, 106 68, 93 72 C 85 74, 79 79, 75 85 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <line x1="114" y1="69" x2="120" y2="73" stroke={strokeAccent} strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : race === 'dwarf' ? (
              <>
                {/* Twin braided plaits draping CLEANLY in front of the shoulders + braided crown */}
                <path
                  d="M 75 85 C 75 64, 86 58, 100 58 C 114 58, 125 64, 125 85 C 116 72, 108 68, 100 71 C 92 68, 84 72, 75 85 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path d="M 78 69 Q 100 64 122 69" fill="none" stroke={strokeAccent} strokeWidth="1.6" strokeDasharray="3 2" />
                {/* Front twin braids */}
                <path
                  d="M 74 96 C 69 111, 69 126, 73 140 C 76 141, 79 139, 79 133 C 78 122, 78 110, 79 98 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 126 96 C 131 111, 131 126, 127 140 C 124 141, 121 139, 121 133 C 122 122, 122 110, 121 98 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path d="M 72 112 L 78 114 M 71 122 L 78 124 M 128 112 L 122 114 M 129 122 L 122 124" stroke={strokePrimary} strokeWidth="0.9" />
                <rect x="71" y="130" width="8" height="3.2" rx="1" fill={strokeAccent} />
                <rect x="121" y="130" width="8" height="3.2" rx="1" fill={strokeAccent} />
              </>
            ) : race === 'halfling' ? (
              <>
                {/* Soft curly scalloped fringe + botanical leaf pin */}
                <path
                  d="M 75 83 C 75 64, 87 58, 100 58 C 113 58, 125 64, 125 83 C 120 75, 114 73, 109 75 C 104 70, 96 70, 91 75 C 86 73, 80 75, 75 83 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path d="M 116 68 Q 122 65 123 72 Q 117 74 116 68 Z" fill="#4af626" opacity="0.85" />
              </>
            ) : race === 'half-orc' ? (
              /* Sleek swept-back warrior hairline with fierce side wisp */
              <path
                d="M 75 82 C 76 63, 88 58, 100 58 C 112 58, 124 63, 125 82 C 118 69, 106 66, 95 69 C 86 67, 80 73, 75 82 Z"
                fill="#171022"
                stroke={strokePrimary}
                strokeWidth="1.2"
              />
            ) : (
              /* Human, Half-Elf, Tiefling: graceful side-swept parted bangs + cheekbone-framing waves */
              <>
                <path
                  d="M 75 85 C 75 64, 87 58, 100 58 C 113 58, 125 64, 125 85 C 119 72, 108 67, 96 71 C 88 68, 80 74, 75 85 Z"
                  fill="#171022"
                  stroke={strokePrimary}
                  strokeWidth="1.2"
                />
                <path
                  d="M 75 84 C 73 96, 75 108, 79 116 M 125 84 C 127 96, 125 108, 121 116"
                  fill="none"
                  stroke={strokePrimary}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
              </>
            )}
          </g>
        ) : (
          /* Male Hairlines per race */
          <path
            d={
              race === 'halfling'
                ? 'M 74 78 C 75 62, 87 57, 100 58 C 113 57, 125 62, 126 78 C 119 70, 112 69, 106 72 C 101 67, 94 68, 89 72 C 83 69, 78 72, 74 78 Z'
                : race === 'half-orc'
                ? 'M 76 73 C 81 60, 91 58, 100 58 C 109 58, 119 60, 124 73 C 114 66, 86 66, 76 73 Z'
                : race === 'elf'
                ? 'M 75 78 C 76 62, 87 58, 100 58 C 113 58, 124 62, 125 78 C 117 68, 107 65, 96 69 C 87 66, 80 70, 75 78 Z'
                : 'M 74 78 C 75 62, 87 58, 100 58 C 113 58, 125 62, 126 78 C 118 68, 106 66, 95 70 C 86 67, 79 71, 74 78 Z'
            }
            fill="#171022"
            stroke={strokePrimary}
            strokeWidth="1.2"
          />
        )}

        {/* Elf circlet (star gem for female, minimal brow band for male) */}
        {race === 'elf' && (
          <g>
            <path d="M 80 70 Q 100 75 120 70" fill="none" stroke={strokeAccent} strokeWidth="1.2" />
            {isFemale && (
              <polygon points="100,69 102.5,72.5 100,76 97.5,72.5" fill={strokeAccent} />
            )}
          </g>
        )}

        {/* Male Dwarf sculpted geometric beard & mustache */}
        {race === 'dwarf' && !isFemale && (
          <g>
            <path
              d="M 74 96 C 73 115, 84 128, 100 131 C 116 128, 127 115, 126 96 C 119 104, 110 107, 100 107 C 90 107, 81 104, 74 96 Z"
              fill="#171022"
              stroke={strokePrimary}
              strokeWidth="1.3"
            />
            <path d="M 86 112 L 90 126 M 114 112 L 110 126 M 100 113 V 129" stroke={strokePrimary} strokeWidth="0.9" opacity="0.6" />
            <rect x="96" y="123" width="8" height="3.2" rx="1" fill={strokeAccent} />
          </g>
        )}

        {/* Subtle nose-bridge scar on Male Half-Orc */}
        {race === 'half-orc' && !isFemale && (
          <line x1="95" y1="92" x2="104" y2="95" stroke="#9eb0a7" strokeWidth="0.9" opacity="0.6" />
        )}
      </g>
    );
  };

  /* --------------------------------------------------------------------------
   * Reactive Eyes & Brows (Integrated Clean Female Upper-Lid Arc vs Male Crisp Brow)
   * -------------------------------------------------------------------------- */
  const renderEyesAndBrows = () => {
    if (isDown) {
      return (
        <g stroke="#ff4d4d" strokeWidth="1.7" strokeLinecap="round">
          <line x1="85" y1="83" x2="92" y2="90" />
          <line x1="92" y1="83" x2="85" y2="90" />
          <line x1="108" y1="83" x2="115" y2="90" />
          <line x1="115" y1="83" x2="108" y2="90" />
        </g>
      );
    }

    const browStrokeWidth = isFemale ? '1.15' : '1.45';

    return (
      <g>
        {/* Eyebrows expressing HP / condition state */}
        {isCritical || isStrained ? (
          <g stroke={isCritical ? '#ff6b6b' : '#d4e0da'} strokeWidth={browStrokeWidth} strokeLinecap="round">
            <line x1="83" y1="79" x2="94" y2="81.5" />
            <line x1="117" y1="79" x2="106" y2="81.5" />
          </g>
        ) : frightened ? (
          <g stroke="#d4e0da" strokeWidth={browStrokeWidth} strokeLinecap="round">
            <path d="M 83 80 Q 89 76 94 79" fill="none" />
            <path d="M 106 79 Q 111 76 117 80" fill="none" />
          </g>
        ) : concentrating ? (
          <g stroke="#c084fc" strokeWidth={browStrokeWidth} strokeLinecap="round">
            <line x1="84" y1="79.5" x2="94" y2="80.5" />
            <line x1="116" y1="79.5" x2="106" y2="80.5" />
          </g>
        ) : isFemale ? (
          /* Soft subtly arched healthy female brows */
          <g stroke="#9eb0a7" strokeWidth="1.05" strokeLinecap="round" fill="none" opacity="0.85">
            <path d="M 83.5 80.5 Q 88.5 78.2 93.5 80" />
            <path d="M 106.5 80 Q 111.5 78.2 116.5 80.5" />
          </g>
        ) : (
          /* Clean steady male brows */
          <g stroke="#9eb0a7" strokeWidth="1.3" strokeLinecap="round" opacity="0.85">
            <line x1="83.5" y1="80" x2="93.5" y2="80" />
            <line x1="106.5" y1="80" x2="116.5" y2="80" />
          </g>
        )}

        {/* Eyes */}
        {isCritical ? (
          /* Wincing / stressed eyes */
          <g stroke={eyeColor} strokeWidth="1.6" strokeLinecap="round" fill="none">
            <path d="M 85 85 L 92 87.5 L 85 90" />
            <path d="M 115 85 L 108 87.5 L 115 90" />
          </g>
        ) : frightened ? (
          /* Wide startled eyes */
          <g>
            <circle cx="89" cy="87" r="4.2" fill="#080c0a" stroke={eyeColor} strokeWidth="1.3" />
            <circle cx="89" cy="87" r="1.4" fill={eyeColor} />
            <circle cx="111" cy="87" r="4.2" fill="#080c0a" stroke={eyeColor} strokeWidth="1.3" />
            <circle cx="111" cy="87" r="1.4" fill={eyeColor} />
          </g>
        ) : isWarforged ? (
          /* Glowing optic slits (sleeker angled slits for female, bold blocks for male) */
          isFemale ? (
            <g>
              <path d="M 84 85.5 L 93 86.5 L 92 89 L 85 88.5 Z" fill={eyeColor} />
              <path d="M 116 85.5 L 107 86.5 L 108 89 L 115 88.5 Z" fill={eyeColor} />
            </g>
          ) : (
            <g>
              <rect x="84" y="84.5" width="9" height="4.5" rx="1.5" fill={eyeColor} />
              <rect x="107" y="84.5" width="9" height="4.5" rx="1.5" fill={eyeColor} />
            </g>
          )
        ) : (
          <g>
            {/* Clean integrated curved upper lash-lid arc hugging female eyes (no awkward floating sticks!) */}
            {isFemale && (
              <g fill="none" stroke={strokePrimary} strokeWidth="1.25" strokeLinecap="round">
                <path d="M 84 85.8 Q 88.5 82.8 92.8 85.5" />
                <path d="M 107.2 85.5 Q 111.5 82.8 116 85.8" />
              </g>
            )}
            <circle
              cx="89"
              cy="87"
              r={concentrating || isUnlockedStandard ? '3.1' : isFemale ? '2.5' : '2.3'}
              fill={eyeColor}
            />
            <circle
              cx="111"
              cy="87"
              r={concentrating || isUnlockedStandard ? '3.1' : isFemale ? '2.5' : '2.3'}
              fill={eyeColor}
            />
            {!isStrained && !concentrating && (
              <>
                <circle cx="88.2" cy="86.1" r="0.75" fill="#080c0a" />
                <circle cx="110.2" cy="86.1" r="0.75" fill="#080c0a" />
              </>
            )}
          </g>
        )}
      </g>
    );
  };

  /* --------------------------------------------------------------------------
   * Reactive Mouth
   * -------------------------------------------------------------------------- */
  const renderMouth = () => {
    if (isWarforged) {
      return (
        <g stroke={isDown || isCritical ? '#ff4d4d' : concentrating ? '#c084fc' : '#9eb0a7'} strokeWidth="1.3">
          <line x1={isFemale ? '94' : '92'} y1="103" x2={isFemale ? '106' : '108'} y2="103" />
          {!isDown && !isCritical && (
            <>
              <line x1="96.5" y1="100.8" x2="96.5" y2="105.2" />
              <line x1="100" y1="100.8" x2="100" y2="105.2" />
              <line x1="103.5" y1="100.8" x2="103.5" y2="105.2" />
            </>
          )}
        </g>
      );
    }

    const mouthEl = isDown ? (
      <line x1="93" y1="103" x2="107" y2="103" stroke="#ff4d4d" strokeWidth="1.4" strokeLinecap="round" />
    ) : poisoned ? (
      <path
        d="M 91 103 Q 95 100, 99 103 T 107 103"
        fill="none"
        stroke="#4af626"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ) : isCritical ? (
      <path
        d="M 92 105 Q 100 98 108 105"
        fill="none"
        stroke="#ff6b6b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ) : isStrained || frightened ? (
      <path
        d="M 92 104 Q 100 100 108 104"
        fill="none"
        stroke="#d4e0da"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ) : isFocused || isUnlockedStandard ? (
      <line
        x1="93"
        y1="103"
        x2="107"
        y2="103"
        stroke={isUnlockedStandard ? '#c084fc' : '#d4e0da'}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ) : isTabaxi ? (
      <path
        d="M 93 101 Q 96.5 105 100 101 Q 103.5 105 107 101"
        fill="none"
        stroke="#d4e0da"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    ) : (
      <path
        d={isFemale ? 'M 93 101.5 Q 100 106.8 107 101.5' : 'M 92 101.5 Q 100 107.2 108 101.5'}
        fill="none"
        stroke="#d4e0da"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    );

    return (
      <g>
        {mouthEl}
        {/* Half-Orc signature upturned lower tusks (refined scale for female, bold for male) */}
        {race === 'half-orc' && (
          <g fill="#d4e0da" stroke="#080c0a" strokeWidth="0.6">
            <path d={isFemale ? 'M 92 104 L 93.5 99.5 L 95 104 Z' : 'M 91 104 L 93 98 L 95 104 Z'} />
            <path d={isFemale ? 'M 105 104 L 106.5 99.5 L 108 104 Z' : 'M 105 104 L 107 98 L 109 104 Z'} />
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <pattern
          id={gridId}
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 16 0 L 0 0 0 16"
            fill="none"
            stroke={isUnlockedStandard || isClockworkMode ? '#581c87' : '#2e243b'}
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
      </defs>

      <rect width="200" height="200" fill="#080c0a" />
      <rect width="200" height="200" fill={`url(#${gridId})`} />

      {/* Outer diagnostic dial */}
      <circle
        cx="100"
        cy="92"
        r="68"
        fill="none"
        stroke={isUnlockedStandard || isClockworkMode ? '#581c87' : '#2e243b'}
        strokeWidth="1"
      />
      <circle
        cx="100"
        cy="92"
        r="60"
        fill="none"
        stroke={strokePrimary}
        strokeWidth={isUnlockedStandard || isClockworkMode || concentrating ? '1.5' : '1.2'}
        strokeDasharray={
          isClockworkMode
            ? '6 3 2 3'
            : isUnlockedStandard
            ? '14 4'
            : '10 6'
        }
        opacity="0.85"
      />

      {/* Secondary arcane concentration / unlocked ring */}
      {(isUnlockedStandard || concentrating) && !isDown && (
        <circle
          cx="100"
          cy="92"
          r="52"
          fill="none"
          stroke="#c084fc"
          strokeWidth="0.95"
          strokeDasharray="2 5"
          opacity="0.75"
        />
      )}

      {/* Calibration ticks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 100 + Math.cos(angle) * 63;
        const y1 = 92 + Math.sin(angle) * 63;
        const x2 = 100 + Math.cos(angle) * 68;
        const y2 = 92 + Math.sin(angle) * 68;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={i % 3 === 0 ? strokePrimary : '#581c87'}
            strokeWidth={i % 3 === 0 ? '1.5' : '1'}
          />
        );
      })}

      {isClockworkMode ? (
        /* Clockwork / Construct Vessel Escapement & Optical Iris */
        <g>
          <circle
            cx="100"
            cy="92"
            r="42"
            fill="#171022"
            stroke="#c084fc"
            strokeWidth="1.5"
          />
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 22.5 * Math.PI) / 180;
            const x1 = 100 + Math.cos(angle) * 34;
            const y1 = 92 + Math.sin(angle) * 34;
            const x2 = 100 + Math.cos(angle) * 40;
            const y2 = 92 + Math.sin(angle) * 40;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#c084fc"
                strokeWidth="2.5"
              />
            );
          })}
          <circle
            cx="100"
            cy="92"
            r="24"
            fill="#080c0a"
            stroke="#a855f7"
            strokeWidth="1.2"
          />
          <line x1="76" y1="92" x2="124" y2="92" stroke="#581c87" strokeWidth="1" />
          <line x1="100" y1="68" x2="100" y2="116" stroke="#581c87" strokeWidth="1" />
          <circle cx="88" cy="88" r="5" fill="none" stroke="#c084fc" strokeWidth="1.5" />
          <circle cx="88" cy="88" r="1.8" fill={isDown ? '#ff4d4d' : '#c084fc'} />
          <circle cx="112" cy="88" r="5" fill="none" stroke="#c084fc" strokeWidth="1.5" />
          <circle cx="112" cy="88" r="1.8" fill={isDown ? '#ff4d4d' : '#c084fc'} />
          <line x1="100" y1="92" x2="100" y2="74" stroke="#d4e0da" strokeWidth="1.4" />
          <line x1="100" y1="92" x2="114" y2="100" stroke="#a855f7" strokeWidth="1.2" />
          <circle cx="100" cy="92" r="2.5" fill="#d4e0da" />
        </g>
      ) : (
        /* Reworked Clinical Vector Race + Gender Character Sprite */
        <g>
          {/* Back hair / ears / horns / halo */}
          {renderBackLayer()}

          {/* Neck + Shoulders & Collar (Distinct Male vs Female silhouette) */}
          <path
            d={
              isFemale
                ? 'M 94 112 L 93 123 Q 100 126 107 123 L 106 112 Z'
                : 'M 91 112 L 90 123 Q 100 126 110 123 L 109 112 Z'
            }
            fill="#0b100e"
            stroke={strokePrimary}
            strokeWidth="1.15"
          />
          <path
            d={
              isFemale
                ? 'M 67 146 C 71 127, 84 121, 100 121 C 116 121, 129 127, 133 146'
                : 'M 60 146 C 64 123, 80 118, 100 118 C 120 118, 136 123, 140 146'
            }
            fill="#171022"
            stroke={strokePrimary}
            strokeWidth="1.3"
          />

          {/* Collar / Lapel / Emblem */}
          {isUnlockedStandard ? (
            <path
              d="M 100 126 L 106 132 L 100 138 L 94 132 Z"
              fill="none"
              stroke="#c084fc"
              strokeWidth="1.3"
            />
          ) : showSpectacles ? (
            <path
              d="M 100 127 V 137 M 95 132 H 105"
              stroke={strokeSecondary}
              strokeWidth="1.4"
              opacity="0.85"
            />
          ) : isFemale ? (
            /* Refined curved V-collar with subtle diamond pendant */
            <g>
              <path
                d="M 88 122 Q 100 133 112 122"
                fill="none"
                stroke={strokeSecondary}
                strokeWidth="1.15"
                opacity="0.75"
              />
              <circle cx="100" cy="131" r="1.8" fill={strokeAccent} opacity="0.85" />
            </g>
          ) : (
            /* Crisp structured male lapel collar */
            <path
              d="M 88 120 L 100 132 L 112 120"
              fill="none"
              stroke={strokeSecondary}
              strokeWidth="1.25"
              opacity="0.75"
            />
          )}

          {/* Sculpted Head contour */}
          {renderHeadShape()}

          {/* Front Hair / Bangs / Braids / Beard / Markings */}
          {renderFrontHairAndDetail()}

          {/* Optional Pip-style Horologist / Medic Spectacles */}
          {showSpectacles && (
            <g>
              <circle
                cx="89"
                cy="87"
                r="8"
                fill="#171022"
                fillOpacity="0.45"
                stroke="#c084fc"
                strokeWidth="1.3"
              />
              <circle
                cx="111"
                cy="87"
                r="8"
                fill="#171022"
                fillOpacity="0.45"
                stroke="#c084fc"
                strokeWidth="1.3"
              />
              <line x1="97" y1="87" x2="103" y2="87" stroke="#c084fc" strokeWidth="1.3" />
            </g>
          )}

          {/* Reactive Eyes & Brows */}
          {renderEyesAndBrows()}

          {/* Reactive Mouth */}
          {renderMouth()}

          {/* Injury scuff & sweat drop when strained/critical/frightened */}
          {(isStrained || isCritical) && (
            <g stroke="#ff4d4d" strokeWidth="1.1" strokeLinecap="round" opacity="0.85">
              <line x1="113" y1="95" x2="119" y2="98" />
              <line x1="115" y1="93.5" x2="118.5" y2="95.5" />
            </g>
          )}
          {(isCritical || frightened) && !isDown && (
            <path
              d="M 121 75 C 123 78, 124 80, 121 82 C 118 80, 119 78, 121 75 Z"
              fill="#c084fc"
              opacity="0.85"
            />
          )}
        </g>
      )}

      {/* Bottom Biometric Trace */}
      <path
        d={
          isDown
            ? 'M 14 176 L 186 176'
            : isCritical
            ? 'M 14 176 L 44 176 L 50 165 L 56 185 L 62 162 L 68 184 L 74 176 L 108 176 L 114 166 L 120 184 L 126 176 L 186 176'
            : 'M 14 176 L 56 176 L 64 168 L 72 184 L 80 162 L 88 180 L 96 176 L 186 176'
        }
        fill="none"
        stroke={isDown || isCritical ? '#ff4d4d' : strokeSecondary}
        strokeWidth="1.3"
        opacity="0.85"
      />
    </svg>
  );
};
