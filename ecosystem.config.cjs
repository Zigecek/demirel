module.exports = {
  apps: [
    {
      name: "demirel",
      script: "dist/index.js",
      env: {
        DEBUG_COLORS: "true",
      },
      //node_args: ["-r", "./.pnp.cjs"],
      exec_mode: "fork",
      autorestart: true,
      watch: false,
    },
  ],
};
