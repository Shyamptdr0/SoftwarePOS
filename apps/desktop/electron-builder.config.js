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
        target: "nsis", 
        arch: ["x64"]
      }
    ],
    forceCodeSigning: false
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  publish: {
    provider: "github",
    owner: "Shyamptdr0",
    repo: "SoftwarePOS"
  },
  compression: "maximum",
  removePackageScripts: true
};
