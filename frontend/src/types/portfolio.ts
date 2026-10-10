export interface Technology {
  name: string;
  category: string;
  usages: string[];
}
export interface ArchitectureNode {
  key: string;
  label: string;
  description: string;
  position: number;
}
export interface ArchitectureEdge {
  source: string;
  target: string;
  label: string;
}
export interface Project {
  slug: string;
  title: string;
  short_title: string;
  date: string;
  category: string;
  summary: string;
  problem: string;
  solution: string;
  outcome: string;
  github_url: string;
  live_url: string | null;
  featured: boolean;
  technologies: string[];
  features: string[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}
export interface Experience {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  location: string;
  highlights: string[];
  technologies: string[];
}
export interface Contribution {
  organization: string;
  repository: string;
  pr_number: number;
  url: string;
  status: string;
  description: string;
}
export interface Certification {
  title: string;
  issuer: string;
  year: number;
  kind: string;
}
export interface Profile {
  name: string;
  location: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  summary: string;
  roles: string[];
}
export interface EducationRecord {
  qualification: string;
  institution: string;
  expected_year: number;
  grade: string;
}
export interface PortfolioData {
  profile: Profile;
  education: EducationRecord[];
  projects: Project[];
  skills: Technology[];
  experience: Experience[];
  contributions: Contribution[];
  certifications: Certification[];
}
export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
  started_at: number;
}
