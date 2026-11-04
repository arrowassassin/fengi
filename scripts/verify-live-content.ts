import { draftContent, validateDraft } from "../src/server/content-draft";

// Deliberately use the real adapter and configured model; never inject a mock or save/publish drafts.
// Output only fixed status fields and counts, not credentials, provider errors or generated prose.
for (let attempt = 1; attempt <= 2; attempt++) {
  const result = await draftContent(`live-verification-${attempt}`);
  if (result.source !== "nvidia" || result.reason !== "generated") {
    console.log(
      JSON.stringify({ attempt, verified: false, source: result.source, reason: result.reason }),
    );
    process.exitCode = 1;
    break;
  }
  const validated = validateDraft({
    title: result.title,
    description: result.description,
    categoryIds: result.categories.map((category) => category.id),
  });
  console.log(
    JSON.stringify({
      attempt,
      verified: true,
      source: result.source,
      reason: result.reason,
      categories: validated.categories.length,
      published: false,
    }),
  );
}
