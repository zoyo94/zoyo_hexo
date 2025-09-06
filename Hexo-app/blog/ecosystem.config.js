module.exports = {
  apps: [
    {
      name: "md-editor-backend",
      script: "app.js",
      cwd: "./source/md_editor",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        LOG_LEVEL: "warn"
      },
      env_development: {
        NODE_ENV: "development",
        LOG_LEVEL: "debug"
      },
      // 禁用日志文件，输出到 stdout/stderr
      combine_logs: true, // 合并 stdout 和 stderr
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true
    },
    {
      name: "hexo-frontend",
      script: "hexo",
      args: "s",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
        LOG_LEVEL: "warn"
      },
      env_development: {
        NODE_ENV: "development",
        LOG_LEVEL: "debug"
      },
      // 禁用日志文件，输出到 stdout/stderr
      combine_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true
    }
  ]
};
