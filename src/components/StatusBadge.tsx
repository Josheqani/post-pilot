import React from 'react';
import { Label } from '@primer/react';
import { PostStatus } from '@/types';

interface StatusBadgeProps {
  status: PostStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'published':
      return <Label variant="success">Published</Label>;
    case 'ready':
      return <Label variant="accent">Ready</Label>;
    case 'draft':
      return <Label variant="secondary">Draft</Label>;
    case 'failed':
      return <Label variant="danger">Failed</Label>;
    case 'archived':
      return <Label variant="secondary">Archived</Label>;
    default:
      return <Label>{status}</Label>;
  }
};
