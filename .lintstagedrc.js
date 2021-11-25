module.exports = {
  "**/*.(j|t)s?(x)": (filenames) => [
    `tsc-files --noEmit ${filenames.map((file) => "." + file.split(process.cwd())[1]).join(" ")}`,
    `next lint --fix --file ${filenames.map((file) => file.split(process.cwd())[1]).join(" --file ")}`,
  ],
  "./prisma/schema.prisma": "prisma format",
};
