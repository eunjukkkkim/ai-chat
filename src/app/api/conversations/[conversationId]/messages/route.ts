import { prisma } from '@/lib/server/prisma';

type RouteParams = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { conversationId } = await params;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({ messages });
}
