import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '인제우리',
    short_name: '인제우리',
    description: '인제대학교 학생들을 위한 소개팅 서비스',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#F8FAFC',
    icons: [
      {
        src: '/brand/bear-hero-face2-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
      {
        src: '/brand/bear-hero-face2-icon.png',
        sizes: '1024x1024',
        type: 'image/png',
      },
    ],
  };
}
