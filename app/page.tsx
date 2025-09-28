// import Image from "next/image";
// import Test from "./Test";
// import ModelDragDrop from "./Drop";
// import Building3DExtruder from "./NextStep";

// export default function Home() {
//   return (
//     <div className="">
//       {/* <Test /> */}
//       {/* <ModelDragDrop /> */}
//       {/* <Building3DExtruder /> */}
//     </div>
//   );
// }

// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/maptothreed");
}
