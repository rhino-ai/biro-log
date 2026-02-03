export type SubjectType = 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'science' | 'english' | 'hindi' | 'social_science' | 'computer' | 'art';
export type StudyTrack = 'jee' | 'neet' | 'highschool';

export interface Chapter {
  id: string;
  name: string;
  subject: SubjectType;
  theoryDone: boolean;
  practiceDone: boolean;
  revisionDone: boolean;
  xpReward: number;
  isCustom?: boolean;
}

export interface JungleData {
  id: string;
  name: string;
  icon: string;
  description: string;
  chapters: Chapter[];
  color: string;
  track?: StudyTrack;
}

export const createChapter = (id: string, name: string, subject: SubjectType, isCustom = false): Chapter => ({
  id,
  name,
  subject,
  theoryDone: false,
  practiceDone: false,
  revisionDone: false,
  xpReward: 50,
  isCustom,
});

// JEE Track - Physics, Chemistry, Mathematics
export const cbseClass12: JungleData = {
  id: 'cbse-12',
  name: 'CBSE Class 12',
  icon: '📘',
  description: 'Master your board exams',
  color: 'from-blue-500 to-cyan-500',
  track: 'jee',
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
  track: 'jee',
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
  track: 'jee',
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

// NEET Track - Physics, Chemistry, Biology
export const neetPhysics: JungleData = {
  id: 'neet-physics',
  name: 'NEET Physics',
  icon: '⚛️',
  description: 'Physics for Medical Entrance',
  color: 'from-blue-500 to-indigo-500',
  track: 'neet',
  chapters: [
    createChapter('neet-phy-1', 'Physical World & Measurement', 'physics'),
    createChapter('neet-phy-2', 'Kinematics', 'physics'),
    createChapter('neet-phy-3', 'Laws of Motion', 'physics'),
    createChapter('neet-phy-4', 'Work, Energy & Power', 'physics'),
    createChapter('neet-phy-5', 'Rotational Motion', 'physics'),
    createChapter('neet-phy-6', 'Gravitation', 'physics'),
    createChapter('neet-phy-7', 'Properties of Matter', 'physics'),
    createChapter('neet-phy-8', 'Thermodynamics', 'physics'),
    createChapter('neet-phy-9', 'Oscillations & Waves', 'physics'),
    createChapter('neet-phy-10', 'Electrostatics', 'physics'),
    createChapter('neet-phy-11', 'Current Electricity', 'physics'),
    createChapter('neet-phy-12', 'Magnetic Effects', 'physics'),
    createChapter('neet-phy-13', 'EMI & AC', 'physics'),
    createChapter('neet-phy-14', 'Optics', 'physics'),
    createChapter('neet-phy-15', 'Modern Physics', 'physics'),
  ],
};

export const neetChemistry: JungleData = {
  id: 'neet-chemistry',
  name: 'NEET Chemistry',
  icon: '🧪',
  description: 'Chemistry for Medical Entrance',
  color: 'from-green-500 to-teal-500',
  track: 'neet',
  chapters: [
    createChapter('neet-chem-1', 'Structure of Atom', 'chemistry'),
    createChapter('neet-chem-2', 'Chemical Bonding', 'chemistry'),
    createChapter('neet-chem-3', 'States of Matter', 'chemistry'),
    createChapter('neet-chem-4', 'Thermodynamics', 'chemistry'),
    createChapter('neet-chem-5', 'Equilibrium', 'chemistry'),
    createChapter('neet-chem-6', 'Solutions', 'chemistry'),
    createChapter('neet-chem-7', 'Electrochemistry', 'chemistry'),
    createChapter('neet-chem-8', 'Chemical Kinetics', 'chemistry'),
    createChapter('neet-chem-9', 'Coordination Compounds', 'chemistry'),
    createChapter('neet-chem-10', 'Organic Chemistry Basics', 'chemistry'),
    createChapter('neet-chem-11', 'Hydrocarbons', 'chemistry'),
    createChapter('neet-chem-12', 'Haloalkanes', 'chemistry'),
    createChapter('neet-chem-13', 'Alcohols & Phenols', 'chemistry'),
    createChapter('neet-chem-14', 'Aldehydes & Ketones', 'chemistry'),
    createChapter('neet-chem-15', 'Biomolecules', 'chemistry'),
  ],
};

export const neetBiology: JungleData = {
  id: 'neet-biology',
  name: 'NEET Biology',
  icon: '🧬',
  description: 'Biology for Medical Entrance',
  color: 'from-emerald-500 to-green-500',
  track: 'neet',
  chapters: [
    createChapter('neet-bio-1', 'The Living World', 'biology'),
    createChapter('neet-bio-2', 'Biological Classification', 'biology'),
    createChapter('neet-bio-3', 'Plant Kingdom', 'biology'),
    createChapter('neet-bio-4', 'Animal Kingdom', 'biology'),
    createChapter('neet-bio-5', 'Morphology of Plants', 'biology'),
    createChapter('neet-bio-6', 'Anatomy of Plants', 'biology'),
    createChapter('neet-bio-7', 'Structural Organisation in Animals', 'biology'),
    createChapter('neet-bio-8', 'Cell Structure', 'biology'),
    createChapter('neet-bio-9', 'Cell Cycle & Division', 'biology'),
    createChapter('neet-bio-10', 'Photosynthesis', 'biology'),
    createChapter('neet-bio-11', 'Respiration in Plants', 'biology'),
    createChapter('neet-bio-12', 'Plant Growth & Development', 'biology'),
    createChapter('neet-bio-13', 'Digestion & Absorption', 'biology'),
    createChapter('neet-bio-14', 'Breathing & Exchange of Gases', 'biology'),
    createChapter('neet-bio-15', 'Body Fluids & Circulation', 'biology'),
    createChapter('neet-bio-16', 'Excretory Products', 'biology'),
    createChapter('neet-bio-17', 'Locomotion & Movement', 'biology'),
    createChapter('neet-bio-18', 'Neural Control', 'biology'),
    createChapter('neet-bio-19', 'Reproduction in Organisms', 'biology'),
    createChapter('neet-bio-20', 'Human Reproduction', 'biology'),
    createChapter('neet-bio-21', 'Genetics', 'biology'),
    createChapter('neet-bio-22', 'Molecular Basis of Inheritance', 'biology'),
    createChapter('neet-bio-23', 'Evolution', 'biology'),
    createChapter('neet-bio-24', 'Human Health & Disease', 'biology'),
    createChapter('neet-bio-25', 'Biotechnology', 'biology'),
    createChapter('neet-bio-26', 'Ecology', 'biology'),
  ],
};

// High School Track - General subjects
export const highSchoolScience: JungleData = {
  id: 'hs-science',
  name: 'Science',
  icon: '🔬',
  description: 'General Science',
  color: 'from-purple-500 to-pink-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-sci-1', 'Chemical Reactions', 'science'),
    createChapter('hs-sci-2', 'Acids, Bases & Salts', 'science'),
    createChapter('hs-sci-3', 'Metals & Non-metals', 'science'),
    createChapter('hs-sci-4', 'Carbon Compounds', 'science'),
    createChapter('hs-sci-5', 'Life Processes', 'science'),
    createChapter('hs-sci-6', 'Control & Coordination', 'science'),
    createChapter('hs-sci-7', 'Heredity & Evolution', 'science'),
    createChapter('hs-sci-8', 'Light', 'science'),
    createChapter('hs-sci-9', 'Electricity', 'science'),
    createChapter('hs-sci-10', 'Magnetic Effects', 'science'),
    createChapter('hs-sci-11', 'Natural Resources', 'science'),
    createChapter('hs-sci-12', 'Environment', 'science'),
  ],
};

