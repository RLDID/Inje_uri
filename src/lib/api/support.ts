import { apiGet, apiPost } from '@/lib/api/client';
import type { CreateSupportInquiryInput, SupportInquiryDto } from '@/lib/types/support';

export function getSupportInquiries() {
  return apiGet<SupportInquiryDto[]>('/api/support-inquiries');
}

export function createSupportInquiry(input: CreateSupportInquiryInput) {
  return apiPost<SupportInquiryDto>('/api/support-inquiries', {
    category: input.category,
    screen: input.screen,
    title: input.title,
    content: input.content,
    email: input.email,
  });
}
