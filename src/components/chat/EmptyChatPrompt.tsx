import { cn } from "@/lib/cn";
import { EmptyChatIcon } from "@/components/ui/icons";

interface Props {
  fill?: boolean;
}

export function EmptyChatPrompt({ fill = true }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4 px-6 py-12",
        fill && "min-h-full",
      )}
    >
      <div className="relative mb-1 flex h-[58px] w-[58px] items-center justify-center rounded-[18px] border border-[#26362f] bg-[#13241f] text-accent shadow-[0_18px_45px_rgba(95,184,163,0.12)]">
        <div className="absolute inset-0 rounded-[18px] bg-accent/5" />
        <EmptyChatIcon className="relative" />
      </div>
      <h1 className="text-[36px] max-md:text-[28px] font-semibold text-ink-strong leading-tight">
        무엇이든 물어보세요
      </h1>
      <p className="max-w-[360px] text-[15px] leading-[1.6] text-muted">
        새 대화를 시작할 준비가 되어 있습니다.
      </p>
    </div>
  );
}