export const highSchoolMaths: JungleData = {
  id: 'hs-maths',
  name: 'Mathematics',
  icon: '📐',
  description: 'School Mathematics',
  color: 'from-blue-500 to-cyan-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-math-1', 'Real Numbers', 'mathematics'),
    createChapter('hs-math-2', 'Polynomials', 'mathematics'),
    createChapter('hs-math-3', 'Linear Equations', 'mathematics'),
    createChapter('hs-math-4', 'Quadratic Equations', 'mathematics'),
    createChapter('hs-math-5', 'Arithmetic Progressions', 'mathematics'),
    createChapter('hs-math-6', 'Triangles', 'mathematics'),
    createChapter('hs-math-7', 'Coordinate Geometry', 'mathematics'),
    createChapter('hs-math-8', 'Trigonometry', 'mathematics'),
    createChapter('hs-math-9', 'Circles', 'mathematics'),
    createChapter('hs-math-10', 'Constructions', 'mathematics'),
    createChapter('hs-math-11', 'Areas', 'mathematics'),
    createChapter('hs-math-12', 'Statistics', 'mathematics'),
    createChapter('hs-math-13', 'Probability', 'mathematics'),
  ],
};

export const highSchoolEnglish: JungleData = {
  id: 'hs-english',
  name: 'English',
  icon: '📖',
  description: 'English Language',
  color: 'from-amber-500 to-orange-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-eng-1', 'Reading Comprehension', 'english'),
    createChapter('hs-eng-2', 'Grammar', 'english'),
    createChapter('hs-eng-3', 'Writing Skills', 'english'),
    createChapter('hs-eng-4', 'Letter Writing', 'english'),
    createChapter('hs-eng-5', 'Essay Writing', 'english'),
    createChapter('hs-eng-6', 'Poetry', 'english'),
    createChapter('hs-eng-7', 'Prose', 'english'),
    createChapter('hs-eng-8', 'Drama', 'english'),
  ],
};

