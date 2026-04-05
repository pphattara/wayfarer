// __tests__/lib/storage.test.ts
import { uploadMedia, getPublicUrl, mediaPathForUser } from '../../lib/storage';

jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('dGVzdA=='), // base64 "test"
  EncodingType: { Base64: 'base64' },
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      }),
    },
  },
}));

const { supabase } = require('../../lib/supabase');

describe('mediaPathForUser', () => {
  it('builds path as userId/filename', () => {
    const path = mediaPathForUser('user-123', 'photo.jpg');
    expect(path).toBe('user-123/photo.jpg');
  });

  it('strips leading slashes from filename', () => {
    const path = mediaPathForUser('user-123', '/photo.jpg');
    expect(path).toBe('user-123/photo.jpg');
  });
});

describe('uploadMedia', () => {
  it('calls supabase storage upload with correct bucket and path', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ data: { path: 'user-1/abc.jpg' }, error: null });
    supabase.storage.from.mockReturnValue({ upload: mockUpload, getPublicUrl: jest.fn() });

    await uploadMedia('user-1', 'file:///local/abc.jpg', 'image/jpeg');

    expect(supabase.storage.from).toHaveBeenCalledWith('post-media');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\//),
      expect.any(Object),
      { contentType: 'image/jpeg', upsert: false }
    );
  });

  it('throws when upload returns an error', async () => {
    const mockUpload = jest.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } });
    supabase.storage.from.mockReturnValue({ upload: mockUpload, getPublicUrl: jest.fn() });

    await expect(uploadMedia('user-1', 'file:///local/abc.jpg', 'image/jpeg')).rejects.toThrow('Upload failed');
  });
});

describe('getPublicUrl', () => {
  it('returns the public URL for a storage path', () => {
    const mockGetPublicUrl = jest.fn().mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/post-media/user-1/abc.jpg' },
    });
    supabase.storage.from.mockReturnValue({ getPublicUrl: mockGetPublicUrl, upload: jest.fn() });

    const url = getPublicUrl('user-1/abc.jpg');
    expect(url).toBe('https://example.supabase.co/storage/v1/object/public/post-media/user-1/abc.jpg');
    expect(supabase.storage.from).toHaveBeenCalledWith('post-media');
  });
});
