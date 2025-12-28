module.exports = {
    apps: [
        {
            name: "ledgerx-backend",
            script: "./dist/app.js",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
            }
        }
    ]
};
