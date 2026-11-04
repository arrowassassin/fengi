import { Progress } from "../../components/progress";
export const metadata = { title: "Your progress" };
export default function Page() {
  return (
    <>
      <p className="eyebrow">A collection of little victories</p>
      <h1>
        Your time.
        <br />
        <em>Well spent.</em>
      </h1>
      <p className="page-lead">
        Recent rounds saved on this browser. No rankings. No pressure to keep a streak.
      </p>
      <Progress />
    </>
  );
}
