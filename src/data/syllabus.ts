export interface Chapter {
  id: string;
  name: string;
  subject: 'physics' | 'chemistry' | 'mathematics';
  theoryDone: boolean;
  practiceDone: boolean;
  revisionDone: boolean;
  xpReward: number;
}

export interface JungleData {
  id: string;
  name: string;
  icon: string;
  description: string;
  chapters: Chapter[];
  color: string;
}

const createChapter = (id: string, name: string, subject: 'physics' | 'chemistry' | 'mathematics'): Chapter => ({
  id,
  name,
  subject,
  theoryDone: false,
  practiceDone: false,
  revisionDone: false,
  xpReward: 50,
});

export const cbseClass12: JungleData = {
  id: 'cbse-12',
  name: 'CBSE Class 12',
  icon: '📘',
  description: 'Master your board exams',
  color: 'from-blue-500 to-cyan-500',
  chapters: [
    // Physics
    createChapter('cbse-phy-1', 'Electrostatics', 'physics'),
    createChapter('cbse-phy-2', 'Current Electricity', 'physics'),
    createChapter('cbse-phy-3', 'Magnetic Effects of Current', 'physics'),
    createChapter('cbse-phy-4', 'Magnetism & Matter', 'physics'),
    createChapter('cbse-phy-5', 'EMI', 'physics'),
    createChapter('cbse-phy-6', 'Alternating Current', 'physics'),
    createChapter('cbse-phy-7', 'EM Waves', 'physics'),
    createChapter('cbse-phy-8', 'Ray Optics', 'physics'),
    createChapter('cbse-phy-9', 'Wave Optics', 'physics'),
    createChapter('cbse-phy-10', 'Dual Nature of Radiation', 'physics'),
    createChapter('cbse-phy-11', 'Atoms', 'physics'),
    createChapter('cbse-phy-12', 'Nuclei', 'physics'),
    createChapter('cbse-phy-13', 'Semiconductor Electronics', 'physics'),
    // Chemistry
    createChapter('cbse-chem-1', 'Solutions', 'chemistry'),
    createChapter('cbse-chem-2', 'Electrochemistry', 'chemistry'),
    createChapter('cbse-chem-3', 'Chemical Kinetics', 'chemistry'),
    createChapter('cbse-chem-4', 'Surface Chemistry', 'chemistry'),
    createChapter('cbse-chem-5', 'Haloalkanes & Haloarenes', 'chemistry'),
    createChapter('cbse-chem-6', 'Alcohols, Phenols & Ethers', 'chemistry'),
    createChapter('cbse-chem-7', 'Aldehydes & Ketones', 'chemistry'),
    createChapter('cbse-chem-8', 'Amines', 'chemistry'),
    createChapter('cbse-chem-9', 'Biomolecules', 'chemistry'),
    createChapter('cbse-chem-10', 'Polymers', 'chemistry'),
    createChapter('cbse-chem-11', 'Chemistry in Everyday Life', 'chemistry'),
    createChapter('cbse-chem-12', 'Coordination Compounds', 'chemistry'),
    createChapter('cbse-chem-13', 'd & f Block Elements', 'chemistry'),
    createChapter('cbse-chem-14', 'p Block Elements', 'chemistry'),
    createChapter('cbse-chem-15', 'Metallurgy', 'chemistry'),
    // Mathematics
    createChapter('cbse-math-1', 'Relations & Functions', 'mathematics'),
    createChapter('cbse-math-2', 'Inverse Trigonometric Functions', 'mathematics'),
    createChapter('cbse-math-3', 'Matrices', 'mathematics'),
    createChapter('cbse-math-4', 'Determinants', 'mathematics'),
    createChapter('cbse-math-5', 'Continuity & Differentiability', 'mathematics'),
    createChapter('cbse-math-6', 'Applications of Derivatives', 'mathematics'),
    createChapter('cbse-math-7', 'Integrals', 'mathematics'),
    createChapter('cbse-math-8', 'Applications of Integrals', 'mathematics'),
    createChapter('cbse-math-9', 'Differential Equations', 'mathematics'),
    createChapter('cbse-math-10', 'Vector Algebra', 'mathematics'),
    createChapter('cbse-math-11', '3D Geometry', 'mathematics'),
    createChapter('cbse-math-12', 'Probability', 'mathematics'),
  ],
};

