const glob = require("glob");

/** Needed to rewrite public booking page, gets all static pages but [user] */
const pages = glob
  .sync("pages/**/[^_]*.{tsx,js,ts}", { cwd: __dirname })
  .map((filename) =>
    filename
      .substr(6)
      .replace(/(\.tsx|\.js|\.ts)/, "")
      .replace(/\/.*/, "")
  )
  .filter((v, i, self) => self.indexOf(v) === i && !v.startsWith("[user]"));

exports.pages = pages;
