const fs = require('fs');
let content = fs.readFileSync('LiftLab/src/app/tracker/page.tsx', 'utf8');

const importStatement = 'import { getSessionVolume, getExVolume, getTrend, getVolumeAlerts, calcEfficiencyScore, PRType, checkPRs } from "@/lib/workout-logic";\n';
content = content.replace('import { translations } from "@/lib/i18n";', 'import { translations } from "@/lib/i18n";\n' + importStatement);

content = content.replace(/function getSessionVolume[\s\S]*?return alerts;\n}\n/g, '');
content = content.replace(/function calcEfficiencyScore[\s\S]*?Math\.round\(score\)\);\n}\n/g, '');
content = content.replace(/type PRType = 'weight' \| 'reps' \| 'volume' \| 'km' \| 'speed';\n/g, '');
content = content.replace(/function checkPRs[\s\S]*?return prs;\n}\n/g, '');

fs.writeFileSync('LiftLab/src/app/tracker/page.tsx', content);
