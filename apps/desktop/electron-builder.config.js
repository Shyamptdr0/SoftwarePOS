module.exports = {
  appId: "com.shreem.pos",
  productName: "Shreem POS",
  directories: {
    output: "dist"
  },
  files: [
    "main.js",
    "preload.js", 
    "node_modules/**/*",
    "../web/out/**/*"
  ],
  win: {
    target: [
      {
        target: "dir", 
        arch: ["x64"]
      }
    ],
    forceCodeSigning: false
  },
  compression: "maximum",
  removePackageScripts: true
};
