module.exports = {
  apps: [
    {
      name: "md-editor-backend",
      script: "app.js",
      cwd: "/Hexo-app/blog/source/md_editor", 
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      autorestart: true,
    },
    {
      name: "hexo-frontend",
      script: "hexo",
      args: "s",
      cwd: "/Hexo-app/blog",  
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      autorestart: true,
    },
  ],
};
