import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { Post, PostStatus, CreatePostInput, UpdatePostInput } from '@/types';

export function usePosts(initialStatus: PostStatus | 'all' = 'all') {
  const [posts, setPosts] = useState<Post[]>([]);
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.posts.list(statusFilter, searchQuery);
      setPosts(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = async (input: CreatePostInput): Promise<Post> => {
    const post = await api.posts.create(input);
    setPosts((prev) => [post, ...prev]);
    return post;
  };

  const updatePost = async (id: string, input: UpdatePostInput): Promise<Post> => {
    const updated = await api.posts.update(id, input);
    setPosts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const deletePost = async (id: string): Promise<void> => {
    await api.posts.delete(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const publishPost = async (id: string) => {
    const res = await api.posts.publish(id);
    setPosts((prev) => prev.map((p) => (p.id === id ? res.post : p)));
    return res;
  };

  return {
    posts,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refresh: fetchPosts,
    createPost,
    updatePost,
    deletePost,
    publishPost,
  };
}
