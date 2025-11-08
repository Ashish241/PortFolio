import type {
  PersonalInfo,
  SocialLinks,
  NavLinks,
  Skills,
  Project,
  Education,
} from './types';

export const personalInfo: PersonalInfo = {
  name: 'Ashish Kumar Ishwar',
  tagline: 'Aspiring Software Engineer | Focused on Full-Stack and Cloud Development',
  shortBio:
    'Ashish is a B.Tech Computer Science student passionate about turning complex ideas into functional software. His core strengths include Java, Python, and C++, complemented by strong Full-Stack Web Development experience. He is committed to writing clean, efficient, and scalable code and is seeking challenging internships to contribute to innovative software teams.',
  extendedBio: `
    <p>A B.Tech Computer Science student with a fervent passion for transforming complex ideas into elegant, functional software. My academic journey has equipped me with a robust foundation in computer science principles and a versatile skill set.</p>
    <p>My core strengths lie in programming with Java (Core + Advanced), Python, C, and C++, alongside a strong command of Full-Stack Web Development technologies, including React. I am analytical, detail-oriented, and dedicated to the craft of writing clean, efficient, and scalable code.</p>
    <p>I am actively seeking challenging internship opportunities where I can apply my skills to real-world problems, gain valuable industry exposure, and contribute meaningfully to innovative software development teams.</p>
  `,
  email: 'ashish@example.com',
  bookingLink: 'https://cal.com/placeholder-for-ashish',
};

export const socialLinks: SocialLinks = {
  linkedin: 'https://www.linkedin.com/in/placeholder',
  github: 'https://github.com/placeholder',
  email: `mailto:${personalInfo.email}`,
};

export const navLinks: NavLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/skills', label: 'Skills' },
  { href: '/education', label: 'Education' },
  { href: '/resume-optimizer', label: 'Resume AI' },
  { href: '/contact', label: 'Contact' },
];

export const skills: Skills = {
  primary: ['Cloud Developer', 'Frontend Developer'],
  technical: [
    'Java (Core + Advanced)',
    'Python',
    'C',
    'C++',
    'React.js',
    'HTML/CSS/JS',
    'Cloud fundamentals',
    'Git/GitHub',
  ],
  soft: ['Analytical problem solving', 'Clean coding', 'Team collaboration', 'Fast learner'],
  learning: ['Advanced Cloud services (AWS/GCP)', 'The React ecosystem (Next.js, Redux)', 'Backend frameworks (Node.js, Spring Boot)'],
};

export const careerGoals = [
  "Secure a challenging software development internship.",
  "Transition into a full-time junior developer role post-graduation.",
  "Engage in freelance web development to solve unique business problems.",
  "Continuously learn and master new technologies in cloud and full-stack development."
];

export const projects: Project[] = [
  {
    title: 'SquadSync',
    description:
      'A modern team collaboration platform enabling squads to manage tasks, share updates, and coordinate projects efficiently.',
    role: 'Full-Stack / Frontend Developer',
    techStack: ['React', 'JavaScript', 'Node.js', 'REST APIs'],
    features: [
      'Project dashboards for at-a-glance progress tracking.',
      'Real-time updates for seamless team communication.',
      'Comprehensive team and user management capabilities.',
      'Intuitive task management with assignment and status tracking.',
    ],
    problem:
      'Teams often struggle with fragmented communication and project tracking, using multiple disjointed tools which leads to inefficiency and loss of information.',
    solution:
      'SquadSync provides a unified, centralized platform that integrates task management, team communication, and project oversight into a single, intuitive interface, boosting productivity and collaboration.',
    techApproach:
      'Built with a modern frontend using React for a dynamic and responsive user experience. The backend, powered by Node.js, exposes REST APIs to handle data flow and business logic, ensuring a scalable and maintainable architecture.',
    results:
      'The platform demonstrates strong design thinking, a robust technical architecture, and a focus on UI/UX, resulting in a tool that is both powerful and easy to use for development squads.',
    link: '#',
    imageIds: ['squadsync-1', 'squadsync-2', 'squadsync-3'],
  },
];

export const education: Education[] = [
    {
      institution: "Amity University Jharkhand",
      degree: "B.Tech Computer Science",
      period: "Present",
      description: "Focusing on core computer science principles, software development, and algorithms."
    },
    {
      institution: "Gossner College Ranchi",
      degree: "12th Grade",
      period: "2023",
      description: "Completed with a focus on science and mathematics, building a strong analytical foundation."
    },
    {
      institution: "Saraswati Shishu Vidya Mandir",
      degree: "10th Grade",
      period: "2021",
      description: "Established a disciplined approach to learning and academic excellence."
    }
]
