import type { Metadata } from "next";
import { Practice } from "../../components/practice";
export const metadata: Metadata = { title: "Practice" };
export default function Page() {
  return (
    <>
      <p className="eyebrow">Play at your own pace</p>
      <h1>
        A little more
        <br />
        <em>room to think.</em>
      </h1>
      <p className="page-lead">Fresh seeds. Familiar rules. A round just for you.</p>
      <Practice />
    </>
  );
}
