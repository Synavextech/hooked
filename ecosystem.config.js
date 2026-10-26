module.exports = {
  apps: [
    {
      name: "hooked-server",
      script: "./dist/server/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
