module.exports = {
  apps: [
    {
      name: 'hooked-backend',
      script: './server/dist/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true
    }
  ]
};
