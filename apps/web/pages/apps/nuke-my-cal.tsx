import showToast from "@calcom/lib/notification";

import App from "@components/App";

export default function NukeMyCal() {
  return (
    <App
      name="Wipe my Cal"
      type="wipemycal_other"
      logo="/apps/nuke-my-cal.svg"
      categories={["fun", "productivity"]}
      author="/peer"
      feeType="free" // "usage-based", "monthly", "one-time" or "free"
      price={0} // 0 = free. if type="usage-based" it's the price per booking
      commission={0} // only required for "usage-based" billing. % of commission for paid bookings
      website="https://cal.com"
      email="help@cal.com"
      tos="https://cal.com/terms"
      privacy="https://cal.com/privacy"
      body={
        <>
          <style jsx>
            {`
              .pushable {
                position: relative;
                border: none;
                background: transparent;
                padding: 0;
                cursor: pointer;
                outline-offset: 4px;
                transition: filter 250ms;
              }
              .shadow {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 12px;
                background: hsl(0deg 0% 0% / 0.25);
                will-change: transform;
                transform: translateY(2px);
                transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
              }
              .edge {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 12px;
                background: linear-gradient(
                  to left,
                  hsl(340deg 100% 16%) 0%,
                  hsl(340deg 100% 32%) 8%,
                  hsl(340deg 100% 32%) 92%,
                  hsl(340deg 100% 16%) 100%
                );
              }
              .front {
                display: block;
                position: relative;
                padding: 12px 42px;
                border-radius: 12px;
                font-size: 1.25rem;
                color: white;
                background: hsl(345deg 100% 47%);
                will-change: transform;
                transform: translateY(-4px);
                transition: transform 600ms cubic-bezier(0.3, 0.7, 0.4, 1);
              }
              .pushable:hover {
                filter: brightness(110%);
              }
              .pushable:hover .front {
                transform: translateY(-6px);
                transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
              }
              .pushable:active .front {
                transform: translateY(-2px);
                transition: transform 34ms;
              }
              .pushable:hover .shadow {
                transform: translateY(4px);
                transition: transform 250ms cubic-bezier(0.3, 0.7, 0.4, 1.5);
              }
              .pushable:active .shadow {
                transform: translateY(1px);
                transition: transform 34ms;
              }
              .pushable:focus:not(:focus-visible) {
                outline: none;
              }
            `}
          </style>
          <div>
            Have an emergency? Need to reschedule all of your upcoming calendar events? Just click{" "}
            <strong>Nuke my Cal</strong> and auto-reschedule the entire day. Give it a try!
            <br />
            <br />
            Demo: <br />
            <br />
          </div>
          <button
            onClick={() => (
              new Audio("/apps/nuke-my-cal.wav").play(),
              showToast("All of your calendar events for today have been rescheduled", "success")
            )}
            className="pushable">
            <span className="shadow"></span>
            <span className="edge"></span>
            <span className="front">Nuke my Cal</span>
          </button>
        </>
      }
    />
  );
}
