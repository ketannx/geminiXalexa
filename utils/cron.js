const cron = require('cron');
const http = require('http');

// Create a new cron job that runs every 14 seconds
const job = new cron.CronJob("*/14 * * * * *", () => {
    http.get(process.env.API_URL, (res) => {
        if (res.statusCode === 200) {
            console.log("GET request sent successfully");
        } else {
            console.log("GET request failed with status code:", res.statusCode);
        }
    }).on("error", (e) => {
        console.error("Error while sending request:", e);
    });
});

// Start the cron job
job.start();

module.exports = job;
