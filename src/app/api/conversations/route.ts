import { prisma } from '@/lib/server/prisma';

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  return Response.json({ conversations });
}

export async function POST(request: Request) {
  let title = '새 채팅';

  try {
    const body = await request.json();
    if (typeof body.title === 'string' && body.title.trim()) {
      title = body.title.trim();
    }
  } catch {
    // Body is optional for this endpoint.
  }

  const conversation = await prisma.conversation.create({
    data: { title },
  });

  return Response.json({ conversation }, { status: 201 });
}
