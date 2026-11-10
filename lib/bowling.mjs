// Bowling actions for the roster: pace or spin, and a realistic range of delivery speeds (km/h).
const W = "Leg spin", L = "Left-arm spin", O = "Off spin", M = "Mystery spin", C = "Left-arm wrist spin";
/** name -> [style, minKph, maxKph] */
const SPIN = {
  "Rashid Khan": [W, 92, 106],
  "Sunil Narine": [M, 86, 98],
  "Varun Chakaravarthy": [M, 82, 94],
  "Kuldeep Yadav": [C, 78, 90],
  "Noor Ahmad": [C, 84, 96],
  "Yuzvendra Chahal": [W, 76, 88],
  "Ravi Bishnoi": [W, 84, 95],
  "Suyash Sharma": [W, 80, 92],
  "Mayank Markande": [W, 78, 90],
  "Wanindu Hasaranga": [W, 80, 92],
  "Rahul Chahar": [W, 82, 94],
  "Digvesh Singh Rathi": [W, 78, 90],
  "Vipraj Nigam": [W, 78, 90],
  "Rehan Ahmed": [W, 78, 90],
  "Shreyas Gopal": [W, 76, 88],
  "Riyan Parag": [W, 76, 88],
  "AM Ghazanfar": [M, 82, 94],
  "Kamindu Mendis": [O, 78, 92],
  "Ravindra Jadeja": [L, 86, 98],
  "Axar Patel": [L, 84, 96],
  "Mitch Santner": [L, 82, 94],
  "Krunal Pandya": [L, 80, 92],
  "Akeal Hosein": [L, 82, 94],
  "Harpreet Brar": [L, 80, 92],
  "Manav Suthar": [L, 80, 92],
  "Shahbaz Ahmed": [L, 80, 92],
  "George Linde": [L, 80, 92],
  "Ajay Mandal": [L, 78, 90],
  "Anukul Roy": [L, 78, 90],
  "Cooper Connolly": [L, 80, 92],
  "Rachin Ravindra": [L, 80, 92],
  "Sai Kishore": [L, 80, 92],
  "Washington Sundar": [O, 84, 98],
  "Jayant Yadav": [O, 80, 92],
  "Matt Short": [O, 78, 90],
};
/** name -> [min, max] for pace bowlers who are not in the default band for their rating */
const PACE = {
  "Mayank Yadav": [143, 155], "Umran Malik": [143, 155], "Jofra Archer": [141, 153], "Lockie Ferguson": [141, 153],
  "Anrich Nortje": [141, 153], "Gerald Coetzee": [139, 150], "Spencer Johnson": [139, 151], "Mitchell Starc": [138, 150],
  "Matheesha Pathirana": [137, 149], "Dushmantha Chameera": [138, 150], "Nandre Burger": [136, 148], "Kagiso Rabada": [138, 149],
  "Pat Cummins": [136, 148], "Marco Jansen": [134, 146], "Mohammed Siraj": [135, 146], "Jasprit Bumrah": [136, 148],
  "Dilshan Madushanka": [136, 147], "Nuwan Thushara": [136, 147], "Kwena Maphaka": [136, 147], "Jamie Overton": [136, 148],
  "Kyle Jamieson": [133, 145], "Navdeep Saini": [138, 149], "Blessing Muzarabani": [135, 146], "Harshit Rana": [135, 146],
  "Khaleel Ahmed": [134, 145], "Avesh Khan": [134, 146], "Arshdeep Singh": [134, 145], "Prasidh Krishna": [134, 146],
  "Mohammad Shami": [133, 145], "Thangarasu Natarajan": [131, 142], "Josh Hazlewood": [133, 143], "Trent Boult": [131, 142],
  "Matt Henry": [133, 143], "Luke Wood": [133, 143], "Adam Milne": [138, 150], "Ashwani Kumar": [132, 142],
  "Sam Curran": [128, 138], "Shardul Thakur": [128, 137], "Bhuvneshwar Kumar": [124, 134], "Deepak Chahar": [126, 136],
  "Harshal Patel": [124, 134], "Mustafizur Rahman": [126, 137], "Ishant Sharma": [130, 139], "Jaydev Unadkat": [127, 136],
  "Sandeep Sharma": [124, 133], "Jason Holder": [128, 137], "Hardik Pandya": [128, 140], "Shivam Dube": [122, 132],
  "Nitish Kumar Reddy": [124, 133], "Romario Shepherd": [130, 140], "Ramandeep Singh": [128, 137], "Azmatullah Omarzai": [130, 140],
  "Shahbaz Ahmed": [80, 92], "Mohsin Khan": [130, 140], "Yash Dayal": [128, 138], "Mukesh Kumar": [128, 138],
};
const hash = (a, b) => {
  let h = (Math.imul(a | 0, 2654435761) ^ Math.imul((b | 0) + 97, 40503)) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return ((h >>> 0) % 10000) / 10000;
};
/** { spin, style, kph } for one delivery; deterministic from the ball number. */
export function delivery(p, ball = 0) {
  if (!p) return { spin: false, style: "Pace", kph: 135 };
  const s = SPIN[p.name];
  if (s) {
    const [style, lo, hi] = s;
    return { spin: true, style, kph: Math.round((lo + (hi - lo) * hash(p.id, ball)) * 10) / 10 };
  }
  const [lo, hi] = PACE[p.name] || (p.role === "AR" ? [122, 132] : p.bowl >= 78 ? [132, 142] : p.bowl >= 68 ? [128, 138] : [124, 134]);
  const style = hi >= 143 ? "Express pace" : hi >= 138 ? "Fast" : hi >= 134 ? "Fast-medium" : "Medium pace";
  return { spin: false, style, kph: Math.round((lo + (hi - lo) * hash(p.id, ball)) * 10) / 10 };
}

/**
 * Name the shot from where the ball went, for a right-handed batter facing the bowler.
 * `angle` is the direction of the ball on the ground in screen terms (0 = right, 90° = back down the ground);
 * the off side is on the left of the screen, the leg side on the right.
 */
export function shotFor(angle, runs, spin, pick = 0) {
  let a = (angle * 180) / Math.PI - 90; // 0 = straight back past the bowler, positive = off side
  a = ((a + 540) % 360) - 180;
  const off = a >= 0,
    d = Math.abs(a),
    big = runs >= 6,
    alt = pick < 0.5;
  if (d <= 14) return big ? "Lofted straight drive" : alt ? "Straight drive" : "Down the ground";
  if (off) {
    if (d <= 50) return big ? "Lofted off drive" : alt ? "Off drive" : "Punch through the off side";
    if (d <= 92) return big ? "Lofted cover drive" : alt ? "Cover drive" : "Square drive";
    if (d <= 128) return big ? "Slashed over point" : spin && !alt ? "Reverse sweep" : "Square cut";
    if (d <= 160) return big ? "Upper cut" : alt ? "Late cut" : "Upper cut";
    return "Thin edge";
  }
  if (d <= 42) return big ? "Lofted on-drive" : alt ? "On drive" : "Flick off the pads";
  if (d <= 100) return big ? (spin ? "Slog sweep" : "Pulled over midwicket") : spin && !alt ? "Slog sweep" : "Pull shot";
  if (d <= 132) return big ? (spin ? "Slog sweep" : "Hooked for six") : spin ? "Sweep" : alt ? "Hook shot" : "Pull shot";
  if (d <= 160) return big ? "Scooped over fine leg" : alt ? "Leg glance" : "Flick";
  return "Fine glance";
}
