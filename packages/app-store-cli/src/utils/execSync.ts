import child_process from "node:child_process";

const execSync = async (cmd: string) => {
  const silent = process.env.DEBUG === "1" ? false : true;
  if (!silent) {
    console.log(`${process.cwd()}$: ${cmd}`);
  }
  const result: string = await new Promise((resolve, reject) => {
    child_process.exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        console.log(err);
      }
      if (stderr && !silent) {
        console.log(stderr);
      }
      resolve(stdout);
    });
  });

  if (!silent) {
    console.log(result.toString());
  }
  return cmd;
};
export default execSync;
