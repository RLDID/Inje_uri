import type { FeedCategory, Story } from '@/lib/types';

const MY_STORY_OVERRIDES_KEY = 'injeuri:my-story-overrides';

interface MyStoryOverride {
  id: string;
  text: string;
  images: string[];
  category?: FeedCategory;
  categories: FeedCategory[];
  updatedAt: string;
}

function readOverrideMap(): Record<string, MyStoryOverride> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(MY_STORY_OVERRIDES_KEY);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch {
    return {};
  }
}

function writeOverrideMap(overrides: Record<string, MyStoryOverride>) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(MY_STORY_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore local storage errors so the UI can keep working.
  }
}

export function applyMyStoryOverrides(stories: Story[]): Story[] {
  const overrides = readOverrideMap();

  return stories.map((story) => {
    const override = overrides[story.id];

    if (!override) {
      return story;
    }

    return {
      ...story,
      category: override.category,
      categories: override.categories,
      content: {
        ...story.content,
        text: override.text,
        images: override.images,
      },
    };
  });
}

export function writeMyStoryOverride(
  storyId: string,
  override: Pick<MyStoryOverride, 'text' | 'images' | 'category' | 'categories'>,
) {
  const overrides = readOverrideMap();

  writeOverrideMap({
    ...overrides,
    [storyId]: {
      id: storyId,
      ...override,
      updatedAt: new Date().toISOString(),
    },
  });
}
