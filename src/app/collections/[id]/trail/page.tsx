import { notFound } from "next/navigation";
import { GameHost } from "../../../../components/game-host";
import { sessionFor } from "../../../../games/registry";
import { publicEdition } from "../../../../server/editorial";
export const dynamic = "force-dynamic";
export default async function Garden({ params }: { params: Promise<{ id: string }> }) {
  const e = publicEdition((await params).id);
  if (!e?.garden) notFound();
  return (
    <section>
      <p className="eyebrow">Reviewed AI-assisted route challenge</p>
      <h1>{e.title}</h1>
      <p>{e.description}</p>
      <GameHost
        garden={e.garden}
        session={sessionFor(
          "trail",
          new URLSearchParams({ mode: "practice", version: "2", seed: e.id }),
        )}
      />
    </section>
  );
}
