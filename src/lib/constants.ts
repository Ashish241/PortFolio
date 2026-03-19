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
  tagline: 'Cloud Computing Enthusiast & DevOps-focused Software Engineer',
  shortBio:
    "I am a Cloud and DevOps-focused B.Tech Computer Science student with hands-on experience in containerization, Kubernetes orchestration, and cloud-native deployments. I am a proactive problem solver passionate about building scalable, fault-tolerant systems and optimizing deployment workflows. I am seeking a Cloud/DevOps Internship to apply infrastructure automation and cloud engineering skills in real-world environments.",
  extendedBio: `
    <p>I am a B.Tech Computer Science student with a fervent passion for Cloud Computing and DevOps. My academic journey and hands-on projects have equipped me with a robust foundation in containerization, Kubernetes orchestration, and cloud-native deployments.</p>
    <p>My core strengths lie in programming languages such as C, C++, Java, and Python. Additionally, I have a strong command of Full-Stack Web Development frameworks (React, TypeScript, Node.js) and DevOps tools like Docker, Kubernetes, and CI/CD pipelines. I am a proactive problem solver, detail-oriented, and dedicated to building scalable, fault-tolerant systems.</p>
    <p>I am actively seeking challenging Cloud/DevOps internship opportunities where I can apply infrastructure automation and cloud engineering skills to real-world environments, gain valuable industry exposure, and contribute meaningfully to innovative software development teams.</p>
  `,
  email: 'ashishkum2411@gmail.com',
  bookingLink: 'https://cal.com/placeholder-for-ashish',
};

export const socialLinks: SocialLinks = {
  linkedin: 'https://linkedin.com/in/ashish-ishwar',
  github: 'https://github.com/Ashish241',
  email: `mailto:ashishkum2411@gmail.com`,
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
  primary: ['Cloud Platforms (GCP)', 'Containerization & Orchestration', 'DevOps & CI/CD Concepts'],
  technical: [
    'Docker',
    'Kubernetes',
    'Java (Core & Advanced)',
    'Python',
    'C',
    'C++',
    'React & TypeScript',
    'HTML/CSS/JS',
    'SQL',
    'Linux Administration',
    'Git/GitHub',
  ],
  soft: ['Problem Solving', 'Quick Learner', 'Time Management', 'Adaptability'],
  learning: ['Advanced Kubernetes (Helm, Metrics)', 'Predictive Auto-scaling', 'Cloud-native Observability'],
};

export const careerGoals = [
  "Secure a challenging Cloud/DevOps or Software Development internship.",
  "Apply infrastructure automation and cloud engineering skills in real-world environments.",
  "Continuously learn and master new technologies in Kubernetes, CI/CD, and full-stack development.",
  "Build scalable, fault-tolerant systems and optimize deployment workflows."
];

export const projects: Project[] = [
  {
    title: 'Kubernetes Auto-Scaling Intelligence Engine (KubASIE)',
    description: 'A predictive Kubernetes auto-scaler that dynamically adjusts Horizontal Pod Autoscalers to optimize architecture costs while maintaining SLAs.',
    role: 'Cloud / DevOps Engineer',
    techStack: ['PyTorch (LSTM)', 'Facebook Prophet', 'FastAPI', 'React/Vite', 'Docker', 'Helm', 'Kubernetes'],
    features: [
      'Predictive traffic models to anticipate cluster load up to 60 minutes ahead.',
      'Hybrid policy REST API to serve scaling metrics, manual overrides, and predictions.',
      'Observability dashboard to visualize cost savings and Prometheus metrics.',
      'Containerized and orchestrated the stack using Docker and Helm.',
    ],
    problem: 'Kubernetes native HPA only scales reactively resulting in potential latency spikes or over-provisioning during rapid traffic changes.',
    solution: 'KubASIE implements predictive traffic models using AI algorithms to anticipate load and scale pods proactively, ensuring SLA compliance and cost efficiency.',
    techApproach: 'Trained models (LSTM & Prophet) process metrics and expose scaling policies via a FastAPI REST API. The entire infrastructure is containerized and orchestrated via Docker and Helm.',
    results: 'Optimized architecture costs by reducing over-provisioning while preventing downtime from sudden traffic spikes.',
    link: 'https://github.com/Ashish241/KubASIE',
    imageIds: ['squadsync-1', 'squadsync-2', 'squadsync-3'],
  },
  {
    title: 'Portfolio Website',
    description: 'A fully responsive portfolio showcasing technical skills, projects, and educational background using React and TypeScript.',
    role: 'Frontend Developer',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    features: [
      'Developed with modular and reusable components.',
      'Optimized UI performance and ensured cross-device compatibility.',
      'Integrated GitHub repositories and structured project showcases for professional presentation.',
      'Applied version control best practices using Git.',
    ],
    problem: 'Needed a professional digital presence to consolidate projects, skills, and resume details in a modern format.',
    solution: 'Created a static, highly performant portfolio website using the React ecosystem.',
    techApproach: 'Leveraged Next.js framework, Typescript for type safety, and Tailwind CSS for rapid UI development and styling.',
    results: 'Delivered an accessible and fast web application to serve as an interactive resume.',
    link: 'https://github.com/Ashish241/PortFolio',
    imageIds: ['squadsync-1', 'squadsync-2', 'squadsync-3'],
  },
  {
    title: 'SquadSync \u2013 Gaming Collaboration Platform',
    description: 'A team collaboration platform enabling matchmaking, user interaction, and efficient task management.',
    role: 'Full-Stack Developer',
    techStack: ['React', 'JavaScript', 'Node.js', 'REST APIs'],
    features: [
      'Project dashboards for team tracking and task management.',
      'Real-time updates for seamless team communication.',
      'Designed scalable frontend architecture and structured project workflow.',
      'Implemented modular component-based development approach.',
    ],
    problem: 'Teams often struggle with fragmented communication and project tracking, using multiple disjointed tools which leads to inefficiency and loss of information.',
    solution: 'SquadSync provides a unified, centralized platform that integrates task management, team communication, and project oversight into a single, intuitive interface, boosting productivity and collaboration.',
    techApproach: 'Built with a modern frontend using React for a dynamic and responsive user experience. The backend, powered by Node.js, exposes REST APIs to handle data flow and business logic, ensuring a scalable and maintainable architecture.',
    results: 'The platform demonstrates strong design thinking, a robust technical architecture, and a focus on UI/UX, resulting in a tool that is both powerful and easy to use for development squads.',
    link: 'https://github.com/Ashish241/squadsync',
    imageIds: ['squadsync-1', 'squadsync-2', 'squadsync-3'],
  },
];

export const education: Education[] = [
  {
    institution: "Amity University Jharkhand",
    degree: "B.Tech Computer Science Engineering",
    period: "Expected Graduation: 2027",
    description: "CGPA: 7.6. Focusing on core computer science principles, software development, containerization, and cloud technologies."
  },
  {
    institution: "Gossner College, Ranchi",
    degree: "12th Grade",
    period: "2023",
    description: "Completed with a score of 66%, building a strong analytical and scientific foundation."
  },
  {
    institution: "Saraswati Shishu Vidya Mandir",
    degree: "10th Grade",
    period: "2021",
    description: "Completed with a score of 77%, establishing a disciplined approach to learning and academic excellence."
  }
];
