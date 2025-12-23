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
  extraResources: [
    {
      from: "../packages",
      to: "packages"
    }
  ],
  mac: {
    category: "public.app-category.business",
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      }
    ],
    icon: "assets/icon.icns"
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable", 
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico"
  },
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"]
      },
      {
        target: "deb",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.png",
    category: "Office"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Shreem POS",
    license: "LICENSE.txt"
  },
  publish: {
    provider: "github",
    owner: "shreem-pos",
    repo: "shreem-pos"
  },
  compression: "maximum",
  removePackageScripts: true
};
