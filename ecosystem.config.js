const path = require('path');

module.exports = {
  apps: [
    {
      name: 'hooked-backend',
      script: path.resolve(__dirname, './server/dist/index.js'),
      cwd: path.resolve(__dirname, './'),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true
    }
  ]
};
