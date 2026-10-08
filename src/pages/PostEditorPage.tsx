import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, TextInput, Textarea, Select, FormControl, Spinner } from '@primer/react';
import { Box, Heading, Text, Flash } from '@/components/PrimerCompat';
import {
  PaperAirplaneIcon,
  CheckIcon,
  AlertIcon,
  ArrowLeftIcon,
  DeviceCameraVideoIcon,
} from '@primer/octicons-react';
import { api } from '@/services/api';
import { Post, PostStatus } from '@/types';
import { LinkedInPreview } from '@/components/LinkedInPreview';
import { AIAssistantDrawer } from '@/features/editor/AIAssistantDrawer';
import { useLinkedIn } from '@/hooks/useLinkedIn';

export const PostEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const { account, isConnected } = useLinkedIn();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<PostStatus>('draft');
  const [currentPost, setCurrentPost] = useState<Post | null>(null);

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'danger';
    message: string;
  } | null>(null);

  const fetchPost = useCallback(async () => {
    if (isNew) return;
    setIsLoading(true);
    try {
      const data = await api.posts.get(id!);
      setCurrentPost(data);
      setTitle(data.title || '');
      setContent(data.content);
      setStatus(data.status);
    } catch (err: unknown) {
      const e = err as Error;
      setNotification({ type: 'danger', message: `Failed to load post: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleSave = async (): Promise<Post | null> => {
    if (!content.trim()) {
      setNotification({ type: 'danger', message: 'Post content cannot be empty.' });
      return null;
    }

    setIsSaving(true);
    setNotification(null);
    try {
      if (isNew) {
        const created = await api.posts.create({
          title: title.trim() || undefined,
          content: content.trim(),
          status,
          source: 'manual',
        });
        setCurrentPost(created);
        setNotification({ type: 'success', message: 'Draft saved successfully!' });
        navigate(`/posts/${created.id}`, { replace: true });
        return created;
      } else {
        const updated = await api.posts.update(id!, {
          title: title.trim() || undefined,
          content: content.trim(),
          status,
        });
        setCurrentPost(updated);
        setNotification({ type: 'success', message: 'Post updated successfully!' });
        return updated;
      }
    } catch (err: unknown) {
      const e = err as Error;
      setNotification({ type: 'danger', message: `Failed to save: ${e.message}` });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      setNotification({ type: 'danger', message: 'Cannot publish an empty post.' });
      return;
    }

    if (!isConnected) {
      setNotification({
        type: 'danger',
        message: 'No connected LinkedIn account. Please connect your account in Settings first.',
      });
      return;
    }

    if (!confirm('Are you ready to publish this post to LinkedIn now?')) return;

    setIsPublishing(true);
    setNotification(null);

    try {
      // Ensure latest changes are saved first
      let targetId = id;
      if (isNew || !currentPost) {
        const saved = await handleSave();
        if (!saved) return;
        targetId = saved.id;
      } else {
        await api.posts.update(id!, {
          title: title.trim() || undefined,
          content: content.trim(),
        });
      }

      const res = await api.posts.publish(targetId!);

      if (res.success) {
        setStatus('published');
        setCurrentPost(res.post);
        setNotification({
          type: 'success',
          message: `Post successfully published to LinkedIn! (ID: ${res.linkedinPostId})`,
        });
      } else {
        setStatus('failed');
        setNotification({
          type: 'danger',
          message: `Publish failed: ${res.error || 'LinkedIn API returned an error.'}`,
        });
      }
    } catch (err: unknown) {
      const e = err as Error;
      setNotification({
        type: 'danger',
        message: `Publishing error: ${e.message}`,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Spinner />
        <Text sx={{ display: 'block', mt: 2, color: 'fg.muted' }}>Loading post editor...</Text>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '1280px', mx: 'auto', p: [3, 4] }}>
      {/* Top Header & Navigation */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button size="small" leadingVisual={ArrowLeftIcon} onClick={() => navigate('/posts')}>
            Posts
          </Button>

          <Heading as="h2" sx={{ fontSize: 3 }}>
            {isNew ? 'Create New Post' : 'Edit Post'}
          </Heading>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Select
            size="small"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
          >
            <Select.Option value="draft">Draft</Select.Option>
            <Select.Option value="ready">Ready</Select.Option>
            <Select.Option value="published">Published</Select.Option>
            <Select.Option value="archived">Archived</Select.Option>
          </Select>

          <Button onClick={handleSave} disabled={isSaving || isPublishing}>
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            variant="primary"
            leadingVisual={PaperAirplaneIcon}
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
          >
            {isPublishing ? 'Publishing...' : 'Publish to LinkedIn'}
          </Button>
        </Box>
      </Box>

      {/* Notifications */}
      {notification && (
        <Flash variant={notification.type} sx={{ mb: 3 }}>
          <span style={{ marginRight: 8 }}>
            {notification.type === 'success' ? <CheckIcon size={16} /> : <AlertIcon size={16} />}
          </span>
          {notification.message}
        </Flash>
      )}

      {/* Editor Main Grid: Left = Content & AI, Right = LinkedIn Preview */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: ['1fr', '1fr', '1fr 1fr'],
          gap: 4,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Editor & AI Assistant */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <FormControl>
            <FormControl.Label>Post Title (Internal Reference)</FormControl.Label>
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5 Lessons from Our Microservice Migration"
              block
            />
          </FormControl>

          {/* AI Assistant Drawer */}
          <AIAssistantDrawer
            currentContent={content}
            onApplyContent={(newText) => setContent(newText)}
            onAppendContent={(appendStr) => setContent((prev) => `${prev}${appendStr}`)}
          />

          <FormControl required>
            <FormControl.Label>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span>Post Content</span>
                <Text sx={{ fontSize: 0, fontWeight: 'normal', color: 'fg.muted' }}>
                  {content.length} / 3000 chars
                </Text>
              </Box>
            </FormControl.Label>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your LinkedIn post here... Use linebreaks generously for readability. AI tools above can help improve the hook and tone."
              rows={14}
              block
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
                lineHeight: 1.5,
                fontSize: '14px',
              }}
            />
          </FormControl>
        </Box>

        {/* Right Column: Live LinkedIn Preview */}
        <Box>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeviceCameraVideoIcon size={16} />
            <Text sx={{ fontWeight: 'bold', fontSize: 1 }}>LinkedIn Live Preview</Text>
          </Box>

          <LinkedInPreview content={content} account={account} />
        </Box>
      </Box>
    </Box>
  );
};
