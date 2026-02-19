import { Collection, MediaFile, User } from '@prisma/client';

/**
 * 合集类型定义
 */

// 包含媒体文件的合集
export type CollectionWithMedia = Collection & {
  mediaFiles: MediaFile[];
};

// 包含媒体文件和创建者的合集
export type CollectionWithMediaAndCreator = Collection & {
  mediaFiles: MediaFile[];
  creator: User;
};

// 包含文件数量统计的合集
export type CollectionWithCount = Collection & {
  _count: {
    mediaFiles: number;
  };
  creator: User;
};

// 合集列表项（用于列表展示）
export interface CollectionListItem {
  id: number;
  token: string;
  title: string;
  description: string | null;
  permissionLevel: number;
  creatorId: number;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    mediaFiles: number;
  };
  creator: User;
}

// 合集列表响应
export interface CollectionListResponse {
  collections: CollectionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

// 合集过滤器
export interface CollectionFilters {
  title?: string;
  creatorId?: number;
}
