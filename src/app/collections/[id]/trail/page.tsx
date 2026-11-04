import { notFound } from "next/navigation";
import { ReviewedGarden } from "../../../../components/reviewed-garden";
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
      <ReviewedGarden garden={e.garden} />
    </section>
  );
}
