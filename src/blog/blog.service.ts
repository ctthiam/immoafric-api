import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    categorySlug?: string;
    country?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const skip = (page - 1) * limit;

    const where: any = { status: 'published' };
    if (query.country) where.countryTag = query.country;
    if (query.categorySlug) {
      where.category = { slug: query.categorySlug };
    }

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverUrl: true,
          readTime: true,
          viewsCount: true,
          publishedAt: true,
          tags: true,
          category: { select: { id: true, name: true, slug: true, color: true } },
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return { posts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        category: true,
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!post || post.status !== 'published') throw new NotFoundException('Article introuvable');

    await this.prisma.blogPost.update({ where: { slug }, data: { viewsCount: { increment: 1 } } });
    return post;
  }

  async findCategories() {
    return this.prisma.blogCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async create(authorId: string, dto: {
    categoryId: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    coverUrl?: string;
    tags?: string[];
    countryTag?: string;
    readTime?: number;
    metaTitle?: string;
    metaDescription?: string;
    status?: 'draft' | 'published';
  }) {
    const data: any = { ...dto, authorId, tags: dto.tags ?? [] };
    if (dto.status === 'published') data.publishedAt = new Date();
    return this.prisma.blogPost.create({ data });
  }

  async update(id: string, dto: Partial<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverUrl: string;
    tags: string[];
    countryTag: string;
    readTime: number;
    metaTitle: string;
    metaDescription: string;
    status: 'draft' | 'published' | 'archived';
    categoryId: string;
  }>) {
    const data: any = { ...dto };
    if (dto.status === 'published') {
      const existing = await this.prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
      if (!existing?.publishedAt) data.publishedAt = new Date();
    }
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.blogPost.delete({ where: { id } });
  }
}
