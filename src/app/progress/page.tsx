import { Progress } from "../../components/progress";
export const metadata = { title: "Your progress" };
export default function Page() {
  return (
    <>
      <p className="eyebrow">A collection of little victories</p>
      <h1>Your progress.</h1>
      <p className="page-lead">
        Resume a round, revisit a result or protect your saves with a recovery code. No rankings or
        streak pressure.
      </p>
      <Progress />
    </>
  );
}
