export type PersonalInfo = {
  name: string;
  tagline: string;
  shortBio: string;
  extendedBio: string;
  email: string;
  bookingLink: string;
};

export type SocialLinks = {
  linkedin: string;
  github: string;
  email: string;
};

export type NavLink = {
  href: string;
  label: string;
};

export type NavLinks = NavLink[];

export type Skills = {
  primary: string[];
  technical: string[];
  soft: string[];
  learning: string[];
};

export type Project = {
  title: string;
  description: string;
  role: string;
  techStack: string[];
  features: string[];
  problem: string;
  solution: string;
  techApproach: string;
  results: string;
  link: string;
  imageIds: string[];
};

export type Education = {
    institution: string;
    degree: string;
    period: string;
    description: string;
}
