import React from 'react';
import { UnderlineNav, TextInput } from '@primer/react';
import { Box } from '@/components/PrimerCompat';
import { SearchIcon } from '@primer/octicons-react';
import { Post, PostStatus } from '@/types';

interface PostFilterTabsProps {
  currentStatus: PostStatus | 'all';
  onSelectStatus: (status: PostStatus | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  posts: Post[];
}

export const PostFilterTabs: React.FC<PostFilterTabsProps> = ({
  currentStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  posts,
}) => {
  const getCount = (status?: PostStatus) => {
    if (!status) return posts.length;
    return posts.filter((p) => p.status === status).length;
  };

  const tabs: Array<{ id: PostStatus | 'all'; label: string; count?: number }> = [
    { id: 'all', label: 'All', count: posts.length },
    { id: 'draft', label: 'Drafts', count: getCount('draft') },
    { id: 'ready', label: 'Ready', count: getCount('ready') },
    { id: 'published', label: 'Published', count: getCount('published') },
    { id: 'failed', label: 'Failed', count: getCount('failed') },
    { id: 'archived', label: 'Archived', count: getCount('archived') },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: ['column', 'row'],
        alignItems: ['stretch', 'center'],
        justifyContent: 'space-between',
        gap: 3,
        mb: 3,
        borderBottom: '1px solid',
        borderColor: 'border.default',
        pb: 2,
      }}
    >
      <UnderlineNav aria-label="Post status filter">
        {tabs.map((tab) => (
          <UnderlineNav.Item
            key={tab.id}
            aria-current={currentStatus === tab.id ? 'page' : undefined}
            onSelect={() => onSelectStatus(tab.id)}
            counter={tab.count}
          >
            {tab.label}
          </UnderlineNav.Item>
        ))}
      </UnderlineNav>

      <Box sx={{ width: ['100%', '240px'] }}>
        <TextInput
          leadingVisual={SearchIcon}
          placeholder="Filter posts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          block
          size="small"
        />
      </Box>
    </Box>
  );
};
