export type SupportInquiryStatus = 'received' | 'in_review' | 'answered';

export interface SupportInquiryDto {
  id: number;
  userId: number | null;
  category: string;
  screen: string;
  title: string;
  content: string;
  email: string | null;
  status: SupportInquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportInquiryInput {
  category: string;
  screen: string;
  title: string;
  content: string;
  email?: string;
}
