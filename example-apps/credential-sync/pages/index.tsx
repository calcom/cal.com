import { useState } from "react";

export default function Index() {
  const [data, setData] = useState("");
  async function updateToken() {
    const res = await fetch("/api/setTokenInCalCom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    setData(JSON.stringify(await res.json()));
  }
  return (
    <div>
      <button onClick={updateToken}>Update Token in Cal.com</button>
      <div>{data}</div>
    </div>
  );
}
