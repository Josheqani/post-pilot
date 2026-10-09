import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import { PlusIcon, SparkleIcon, AlertIcon, RepoIcon } from '@primer/octicons-react';
import { usePosts } from '@/hooks/usePosts';
import { PostFilterTabs } from '@/features/posts/PostFilterTabs';
import { PostCard } from '@/features/posts/PostCard';
import { Post } from '@/types';

export const PostsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    posts,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    createPost,
    deletePost,
    publishPost,
  } = usePosts();

  const handleDuplicate = async (post: Post) => {
    try {
      const duplicated = await createPost({
        title: post.title ? `${post.title} (Copy)` : undefined,
        content: post.content,
        status: 'draft',
        source: 'manual',
      });
      navigate(`/posts/${duplicated.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      alert(`Failed to duplicate post: ${e.message}`);
    }
  };

  return (
    <Box sx={{ maxWidth: '1080px', mx: 'auto', p: [3, 4] }}>
      {/* Workspace Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <RepoIcon size={24} />
            <Heading as="h1" sx={{ fontSize: 4 }}>
              Posts Workspace
            </Heading>
          </Box>
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
            Manage, refine, preview, and publish your LinkedIn content library.
          </Text>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button leadingVisual={SparkleIcon} onClick={() => navigate('/chat')}>
            Draft with AI
          </Button>

          <Button variant="primary" leadingVisual={PlusIcon} onClick={() => navigate('/posts/new')}>
            New Post
          </Button>
        </Box>
      </Box>

      {/* Status & Search Filter */}
      <PostFilterTabs
        currentStatus={statusFilter}
        onSelectStatus={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        posts={posts}
      />

      {error && (
        <Flash variant="danger" sx={{ mb: 3 }}>
          <AlertIcon size={16} />
          {error}
        </Flash>
      )}

      {/* Posts List */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Spinner />
          <Text sx={{ display: 'block', mt: 2, color: 'fg.muted' }}>Loading posts...</Text>
        </Box>
      ) : posts.length === 0 ? (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'border.default',
            borderRadius: 2,
            bg: 'canvas.subtle',
          }}
        >
          <RepoIcon size={32} />
          <Heading as="h3" sx={{ fontSize: 2, mt: 2, mb: 1 }}>
            No posts found
          </Heading>
          <Text
            sx={{
              fontSize: 1,
              color: 'fg.muted',
              display: 'block',
              mb: 3,
              maxWidth: '420px',
              mx: 'auto',
            }}
          >
            {statusFilter !== 'all' || searchQuery
              ? 'No posts match your current filter criteria. Try clearing filters or search terms.'
              : 'Your workspace is empty. Create your first post manually or talk with the AI assistant to draft ideas.'}
          </Text>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="primary"
              leadingVisual={PlusIcon}
              onClick={() => navigate('/posts/new')}
            >
              Create Post
            </Button>
            <Button leadingVisual={SparkleIcon} onClick={() => navigate('/chat')}>
              Ask AI to Draft
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={deletePost}
              onPublish={publishPost}
              onDuplicate={handleDuplicate}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
