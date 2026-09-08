import { NextRequest, NextResponse } from "next/server";
import { resolveCommand, type AssistantContext } from "@/lib/assistant";

export async function POST(req: NextRequest) {
  const { command, context } = (await req.json()) as {
    command: string;
    context: AssistantContext;
  };

  if (!command?.trim()) {
    return NextResponse.json({ error: "Empty command." }, { status: 400 });
  }

  try {
    const action = await resolveCommand(command, context);
    return NextResponse.json({ action });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { action: { type: "clarify", message: "Something went wrong resolving that -- try rephrasing." } },
      { status: 200 } // degrade to a clarify action rather than a hard error the UI has to special-case
    );
  }
}
