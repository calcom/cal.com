import { useEffect } from "react";

import { FullScreenDialog } from "./FullScreenDialog";

const SpaceBookingSuccessPage = (props: { what: string; where: string; when: string; open: boolean }) => {
  const { what, where, when, open } = props;

  useEffect(() => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const c = canvas.getContext("2d") as CanvasRenderingContext2D;

    let w: number;
    let h: number;

    const setCanvasExtents = () => {
      w = document.body.clientWidth;
      h = document.body.clientHeight;
      canvas.width = Math.min(1600, w);
      canvas.height = Math.min(900, h);
    };

    setCanvasExtents();

    const crawl = document.getElementById("crawl") as HTMLDivElement;
    const crawlContent = document.getElementById("crawl-content") as HTMLDivElement;
    const crawlContentStyle = crawlContent.style;

    // start crawl at bottom of 3d plane
    let crawlPos = crawl.clientHeight;

    const makeStars = (count: number) => {
      const out = [];
      for (let i = 0; i < count; i++) {
        const s = {
          x: Math.random() * 1600 - 800,
          y: Math.random() * 900 - 450,
          z: Math.random() * 1000,
        };
        out.push(s);
      }
      return out;
    };

    let stars = makeStars(2000);

    window.onresize = () => {
      setCanvasExtents();
    };

    const clear = () => {
      c.fillStyle = "black";
      c.fillRect(0, 0, canvas.width, canvas.height);
    };

    const putPixel = (x: number, y: number, brightness: number) => {
      const intensity = brightness * 255;
      const rgb = "rgb(" + intensity + "," + intensity + "," + intensity + ")";
      c.fillStyle = rgb;
      c.fillRect(x, y, 1, 1);
    };

    const moveStars = (distance: number) => {
      const count = stars.length;
      for (var i = 0; i < count; i++) {
        const s = stars[i];
        s.z -= distance;
        if (s.z <= 1) {
          s.z += 999;
        }
      }
    };

    const moveCrawl = (distance: number) => {
      crawlPos -= distance;
      crawlContentStyle.top = crawlPos + "px";

      // if we've scrolled all content past the top edge
      // of the plane, reposition content at bottom of plane
      if (crawlPos < -crawlContent.clientHeight) {
        crawlPos = crawl.clientHeight;
      }
    };

    const paintStars = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      const count = stars.length;
      for (var i = 0; i < count; i++) {
        const star = stars[i];

        const x = cx + star.x / (star.z * 0.001);
        const y = cy + star.y / (star.z * 0.001);

        if (x < 0 || x >= w || y < 0 || y >= h) {
          continue;
        }

        const d = star.z / 1000.0;
        const b = 1 - d * d;

        putPixel(x, y, b);
      }
    };

    let prevTime: number;
    const init = (time: number) => {
      prevTime = time;
      requestAnimationFrame(tick);
    };

    const tick = (time: number) => {
      let elapsed = time - prevTime;
      prevTime = time;

      moveStars(elapsed * 0.02);

      // time-scale of crawl, increase factor to go faster
      moveCrawl(elapsed * 0.06);

      clear();
      paintStars();

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(init);
  }, []);

  const episodeDetails = [
    { number: "IV", name: "A new hope" },
    { number: "V", name: "The Empire" },
    { number: "VI", name: "Return of the Jedi" },
    { number: "I", name: "The Phantom menace" },
    { number: "II", name: "Attack of the Clones" },
    { number: "III", name: "Revenge of the Sith" },
  ];
  const randomEpisodeNumber = episodeDetails[Math.floor(Math.random() * episodeDetails.length)];

  const css = `
  #crawl-container {
    perspective: calc(100vh * 0.4);
  }
  #crawl {
    color: #f5c91c;
    position: absolute;
    width: 110%;
    left: -5%;
    bottom: -5%;
    height: 200%;
    overflow: hidden;

    transform: rotate3d(1, 0, 0, 45deg);
    transform-origin: 50% 100%;

    mask-image: linear-gradient(
      rgba(0, 0, 0, 0),
      rgba(0, 0, 0, 0.66),
      rgba(0, 0, 0, 1)
    );

    -webkit-mask-image: -webkit-linear-gradient(
      rgba(0, 0, 0, 0),
      rgba(0, 0, 0, 0.66),
      rgba(0, 0, 0, 1)
    );
  }

  #crawl-content {
    font-family: "Roboto";
    font-size: calc(100vw * 0.074);
    letter-spacing: 0.09em;
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
  }

  #crawl p {
    text-align: justify;
    width: 100%;
    margin: 0 0 1.25em 0;
    line-height: 1.25em;
  }

  #crawl h1 {
    font-size: 1em;
    margin: 0 0 0.3em 0;
  }

  #crawl h2 {
    font-size: 1.5em;
    margin: 0 0 0.7em 0;
  }

  #crawl h1,
  #crawl h2 {
    text-align: center;
  }
`;

  return (
    <>
      <FullScreenDialog open={open}>
        <canvas id="canvas" className="absolute m-0 h-full w-full overflow-hidden p-0"></canvas>
        <div
          id="crawl-container"
          className="perspective-[calc(100vh * 0.4)] absolute m-0 h-full w-full overflow-hidden p-0">
          <div
            id="crawl"
            className="color-[#f5c91c] transform=[rotate3d(1, 0, 0, 45deg)] transform-origin-[50% 100%] absolute -left-[5%] -bottom-[5%] h-[200%] w-[110%] overflow-hidden">
            <div id="crawl-content">
              <h1>Episode {randomEpisodeNumber.number}</h1>
              <h2>{randomEpisodeNumber.name}</h2>
              <p>{what}</p>
              <p>
                {when}
                <br />
              </p>
              <p>{where}</p>
            </div>
          </div>
        </div>
        <style>{css}</style>
      </FullScreenDialog>
    </>
  );
};

export default SpaceBookingSuccessPage;
