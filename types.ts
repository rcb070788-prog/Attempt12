
export interface DashboardConfig {
  id: string;
  title: string;
  category: 'expenses' | 'revenues' | 'assets';
  description: string;
  folderPath: string; // The URL path to the index.html inside the dashboard folder
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  openDate: string;
  closeDate: string;
  isAnonymousAllowed: boolean;
  status: 'open' | 'closed';
}

export interface Vote {
  id: string;
  pollId: string;
  voterId: string;
  voterName: string;
  district: string;
  voteValue: string;
  isAnonymous: boolean;
}

export interface Comment {
  id: string;
  pollId: string;
  voterName: string;
  district: string;
  content: string;
  createdAt: string;
}

export interface Suggestion {
  id: string;
  voterName: string;
  district: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
}

export interface UserProfile {
  fullName: string;
  voterId: string;
  district: string;
  email: string;
  phone: string;
  contactPreference: 'email' | 'text' | 'both';
  isAdmin?: boolean;
}
