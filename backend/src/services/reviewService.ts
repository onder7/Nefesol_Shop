import { prisma } from '../config/database';
import { AppError } from '../types';

export async function getReviews(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, isApproved: true },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const total = reviews.length;
  const avgRating =
    total > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return { reviews, total, avgRating, distribution };
}

export async function addReview(
  productId: string,
  userId: string,
  data: { rating: number; title?: string; body?: string }
) {
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('Puan 1-5 arasında olmalıdır', 400);
  }

  // Aynı kullanıcı aynı ürüne ikinci kez yorum yapamaz
  const existing = await prisma.review.findUnique({
    where: { productId_userId: { productId, userId } },
  });
  if (existing) {
    throw new AppError('Bu ürün için zaten bir değerlendirme yapmışsınız', 409);
  }

  return prisma.review.create({
    data: {
      productId,
      userId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      isApproved: true, // Otomatik onay; moderasyon eklenebilir
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

export async function deleteReview(reviewId: string, userId: string, isAdmin: boolean) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError('Değerlendirme bulunamadı', 404);
  if (!isAdmin && review.userId !== userId) throw new AppError('Yetkisiz işlem', 403);
  await prisma.review.delete({ where: { id: reviewId } });
}