export const jeeMain: JungleData = {
  id: 'jee-main',
  name: 'JEE Main',
  icon: '📗',
  description: 'Crack the national entrance',
  color: 'from-green-500 to-emerald-500',
  chapters: [
    // Physics
    createChapter('jm-phy-1', 'Kinematics', 'physics'),
    createChapter('jm-phy-2', 'Laws of Motion', 'physics'),
    createChapter('jm-phy-3', 'Work, Power & Energy', 'physics'),
    createChapter('jm-phy-4', 'Centre of Mass & Rotation', 'physics'),
    createChapter('jm-phy-5', 'Gravitation', 'physics'),
    createChapter('jm-phy-6', 'Thermodynamics', 'physics'),
    createChapter('jm-phy-7', 'Oscillations & Waves', 'physics'),
    createChapter('jm-phy-8', 'Electrostatics', 'physics'),
    createChapter('jm-phy-9', 'Current Electricity', 'physics'),
    createChapter('jm-phy-10', 'Magnetism & EMI', 'physics'),
    createChapter('jm-phy-11', 'Alternating Current', 'physics'),
    createChapter('jm-phy-12', 'Optics', 'physics'),
    createChapter('jm-phy-13', 'Modern Physics', 'physics'),
    createChapter('jm-phy-14', 'Semiconductor Devices', 'physics'),
    // Chemistry
    createChapter('jm-chem-1', 'Mole Concept', 'chemistry'),
    createChapter('jm-chem-2', 'Thermodynamics', 'chemistry'),
    createChapter('jm-chem-3', 'Equilibrium', 'chemistry'),
    createChapter('jm-chem-4', 'Electrochemistry', 'chemistry'),
    createChapter('jm-chem-5', 'Kinetics', 'chemistry'),
    createChapter('jm-chem-6', 'General Organic Chemistry', 'chemistry'),
    createChapter('jm-chem-7', 'Hydrocarbons', 'chemistry'),
    createChapter('jm-chem-8', 'Halo Compounds', 'chemistry'),
    createChapter('jm-chem-9', 'Alcohols & Carbonyls', 'chemistry'),
    createChapter('jm-chem-10', 'Amines', 'chemistry'),
    createChapter('jm-chem-11', 'Periodic Table', 'chemistry'),
    createChapter('jm-chem-12', 'Chemical Bonding', 'chemistry'),
    createChapter('jm-chem-13', 'Coordination Chemistry', 'chemistry'),
    createChapter('jm-chem-14', 'p & d Block Elements', 'chemistry'),
    // Mathematics
    createChapter('jm-math-1', 'Trigonometry', 'mathematics'),
    createChapter('jm-math-2', 'Complex Numbers', 'mathematics'),
    createChapter('jm-math-3', 'Quadratic Equations', 'mathematics'),
    createChapter('jm-math-4', 'Permutations & Combinations', 'mathematics'),
    createChapter('jm-math-5', 'Binomial Theorem', 'mathematics'),
    createChapter('jm-math-6', 'Sequences & Series', 'mathematics'),
    createChapter('jm-math-7', 'Limits', 'mathematics'),
    createChapter('jm-math-8', 'Differentiation', 'mathematics'),
    createChapter('jm-math-9', 'Integration', 'mathematics'),
    createChapter('jm-math-10', 'Vectors', 'mathematics'),
    createChapter('jm-math-11', '3D Geometry', 'mathematics'),
    createChapter('jm-math-12', 'Probability & Statistics', 'mathematics'),
  ],
};

export const jeeAdvanced: JungleData = {
  id: 'jee-advanced',
  name: 'JEE Advanced',
  icon: '📕',
  description: 'Conquer the IIT dream',
  color: 'from-red-500 to-orange-500',
  chapters: [
    // Physics
    createChapter('ja-phy-1', 'General Physics', 'physics'),
    createChapter('ja-phy-2', 'Advanced Kinematics', 'physics'),
    createChapter('ja-phy-3', 'Rigid Body Dynamics', 'physics'),
    createChapter('ja-phy-4', 'Fluid Mechanics', 'physics'),
    createChapter('ja-phy-5', 'Advanced Thermodynamics', 'physics'),
    createChapter('ja-phy-6', 'Electrostatics (Field-based)', 'physics'),
    createChapter('ja-phy-7', 'Magnetism (Vector)', 'physics'),
    createChapter('ja-phy-8', 'EMI (Energy-based)', 'physics'),
    createChapter('ja-phy-9', 'Wave & Ray Optics', 'physics'),
    createChapter('ja-phy-10', 'Modern Physics', 'physics'),
    // Chemistry
    createChapter('ja-chem-1', 'Advanced Thermodynamics', 'chemistry'),
    createChapter('ja-chem-2', 'Chemical Kinetics (Graph)', 'chemistry'),
    createChapter('ja-chem-3', 'Electrochemistry', 'chemistry'),
    createChapter('ja-chem-4', 'Solutions', 'chemistry'),
    createChapter('ja-chem-5', 'States of Matter', 'chemistry'),
    createChapter('ja-chem-6', 'Functional Groups', 'chemistry'),
    createChapter('ja-chem-7', 'Hydrocarbons', 'chemistry'),
    createChapter('ja-chem-8', 'Biomolecules & Polymers', 'chemistry'),
    createChapter('ja-chem-9', 'Reaction Mechanisms', 'chemistry'),
    createChapter('ja-chem-10', 'Coordination (CFT + MOT)', 'chemistry'),
    createChapter('ja-chem-11', 'Stereochemistry', 'chemistry'),
    createChapter('ja-chem-12', 'Qualitative Analysis', 'chemistry'),
    // Mathematics
    createChapter('ja-math-1', 'Functions (Deep)', 'mathematics'),
    createChapter('ja-math-2', 'Inequalities', 'mathematics'),
    createChapter('ja-math-3', 'Advanced Calculus', 'mathematics'),
    createChapter('ja-math-4', 'Definite Integrals', 'mathematics'),
    createChapter('ja-math-5', 'Differential Equations', 'mathematics'),
    createChapter('ja-math-6', 'Probability (Multi-concept)', 'mathematics'),
    createChapter('ja-math-7', 'Vectors + 3D Geometry', 'mathematics'),
  ],
};

export const allJungles: JungleData[] = [cbseClass12, jeeMain, jeeAdvanced];

export const rewards = [
  { level: 5, name: 'Pen', icon: '🖊️', unlocked: false },
  { level: 10, name: 'Notebook', icon: '📓', unlocked: false },
  { level: 15, name: 'Bag', icon: '🎒', unlocked: false },
  { level: 20, name: 'Trophy', icon: '🏆', unlocked: false },
  { level: 25, name: 'Medal', icon: '🥇', unlocked: false },
  { level: 30, name: 'Certificate', icon: '📜', unlocked: false },
];
