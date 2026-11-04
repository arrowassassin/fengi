export const metadata = { title: "About & privacy" };
export default function About() {
  return (
    <article className="prose">
      <p className="eyebrow">A little room for play</p>
      <h1>
        Made for a<br />
        <em>moment well spent.</em>
      </h1>
      <h2>Five small games. Your pace.</h2>
      <p>
        Fengi brings together logic, arcade, wordplay, route planning and memory. Daily editions are
        shared by date in UTC. Practice uses separate seeds. There are no accounts, ads, paid
        advantages or global leaderboards in this version.
      </p>
      <h2>Your progress, with recovery.</h2>
      <p>
        Game progress is cached in this browser and saved on this server under an anonymous profile.
        An HttpOnly session cookie gives access for up to 180 days. No email is required. Keep a
        one-time recovery code from Your progress to restore access on another browser. The server
        stores hashed credentials and up to 60 recent sessions, including your submitted game
        answers. You can export your history or delete your profile from Your progress. Clearing
        cookies alone does not delete server data. There are no analytics scripts or advertising
        trackers. Operational logs record request IDs, status and duration, without game answers or
        credentials.
      </p>
      <h2>Honest rules, explained scores.</h2>
      <p>
        Odd Answer uses a small curated catalogue and fixed editorial point tiers. They are not
        measured rarity or AI judgments. Local scores are for personal play and can be edited on a
        device; they are not competition-grade records.
      </p>
      <h2>AI helps behind the scenes.</h2>
      <p>
        Gameplay does not call a model. A separate private authoring tool can use NVIDIA through
        LangChain to draft a selection of reviewed content. It requires explicit configuration and
        human review. No production licensing is implied by a trial key.
      </p>
      <h2>Access and control.</h2>
      <p>
        Games support keyboard and touch controls, readable labels, a light/dark theme and reduced
        decorative motion. Orbit pauses when the tab is hidden and offers a slower practice pace. A
        paused session does not lose lives or time.
      </p>
    </article>
  );
}