export const highSchoolHindi: JungleData = {
  id: 'hs-hindi',
  name: 'Hindi',
  icon: '🔤',
  description: 'Hindi Language',
  color: 'from-orange-500 to-red-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-hin-1', 'Gadya (Prose)', 'hindi'),
    createChapter('hs-hin-2', 'Padya (Poetry)', 'hindi'),
    createChapter('hs-hin-3', 'Vyakaran (Grammar)', 'hindi'),
    createChapter('hs-hin-4', 'Lekhan (Writing)', 'hindi'),
    createChapter('hs-hin-5', 'Patra Lekhan', 'hindi'),
    createChapter('hs-hin-6', 'Nibandh', 'hindi'),
  ],
};

export const highSchoolSST: JungleData = {
  id: 'hs-sst',
  name: 'Social Science',
  icon: '🌍',
  description: 'History, Geography, Civics',
  color: 'from-teal-500 to-cyan-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-sst-1', 'History: Nationalism', 'social_science'),
    createChapter('hs-sst-2', 'History: Independence', 'social_science'),
    createChapter('hs-sst-3', 'Geography: Resources', 'social_science'),
    createChapter('hs-sst-4', 'Geography: Agriculture', 'social_science'),
    createChapter('hs-sst-5', 'Geography: Industries', 'social_science'),
    createChapter('hs-sst-6', 'Civics: Democracy', 'social_science'),
    createChapter('hs-sst-7', 'Civics: Political Parties', 'social_science'),
    createChapter('hs-sst-8', 'Economics: Development', 'social_science'),
    createChapter('hs-sst-9', 'Economics: Money & Credit', 'social_science'),
  ],
};

export const highSchoolComputer: JungleData = {
  id: 'hs-computer',
  name: 'Computer Science',
  icon: '💻',
  description: 'Computer Basics & Programming',
  color: 'from-indigo-500 to-purple-500',
  track: 'highschool',
  chapters: [
    createChapter('hs-comp-1', 'Computer Fundamentals', 'computer'),
    createChapter('hs-comp-2', 'Operating Systems', 'computer'),
    createChapter('hs-comp-3', 'Internet & Web', 'computer'),
    createChapter('hs-comp-4', 'HTML Basics', 'computer'),
    createChapter('hs-comp-5', 'MS Office', 'computer'),
    createChapter('hs-comp-6', 'Programming Basics', 'computer'),
  ],
};

// All jungles organized by track
export const jeeJungles: JungleData[] = [cbseClass12, jeeMain, jeeAdvanced];
export const neetJungles: JungleData[] = [neetPhysics, neetChemistry, neetBiology];
export const highSchoolJungles: JungleData[] = [highSchoolScience, highSchoolMaths, highSchoolEnglish, highSchoolHindi, highSchoolSST, highSchoolComputer];

// Default export (JEE by default, but can be changed based on user selection)
export const allJungles: JungleData[] = jeeJungles;

// Helper to get jungles by track
export const getJunglesByTrack = (track: StudyTrack): JungleData[] => {
  switch (track) {
    case 'jee':
      return jeeJungles;
    case 'neet':
      return neetJungles;
    case 'highschool':
      return highSchoolJungles;
    default:
      return jeeJungles;
  }
};

// Subject icons for display
export const subjectIcons: Record<SubjectType, string> = {
  physics: '⚛️',
  chemistry: '🧪',
  mathematics: '📐',
  biology: '🧬',
  science: '🔬',
  english: '📖',
  hindi: '🔤',
  social_science: '🌍',
  computer: '💻',
  art: '🎨',
};

// Subject colors for display
export const subjectColors: Record<SubjectType, string> = {
  physics: 'border-l-blue-500',
  chemistry: 'border-l-green-500',
  mathematics: 'border-l-purple-500',
  biology: 'border-l-emerald-500',
  science: 'border-l-pink-500',
  english: 'border-l-amber-500',
  hindi: 'border-l-orange-500',
  social_science: 'border-l-teal-500',
  computer: 'border-l-indigo-500',
  art: 'border-l-rose-500',
};

export const rewards = [
  { level: 5, name: 'Pen', icon: '🖊️', unlocked: false },
  { level: 10, name: 'Notebook', icon: '📓', unlocked: false },
  { level: 15, name: 'Bag', icon: '🎒', unlocked: false },
  { level: 20, name: 'Trophy', icon: '🏆', unlocked: false },
  { level: 25, name: 'Medal', icon: '🥇', unlocked: false },
  { level: 30, name: 'Certificate', icon: '📜', unlocked: false },
];
