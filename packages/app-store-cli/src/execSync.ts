import child_process from "child_process";

const execSync = (cmd: string) => {
  if (process.env.DEBUG === "1") {
    console.log(`${process.cwd()}$: ${cmd}`);
  }
  const result = child_process.execSync(cmd).toString();
  if (process.env.DEBUG === "1") {
    console.log(result);
  }
  return cmd;
};
export default execSync;
