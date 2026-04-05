// __tests__/components/FeedPost.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedPost } from '../../components/FeedPost';
import type { Post } from '../../types/social';

const mockPost: Post = {
  id: 'p1',
  user_id: 'u1',
  trip_id: null,
  caption: 'Amazing views in Kyoto!',
  media_urls: ['https://example.com/kyoto.jpg'],
  lat: 35.0116,
  lng: 135.7681,
  destination_name: 'Kyoto',
  visibility: 'public',
  likes_count: 12,
  comments_count: 3,
  created_at: '2026-04-01T08:00:00Z',
  author: { display_name: 'Alice', avatar_url: null },
  user_has_liked: false,
};

describe('FeedPost', () => {
  it('renders caption and author name', () => {
    const { getByText } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    expect(getByText('Amazing views in Kyoto!')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
  });

  it('shows likes count', () => {
    const { getByText } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    expect(getByText('12')).toBeTruthy();
  });

  it('calls onLike when like button pressed and not already liked', () => {
    const onLike = jest.fn();
    const { getByTestId } = render(
      <FeedPost post={mockPost} onLike={onLike} onUnlike={jest.fn()} onCommentPress={jest.fn()} />
    );
    fireEvent.press(getByTestId('like-button'));
    expect(onLike).toHaveBeenCalledWith('p1');
  });

  it('calls onUnlike when like button pressed and already liked', () => {
    const onUnlike = jest.fn();
    const { getByTestId } = render(
      <FeedPost
        post={{ ...mockPost, user_has_liked: true }}
        onLike={jest.fn()}
        onUnlike={onUnlike}
        onCommentPress={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('like-button'));
    expect(onUnlike).toHaveBeenCalledWith('p1');
  });

  it('calls onCommentPress when comment button pressed', () => {
    const onCommentPress = jest.fn();
    const { getByTestId } = render(
      <FeedPost post={mockPost} onLike={jest.fn()} onUnlike={jest.fn()} onCommentPress={onCommentPress} />
    );
    fireEvent.press(getByTestId('comment-button'));
    expect(onCommentPress).toHaveBeenCalledWith('p1');
  });
});
