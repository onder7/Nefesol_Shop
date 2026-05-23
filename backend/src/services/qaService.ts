import { prisma } from '../config/database';
import { AppError } from '../types';

export async function getQuestions(productId: string) {
  return prisma.productQuestion.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      answers: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              role: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
}

export async function addQuestion(
  productId: string,
  body: string,
  options: { userId?: string; guestName?: string }
) {
  if (!body.trim()) throw new AppError('Soru boş olamaz', 400);
  if (!options.userId && !options.guestName) {
    throw new AppError('Misafir kullanıcılar için isim gereklidir', 400);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError('Ürün bulunamadı', 404);

  return prisma.productQuestion.create({
    data: {
      productId,
      userId: options.userId,
      guestName: options.guestName,
      body: body.trim(),
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
      answers: true,
    },
  });
}

export async function addAnswer(
  questionId: string,
  userId: string,
  body: string
) {
  if (!body.trim()) throw new AppError('Cevap boş olamaz', 400);

  const question = await prisma.productQuestion.findUnique({
    where: { id: questionId },
  });
  if (!question) throw new AppError('Soru bulunamadı', 404);

  const answer = await prisma.productAnswer.create({
    data: { questionId, userId, body: body.trim() },
    include: {
      user: {
        select: {
          id: true,
          role: true,
          profile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // Mark question as answered
  await prisma.productQuestion.update({
    where: { id: questionId },
    data: { isAnswered: true },
  });

  return answer;
}
