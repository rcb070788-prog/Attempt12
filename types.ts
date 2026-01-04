
export interface User {
  username: string;
  name: string;
  voterId: string;
  isVerified: boolean;
  notificationPref: 'email' | 'text' | 'both';
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
  isOpen: boolean;
  endsAt: string;
  votes: Record<string, { option: string; isAnonymous: boolean; district: string }>;
  comments: Comment[];
}

export interface Comment {
  id: string;
  authorName: string;
  text: string;
  timestamp: string;
  isAnonymous: boolean;
  district: string;
}
