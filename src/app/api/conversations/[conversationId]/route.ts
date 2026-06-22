import { prisma } from '@/lib/server/prisma';

type RouteParams = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { conversationId } = await params;

  try {
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    throw error;
  }
}

function isPrismaNotFoundError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  );
}
