import { prisma } from '../config/database';

export interface ChatbotRuleDto {
  id:           string;
  title:        string;
  keywords:     string[];
  response:     string;
  quickReplies: string[];
  sortOrder:    number;
  isActive:     boolean;
}

export async function listRules(): Promise<ChatbotRuleDto[]> {
  return prisma.chatbotRule.findMany({ orderBy: { sortOrder: 'asc' } });
}

export async function listActiveRules(): Promise<ChatbotRuleDto[]> {
  return prisma.chatbotRule.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createRule(data: Omit<ChatbotRuleDto, 'id'>): Promise<ChatbotRuleDto> {
  return prisma.chatbotRule.create({ data });
}

export async function updateRule(id: string, data: Partial<Omit<ChatbotRuleDto, 'id'>>): Promise<ChatbotRuleDto> {
  return prisma.chatbotRule.update({ where: { id }, data });
}

export async function deleteRule(id: string): Promise<void> {
  await prisma.chatbotRule.delete({ where: { id } });
}

export async function reorderRules(ids: string[]): Promise<void> {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.chatbotRule.update({ where: { id }, data: { sortOrder: index } }),
    ),
  );
}
