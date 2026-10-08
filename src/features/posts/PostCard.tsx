import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Label, IconButton } from '@primer/react';
import { Box, Text, Flash } from '@/components/PrimerCompat';
import {
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  SparkleIcon,
  CopyIcon,
  AlertIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { Post } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<{ success: boolean; post: Post; error?: string }>;
  onDuplicate: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onDelete, onPublish }) => {
  const navigate = useNavigate();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Publish this post to LinkedIn now?')) return;
    setIsPublishing(true);
    try {
      await onPublish(post.id);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(post.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(post.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Box
      onClick={() => navigate(`/posts/${post.id}`)}
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: 2,
        bg: 'canvas.default',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Top Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <StatusBadge status={post.status} />

          {post.source === 'ai' ? (
            <Label
              variant="accent"
              size="small"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <SparkleIcon size={12} />
              AI Generated
            </Label>
          ) : (
            <Label
              variant="secondary"
              size="small"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <PencilIcon size={12} />
              Manual
            </Label>
          )}

          {post.linkedinPostId && (
            <Text sx={{ fontSize: 0, color: 'fg.muted', fontFamily: 'monospace' }}>
              LinkedIn ID: {post.linkedinPostId.split(':').pop() || post.linkedinPostId}
            </Text>
          )}
        </Box>

        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Updated {formattedDate}</Text>
      </Box>

      {/* Post Title & Content preview */}
      {post.title && (
        <Text sx={{ fontWeight: 'bold', fontSize: 2, color: 'fg.default' }}>{post.title}</Text>
      )}

      <Text
        sx={{
          fontSize: 1,
          color: 'fg.muted',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
      >
        {post.content.length > 250 ? `${post.content.slice(0, 250)}...` : post.content}
      </Text>

      {/* Failure Callout */}
      {post.status === 'failed' && post.errorMessage && (
        <Flash variant="danger" sx={{ py: 1, px: 2, fontSize: 0 }}>
          <span style={{ marginRight: 6 }}>
            <AlertIcon size={14} />
          </span>
          Publish error: {post.errorMessage}
        </Flash>
      )}

      {/* Card Actions Bottom Row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pt: 2,
          mt: 1,
          borderTop: '1px solid',
          borderColor: 'border.muted',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            size="small"
            leadingVisual={PencilIcon}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/posts/${post.id}`);
            }}
          >
            Edit
          </Button>

          {post.status !== 'published' && (
            <Button
              size="small"
              variant="primary"
              leadingVisual={PaperAirplaneIcon}
              onClick={handlePublish}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }} onClick={(e) => e.stopPropagation()}>
          <IconButton
            icon={copied ? CheckIcon : CopyIcon}
            aria-label="Copy post text"
            size="small"
            variant="invisible"
            onClick={handleCopyContent}
          />
          <IconButton
            icon={TrashIcon}
            aria-label="Delete post"
            size="small"
            variant="invisible"
            disabled={isDeleting}
            onClick={handleDelete}
          />
        </Box>
      </Box>
    </Box>
  );
};
